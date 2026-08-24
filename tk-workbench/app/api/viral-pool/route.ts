const WIKI_TOKEN = "ViR1wTvWgiBt0WkYrUqcTCd2n3c";
const TABLE_ID = "tblOj1mGcYJ3EWxn";
const VIEW_ID = "vewGuXlwmd";

type FeishuField = unknown;
type FeishuRecord = { record_id?: string; fields?: Record<string, FeishuField> };

function plain(value: FeishuField): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(plain).filter(Boolean).join(" ");
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    return plain(item.text ?? item.name ?? item.link ?? item.url ?? item.value ?? "");
  }
  return "";
}

function field(fields: Record<string, FeishuField>, names: string[]) {
  for (const name of names) if (fields[name] != null) return fields[name];
  const key = Object.keys(fields).find(item => names.some(name => item.toLowerCase().includes(name.toLowerCase())));
  return key ? fields[key] : undefined;
}

function numberField(fields: Record<string, FeishuField>, names: string[], nullable = false) {
  const raw = plain(field(fields, names)).replace(/,/g, "").trim();
  if (!raw) return nullable ? null : 0;
  const multiplier = /万/.test(raw) ? 10000 : /[wW]/.test(raw) ? 10000 : /[kK]/.test(raw) ? 1000 : 1;
  const parsed = Number.parseFloat(raw.replace(/[万wWkK]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * multiplier) : nullable ? null : 0;
}

function videoId(link: string, fallback: string) {
  return link.match(/video\/(\d+)/)?.[1] || link.match(/vid=(\d+)/)?.[1] || fallback;
}

function normalize(record: FeishuRecord) {
  const fields = record.fields || {};
  const link = plain(field(fields, ["视频链接", "原视频链接", "链接", "视频地址"]));
  const id = videoId(link, record.record_id || crypto.randomUUID());
  const platformValue = plain(field(fields, ["平台", "视频平台"]));
  const platform = platformValue || (/tiktok/i.test(link) ? "TikTok" : "抖音");
  const embedUrl = /tiktok/i.test(platform)
    ? `https://www.tiktok.com/player/v1/${id}?autoplay=0&controls=1&description=0&music_info=0`
    : `https://open.douyin.com/player/video?vid=${id}&autoplay=0`;
  const hookType = plain(field(fields, ["钩子类型", "主钩子类型"])) || "待识别";
  const sourceHook = plain(field(fields, ["前3秒钩子", "主钩子", "营销钩子"])) || "待补齐";
  return {
    id: `VV-${id}`,
    platform,
    author: plain(field(fields, ["作者", "账号", "达人", "发布账号"])) || "未填写作者",
    title: plain(field(fields, ["视频标题", "标题", "内容", "选题"])) || "未命名视频",
    likes: numberField(fields, ["点赞数", "点赞"]),
    views: numberField(fields, ["播放量", "播放数", "播放"], true),
    comments: numberField(fields, ["评论数", "评论"]),
    favorites: numberField(fields, ["收藏数", "收藏"]),
    shares: numberField(fields, ["转发数", "分享数", "转发", "分享"]),
    status: "已同步", analysis: "等待 V1", score: null, hook: sourceHook, hookType, link, embedUrl,
    category: plain(field(fields, ["类目", "内容类目", "分类"])) || "待分类",
    sourceGroup: plain(field(fields, ["来源群聊", "来源记录"])) || "飞书人工发现",
    sourceStatus: plain(field(fields, ["状态"])) || "已映射",
    sourceHook,
  };
}

export async function GET() {
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    return Response.json({ configured: false, records: [], error: "飞书链接已识别，但尚未配置 FEISHU_APP_ID 和 FEISHU_APP_SECRET" }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const authResponse = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    const auth = await authResponse.json() as { code?: number; msg?: string; tenant_access_token?: string };
    if (!authResponse.ok || auth.code !== 0 || !auth.tenant_access_token) throw new Error(auth.msg || "飞书应用认证失败");
    const headers = { Authorization: `Bearer ${auth.tenant_access_token}` };
    const nodeResponse = await fetch(`https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token=${WIKI_TOKEN}`, { headers });
    const node = await nodeResponse.json() as { code?: number; msg?: string; data?: { node?: { obj_token?: string } } };
    const appToken = process.env.FEISHU_BITABLE_APP_TOKEN || node.data?.node?.obj_token;
    if (!nodeResponse.ok || node.code !== 0 || !appToken) throw new Error(node.msg || "无法解析飞书多维表格节点");
    const records: FeishuRecord[] = [];
    let pageToken = "";
    do {
      const url = new URL(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${TABLE_ID}/records`);
      url.searchParams.set("view_id", VIEW_ID);
      url.searchParams.set("page_size", "500");
      if (pageToken) url.searchParams.set("page_token", pageToken);
      const response = await fetch(url, { headers, cache: "no-store" });
      const payload = await response.json() as { code?: number; msg?: string; data?: { items?: FeishuRecord[]; has_more?: boolean; page_token?: string } };
      if (!response.ok || payload.code !== 0) throw new Error(payload.msg || "飞书记录读取失败");
      records.push(...(payload.data?.items || []));
      pageToken = payload.data?.has_more ? payload.data.page_token || "" : "";
    } while (pageToken);
    const unique = Array.from(new Map(records.map(item => normalize(item)).filter(item => item.link).map(item => [item.id, item])).values());
    return Response.json({ configured: true, records: unique, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch (error) {
    return Response.json({ configured: true, records: [], error: error instanceof Error ? error.message : "飞书同步失败" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
