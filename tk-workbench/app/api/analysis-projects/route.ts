import { desc } from "drizzle-orm";
import { ensureAnalysisSchema, getDb } from "../../../db";
import { analysisProjects } from "../../../db/schema";

type AnalysisPayload = {
  id?:string; mode?:string; modeLabel?:string; status?:string; statusLabel?:string;
  progress?:number; detail?:string; codexThreadId?:string|null; result?:Record<string,unknown>|null;
  source?:Record<string,unknown>|null; createdAt?:string; updatedAt?:string;
};

function parseJson<T>(value:string,fallback:T){try{return JSON.parse(value) as T;}catch{return fallback;}}
function toJob(row:typeof analysisProjects.$inferSelect){return{id:row.id,mode:row.mode,modeLabel:row.modeLabel,status:row.status,statusLabel:row.statusLabel,progress:row.progress,detail:row.detail,codexThreadId:row.codexThreadId,result:parseJson(row.resultJson,{}),source:parseJson(row.sourceJson,{}),createdAt:row.createdAt,updatedAt:row.updatedAt};}

export async function GET(){try{await ensureAnalysisSchema();const rows=await getDb().select().from(analysisProjects).orderBy(desc(analysisProjects.updatedAt)).limit(50);return Response.json({projects:rows.map(toJob)},{headers:{"Cache-Control":"no-store"}});}catch(error){return Response.json({error:error instanceof Error?error.message:"拆解记录读取失败"},{status:500});}}

export async function POST(request:Request){try{await ensureAnalysisSchema();const payload=await request.json() as AnalysisPayload;if(!payload.id||!payload.result||payload.status!=="completed"||!payload.source){return Response.json({error:"只保存已完成且包含来源与结果的拆解任务"},{status:400});}const now=new Date().toISOString(),createdAt=payload.createdAt||now,sourceId=String(payload.source.id||payload.id);const values:typeof analysisProjects.$inferInsert={id:payload.id,sourceId,sourceJson:JSON.stringify(payload.source),mode:payload.mode||"copy",modeLabel:payload.modeLabel||"视频分析",status:"completed",statusLabel:payload.statusLabel||"分析完成",progress:payload.progress??100,detail:payload.detail||"",codexThreadId:payload.codexThreadId||null,resultJson:JSON.stringify(payload.result),createdAt,updatedAt:payload.updatedAt||now};const{id:ignored,...updates}=values;void ignored;await getDb().insert(analysisProjects).values(values).onConflictDoUpdate({target:analysisProjects.id,set:{...updates,updatedAt:now}});return Response.json({project:toJob({...values,updatedAt:now} as typeof analysisProjects.$inferSelect)});}catch(error){return Response.json({error:error instanceof Error?error.message:"拆解记录保存失败"},{status:500});}}
