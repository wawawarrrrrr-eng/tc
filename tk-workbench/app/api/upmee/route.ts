import { env } from "cloudflare:workers";
import { ensureVideoReviewSchema } from "../../../db";

export const dynamic = "force-dynamic";

const BASE_URL = "https://www.upmee.cc";

function config() {
  const apiKey = process.env.UPMEE_API_KEY?.trim();
  const teamId = Number(process.env.UPMEE_TEAM_ID);
  return { apiKey, teamId, configured: Boolean(apiKey && Number.isFinite(teamId) && teamId > 0) };
}

function messageOf(value: unknown, fallback = "飞星服务暂时不可用") {
  if (!value || typeof value !== "object") return fallback;
  const item = value as Record<string, unknown>;
  return String(item.message || item.msg || item.detail || item.error || fallback).slice(0, 240);
}

function dataOf(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const item = value as Record<string, unknown>;
  return item.data ?? item.result ?? value;
}

async function readPayload(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text) as unknown; } catch { return { message: text }; }
}

async function upmeeJson(path: string, apiKey: string, body: unknown) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await readPayload(response);
  const apiCode = payload && typeof payload === "object" ? Number((payload as Record<string, unknown>).code ?? 0) : 0;
  if (!response.ok || apiCode !== 0) throw new Error(messageOf(payload));
  return dataOf(payload);
}

function listOf(data: unknown) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const item = data as Record<string, unknown>;
  return (Array.isArray(item.list) ? item.list : Array.isArray(item.records) ? item.records : Array.isArray(item.items) ? item.items : []) as Record<string, unknown>[];
}

export async function GET(request: Request) {
  const { apiKey, teamId, configured } = config();
  const headers = { "Cache-Control": "private, no-store" };
  if (!configured || !apiKey) return Response.json({ configured: false }, { headers });
  try {
    const resource = new URL(request.url).searchParams.get("resource") || "status";
    if (resource === "accounts") {
      const data = await upmeeJson("/open_api/media/list", apiKey, { team_id: teamId, page: 1, page_size: 50, valid: true });
      const accounts = listOf(data).map(account => ({
        mediaId: Number(account.media_id),
        mediaType: String(account.media_type || ""),
        businessType: String(account.business_type || ""),
        name: String(account.name || ""),
        username: String(account.username || ""),
        avatar: String(account.avatar || ""),
        country: String(account.country || ""),
        valid: Boolean(account.valid),
        fans: Number(account.fans || 0),
        createdAt: String(account.create_time || ""),
      })).filter(account => Number.isFinite(account.mediaId) && account.mediaId > 0);
      return Response.json({ configured: true, accounts }, { headers });
    }
    if (resource === "tasks") {
      const data = await upmeeJson("/open_api/media/task/list", apiKey, { team_id: teamId, page: 1, page_size: 50, pub_video_filter: "team", pub_time_filter: -1 });
      let tasks = listOf(data).map(task => ({
        taskId: String(task.task_id || ""), state: String(task.state || "pending"), taskType: String(task.task_type || ""),
        title: String(task.title || ""), video: String(task.video || ""), cover: String(task.cover || ""),
        publishTime: String(task.pub_time || ""), createdAt: String(task.create_time || ""),
        accounts: (Array.isArray(task.medias) ? task.medias : []).map(media => {
          const row = media as Record<string, unknown>;
          return { subTaskId: String(row.sub_task_id || ""), mediaId: Number(row.media_id), mediaType: String(row.media_type || ""), name: String(row.name || ""), state: String(row.state || "pending"), reason: String(row.reason || ""), error: String(row.error_msg || ""), itemId: String(row.item_id || ""), retryable: Boolean(row.pub_retryable) };
        }),
      })).filter(task => task.taskId);
      const projectId=new URL(request.url).searchParams.get("projectId")?.trim();
      if(projectId){await ensureVideoReviewSchema();const links=await env.DB.prepare("SELECT task_id FROM publish_project_links WHERE project_id = ?").bind(projectId).all<{task_id:string}>();const allowed=new Set((links.results||[]).map(row=>row.task_id));tasks=tasks.filter(task=>allowed.has(task.taskId));}
      return Response.json({ configured: true, tasks }, { headers });
    }
    return Response.json({ configured: true }, { headers });
  } catch (error) {
    return Response.json({ configured: true, error: error instanceof Error ? error.message : "飞星服务暂时不可用" }, { status: 502, headers });
  }
}

export async function POST(request: Request) {
  const { apiKey, teamId, configured } = config();
  if (!configured || !apiKey) return Response.json({ error: "飞星发布服务尚未配置" }, { status: 503 });
  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const input = await request.formData();
      const action = String(input.get("action") || "");
      const file = input.get("file");
      if (!(file instanceof Blob) || !file.size) return Response.json({ error: "缺少上传文件" }, { status: 400 });
      if (action === "upload-part") {
        if (file.size > 20 * 1024 * 1024) return Response.json({ error: "单个视频分片不能超过 20MB" }, { status: 400 });
        const form = new FormData();
        form.set("upload_token", String(input.get("uploadToken") || ""));
        form.set("part_number", String(input.get("partNumber") || ""));
        form.set("file", file, file instanceof File ? file.name : "video.part");
        const response = await fetch(`${BASE_URL}/open_api/tool/s3/upload/v2/multipart`, { method: "POST", headers: { "API-Key": apiKey }, body: form });
        const payload = await readPayload(response);
        const apiCode = payload && typeof payload === "object" ? Number((payload as Record<string, unknown>).code ?? 0) : 0;
        if (!response.ok || apiCode !== 0) throw new Error(messageOf(payload, "视频分片上传失败"));
        return Response.json({ ok: true, partNumber: Number(input.get("partNumber")) });
      }
      if (action === "upload-cover") {
        if (file.size > 5 * 1024 * 1024) return Response.json({ error: "封面图片不能超过 5MB" }, { status: 400 });
        const form = new FormData(); form.set("type", "cover"); form.set("file", file, file instanceof File ? file.name : "cover.jpg");
        const response = await fetch(`${BASE_URL}/open_api/tool/s3/upload/v2/single`, { method: "POST", headers: { "API-Key": apiKey }, body: form });
        const payload = await readPayload(response);
        const apiCode = payload && typeof payload === "object" ? Number((payload as Record<string, unknown>).code ?? 0) : 0;
        if (!response.ok || apiCode !== 0) throw new Error(messageOf(payload, "封面上传失败"));
        const data = dataOf(payload) as Record<string, unknown>;
        return Response.json({ objectId: String(data.object_id || data.id || "") });
      }
      return Response.json({ error: "不支持的上传操作" }, { status: 400 });
    }

    const input = await request.json() as Record<string, unknown>;
    const action = String(input.action || "");
    if (action === "init-upload") {
      const totalParts = Number(input.totalParts);
      if (!Number.isInteger(totalParts) || totalParts < 1 || totalParts > 10000) return Response.json({ error: "视频分片数量无效" }, { status: 400 });
      const data = await upmeeJson("/open_api/tool/s3/upload/v2/multipart/init", apiKey, { total_parts: totalParts }) as Record<string, unknown>;
      return Response.json({ uploadToken: String(data.upload_token || "") });
    }
    if (action === "complete-upload") {
      const uploadToken = String(input.uploadToken || "");
      if (!uploadToken) return Response.json({ error: "缺少上传凭证" }, { status: 400 });
      const data = await upmeeJson("/open_api/tool/s3/upload/v2/multipart/complete", apiKey, { upload_token: uploadToken }) as Record<string, unknown>;
      return Response.json({ objectId: String(data.object_id || data.id || "") });
    }
    if (action === "publish") {
      if (input.confirmed !== true) return Response.json({ error: "请先完成二次确认" }, { status: 409 });
      const mediaIds = Array.isArray(input.mediaIds) ? input.mediaIds.map(Number).filter(id => Number.isFinite(id) && id > 0) : [];
      const videoId = String(input.videoId || "");
      const title = String(input.title || "").trim();
      const mode = String(input.mode || "now");
      if (!mediaIds.length || !videoId || !title) return Response.json({ error: "账号、视频和标题均为必填项" }, { status: 400 });
      const scheduledAt = Number(input.scheduledAt || 0);
      if (mode === "scheduled" && (!scheduledAt || scheduledAt <= Date.now())) return Response.json({ error: "定时发布时间必须晚于当前时间" }, { status: 400 });
      const coverId = String(input.coverId || "");
      const description = String(input.description || "").trim();
      const firstComment = String(input.firstComment || "").trim();
      const tiktok = {
        title, privacy_level: "PUBLIC_TO_EVERYONE",
        disable_comment: input.allowComment !== true, disable_duet: input.allowDuet !== true, disable_stitch: input.allowStitch !== true,
        is_brand_organic: input.brandOrganic === true, is_branded_content: input.brandedContent === true,
        is_ai_generated: input.aiGenerated === true, is_ads_only: mode === "draft", is_track_enabled: false,
        ...(coverId ? { cover_id: coverId } : {}),
      };
      const body = {
        team_id: teamId, media_ids: mediaIds, video_id: videoId, pub_now: mode !== "scheduled",
        ...(mode === "scheduled" ? { pub_time: scheduledAt } : {}), title,
        ...(coverId ? { cover_id: coverId } : {}),
        common_data: { desc: description, enable_first_comment: Boolean(firstComment), first_comment: firstComment, ...(coverId ? { cover_id: coverId } : {}) },
        tiktok_biz_data: tiktok,
      };
      const data = await upmeeJson("/open_api/media/task/create/v2", apiKey, body) as Record<string, unknown>;
      const taskId=String(data.task_id || data.id || "");
      let projectId=String(input.projectId||new URL(request.url).searchParams.get("projectId")||"").trim();
      if(!projectId){const latest=await env.DB.prepare("SELECT id FROM video_projects ORDER BY updated_at DESC LIMIT 1").first<{id:string}>();projectId=latest?.id||"legacy";}
      if(taskId){await ensureVideoReviewSchema();await env.DB.prepare("INSERT OR REPLACE INTO publish_project_links (task_id,project_id,created_at) VALUES (?,?,?)").bind(taskId,projectId,new Date().toISOString()).run();}
      return Response.json({ taskId,projectId });
    }
    return Response.json({ error: "不支持的操作" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "飞星服务暂时不可用" }, { status: 502 });
  }
}
