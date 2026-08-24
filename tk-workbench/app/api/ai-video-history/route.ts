import { desc, eq } from "drizzle-orm";
import { ensureAiVideoSchema, getDb } from "../../../db";
import { aiVideoGroups, aiVideoJobs } from "../../../db/schema";

type JobPayload = Partial<typeof aiVideoJobs.$inferInsert>;

export async function GET(request:Request) {
  try {
    await ensureAiVideoSchema();
    const projectId=new URL(request.url).searchParams.get("projectId")?.trim();
    const jobs=projectId
      ? await getDb().select().from(aiVideoJobs).where(eq(aiVideoJobs.projectId,projectId)).orderBy(desc(aiVideoJobs.createdAt)).limit(200)
      : await getDb().select().from(aiVideoJobs).orderBy(desc(aiVideoJobs.createdAt)).limit(200);
    const groups=await getDb().select().from(aiVideoGroups).orderBy(aiVideoGroups.createdAt);
    return Response.json({ jobs,groups:groups.map(group=>group.name) }, { headers:{ "Cache-Control":"no-store" } });
  } catch (error) {
    return Response.json({ error:error instanceof Error?error.message:"视频任务读取失败" },{ status:500 });
  }
}

export async function POST(request:Request) {
  try {
    await ensureAiVideoSchema();
    const payload=await request.json() as JobPayload&{kind?:string;name?:string};
    if (payload.kind==="group") {
      const name=payload.name?.trim();
      if (!name) return Response.json({ error:"分组名称不能为空" },{ status:400 });
      await getDb().insert(aiVideoGroups).values({name,createdAt:new Date().toISOString()}).onConflictDoNothing();
      return Response.json({ group:name });
    }
    if (!payload.id||!payload.projectId||!payload.segmentId||!payload.modelId||!payload.modelName||!payload.duration||!payload.ratio||!payload.referenceMode||!payload.prompt||!payload.status) {
      return Response.json({ error:"视频任务资料不完整" },{ status:400 });
    }
    const now=new Date().toISOString();
    const values:typeof aiVideoJobs.$inferInsert={
      id:payload.id,
      projectId:payload.projectId,
      segmentId:payload.segmentId,
      modelId:payload.modelId,
      modelName:payload.modelName,
      providerModel:payload.providerModel||null,
      duration:Number(payload.duration),
      ratio:payload.ratio,
      referenceMode:payload.referenceMode,
      prompt:payload.prompt,
      status:payload.status,
      progress:Number(payload.progress||0),
      error:payload.error||null,
      videoUrl:payload.videoUrl||null,
      groupName:payload.groupName||"未分组",
      createdAt:payload.createdAt||now,
      updatedAt:now,
    };
    const { id:ignoredId,createdAt:ignoredCreatedAt,...updateValues }=values;
    void ignoredId;void ignoredCreatedAt;
    await getDb().insert(aiVideoJobs).values(values).onConflictDoUpdate({ target:aiVideoJobs.id,set:{...updateValues,updatedAt:now} });
    return Response.json({ job:values });
  } catch (error) {
    return Response.json({ error:error instanceof Error?error.message:"视频任务保存失败" },{ status:500 });
  }
}

export async function DELETE(request:Request) {
  try {
    await ensureAiVideoSchema();
    const id=new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return Response.json({ error:"缺少任务 ID" },{ status:400 });
    await getDb().delete(aiVideoJobs).where(eq(aiVideoJobs.id,id));
    return Response.json({ deleted:true });
  } catch (error) {
    return Response.json({ error:error instanceof Error?error.message:"视频任务删除失败" },{ status:500 });
  }
}
