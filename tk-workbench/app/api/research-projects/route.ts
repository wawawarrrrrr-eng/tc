import { desc } from "drizzle-orm";
import { ensureResearchSchema, getDb } from "../../../db";
import { researchProjects } from "../../../db/schema";

type ResearchPayload = {
  id?: string;
  mode?: string;
  modeLabel?: string;
  status?: string;
  statusLabel?: string;
  progress?: number;
  detail?: string;
  codexThreadId?: string | null;
  result?: Record<string, unknown> | null;
  assetCount?: number;
  country?: string | null;
  platform?: string | null;
  language?: string | null;
  productName?: string | null;
};

function toJob(row: typeof researchProjects.$inferSelect) {
  return {
    id: row.id,
    mode: "research",
    modeLabel: row.modeLabel,
    status: row.status,
    statusLabel: row.statusLabel,
    progress: row.progress,
    detail: row.detail,
    codexThreadId: row.codexThreadId,
    result: JSON.parse(row.resultJson),
    assetCount: row.assetCount,
    country: row.country,
    platform: row.platform,
    language: row.language,
    productName: row.productName,
    updatedAt: row.updatedAt,
  };
}

export async function GET() {
  try {
    await ensureResearchSchema();
    const rows = await getDb().select().from(researchProjects).orderBy(desc(researchProjects.updatedAt)).limit(20);
    return Response.json({ projects: rows.map(toJob) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "调研方案读取失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureResearchSchema();
    const payload = await request.json() as ResearchPayload;
    if (!payload.id || !payload.result || payload.status !== "completed") {
      return Response.json({ error: "只保存已完成且包含结果的调研方案" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const values: typeof researchProjects.$inferInsert = {
      id: payload.id,
      productName: payload.productName || "未命名产品",
      country: payload.country || "未指定",
      platform: payload.platform || "未指定",
      language: payload.language || "未指定",
      status: payload.status,
      statusLabel: payload.statusLabel || "调研已完成",
      progress: payload.progress ?? 100,
      detail: payload.detail || "",
      modeLabel: payload.modeLabel || "商品调研",
      codexThreadId: payload.codexThreadId || null,
      assetCount: payload.assetCount || 0,
      resultJson: JSON.stringify(payload.result),
      updatedAt: now,
    };
    const { id: ignoredId, ...updateValues } = values;
    void ignoredId;
    await getDb().insert(researchProjects).values(values).onConflictDoUpdate({
      target: researchProjects.id,
      set: { ...updateValues, updatedAt: now },
    });
    return Response.json({ project: toJob({ ...values, updatedAt: now } as typeof researchProjects.$inferSelect) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "调研方案保存失败" }, { status: 500 });
  }
}
