export const dynamic = "force-dynamic";

const DEFAULT_BASE_URL = "https://sd2.huitu.xyz";
const providerModels: Record<string, { durations: number[]; maxImages: number }> = {
  "sd-fast": { durations: [10, 15], maxImages: 9 },
  "sd25-30s": { durations: [30], maxImages: 30 },
};

function providerConfig() {
  const apiKey = process.env.AI_VIDEO_API_KEY?.trim();
  const baseUrl = (process.env.AI_VIDEO_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  return { apiKey, baseUrl };
}

function safeError(value: unknown) {
  const raw = typeof value === "string" ? value : value && typeof value === "object" && "detail" in value ? String((value as { detail?: unknown }).detail) : "视频生成服务暂时不可用";
  if (/credit|balance|\u79ef\u5206|\u4f59\u989d|\u6263\u8d39/i.test(raw)) return "当前服务不可用，请检查API账户状态";
  return raw.slice(0, 240);
}

async function providerJson(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return { detail: text }; }
}

export async function GET(request: Request) {
  const { apiKey, baseUrl } = providerConfig();
  const url = new URL(request.url);
  const taskId = url.searchParams.get("taskId")?.trim();
  if (!taskId) {
    return Response.json({ configured: Boolean(apiKey), provider: "Seedance 视频服务" }, { headers: { "Cache-Control": "no-store" } });
  }
  if (!apiKey) return Response.json({ error: "视频生成服务尚未配置" }, { status: 503 });
  if (url.searchParams.get("download") === "1") {
    const fileResponse=await fetch(`${baseUrl}/openapi/v1/videos/${encodeURIComponent(taskId)}/file`,{
      headers:{ Authorization:`Bearer ${apiKey}` },
      cache:"no-store",
    });
    if (!fileResponse.ok) return Response.json({ error:"视频文件暂不可下载" },{ status:fileResponse.status });
    return new Response(fileResponse.body,{ status:200,headers:{
      "Content-Type":fileResponse.headers.get("content-type")||"video/mp4",
      "Content-Disposition":fileResponse.headers.get("content-disposition")||`attachment; filename="${taskId}.mp4"`,
      "Cache-Control":"private, no-store",
    }});
  }
  const response = await fetch(`${baseUrl}/openapi/v1/videos/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  const payload = await providerJson(response);
  if (!response.ok) return Response.json({ error: safeError(payload), taskId }, { status: response.status });
  return Response.json({
    taskId,
    status: payload.status,
    progress: payload.progress,
    error: payload.error ? safeError(payload.error) : null,
    videoUrl: payload.videoUrl || payload.video_url || null,
    duration: payload.duration || null,
    aspectRatio: payload.aspectRatio || payload.aspect_ratio || null,
    completedAt: payload.completedAt || payload.completed_at || null,
  }, { headers: { "Cache-Control": "no-store" } });
}

type CreatePayload = {
  prompt?: string;
  model?: string;
  duration?: number;
  ratio?: string;
  imageUrls?: string[];
  clientRequestId?: string;
};

export async function POST(request: Request) {
  const { apiKey, baseUrl } = providerConfig();
  if (!apiKey) return Response.json({ error: "视频生成服务尚未配置" }, { status: 503 });
  try {
    const contentType = request.headers.get("content-type") || "";
    let payload: CreatePayload;
    let uploadedImages: Blob[] = [];
    if (contentType.includes("multipart/form-data")) {
      const incoming = await request.formData();
      payload = {
        prompt: String(incoming.get("prompt") || ""),
        model: String(incoming.get("model") || ""),
        duration: Number(incoming.get("duration")),
        ratio: String(incoming.get("ratio") || "9:16"),
        clientRequestId: String(incoming.get("client_request_id") || ""),
      };
      uploadedImages = incoming.getAll("images").filter((value): value is Blob => value instanceof Blob && value.size > 0);
    } else {
      payload = await request.json() as CreatePayload;
    }
    const model = payload.model?.trim() || "";
    const duration = Number(payload.duration);
    if (!payload.prompt?.trim()) return Response.json({ error: "缺少视频提示词" }, { status: 400 });
    if (!providerModels[model]) return Response.json({ error: "当前接口暂不支持所选模型" }, { status: 400 });
    if (!providerModels[model].durations.includes(duration)) return Response.json({ error: "所选模型不支持该生成时长" }, { status: 400 });

    const form = new FormData();
    form.set("prompt", payload.prompt.trim());
    form.set("model", model);
    form.set("duration", String(duration));
    form.set("ratio", payload.ratio || "9:16");
    form.set("client_request_id", payload.clientRequestId || crypto.randomUUID());

    const maxImages = providerModels[model].maxImages;
    const imageUrls = (payload.imageUrls || []).filter(Boolean).slice(0, maxImages);
    for (let index = 0; index < imageUrls.length; index += 1) {
      const sourceUrl = new URL(imageUrls[index], request.url);
      const imageResponse = await fetch(sourceUrl);
      if (!imageResponse.ok) return Response.json({ error: `参考图 ${index + 1} 读取失败` }, { status: 400 });
      const blob = await imageResponse.blob();
      form.append(imageUrls.length === 1 ? "image" : "images", blob, `reference-${index + 1}.${blob.type.includes("jpeg") ? "jpg" : "png"}`);
    }
    for (let index = 0; index < uploadedImages.slice(0, maxImages-imageUrls.length).length; index += 1) {
      const blob = uploadedImages[index];
      if (blob.size > 20*1024*1024) return Response.json({ error: `参考图 ${index + 1} 超过20MB` }, { status: 413 });
      form.append(uploadedImages.length === 1 && imageUrls.length === 0 ? "image" : "images", blob, `reference-upload-${index + 1}.${blob.type.includes("jpeg") ? "jpg" : "png"}`);
    }

    const response = await fetch(`${baseUrl}/openapi/v1/videos`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const result = await providerJson(response);
    if (!response.ok) return Response.json({ error: safeError(result) }, { status: response.status });
    return Response.json({
      taskId: result.id || result.task_id,
      status: result.status || "queued",
      progress: result.progress || 0,
      videoUrl: result.videoUrl || result.video_url || null,
      duration: result.duration || duration,
      aspectRatio: result.aspectRatio || result.aspect_ratio || payload.ratio || "9:16",
    }, { status: 202 });
  } catch (error) {
    return Response.json({ error: safeError(error instanceof Error ? error.message : error) }, { status: 502 });
  }
}
