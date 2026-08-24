import { desc, eq } from "drizzle-orm";
import { ensureVideoProjectSchema, getDb } from "../../../db";
import { videoProjects } from "../../../db/schema";

type ProjectPayload = {
  id?:string; code?:string; productName?:string; sourceId?:string; source?:Record<string,unknown>;
  analysisId?:string|null; researchId?:string|null; currentStage?:string; status?:string; workflow?:Record<string,unknown>;
};

function parse(value:string){try{return JSON.parse(value) as Record<string,unknown>;}catch{return {};}}
function toProject(row:typeof videoProjects.$inferSelect){return{id:row.id,code:row.code,productName:row.productName,sourceId:row.sourceId,source:parse(row.sourceJson),analysisId:row.analysisId,researchId:row.researchId,currentStage:row.currentStage,status:row.status,workflow:parse(row.workflowJson),createdAt:row.createdAt,updatedAt:row.updatedAt};}

export async function GET(request:Request){
  try{
    await ensureVideoProjectSchema();
    const id=new URL(request.url).searchParams.get("id")?.trim();
    if(id){const row=await getDb().select().from(videoProjects).where(eq(videoProjects.id,id)).get();return Response.json({project:row?toProject(row):null},{headers:{"Cache-Control":"no-store"}});}
    const rows=await getDb().select().from(videoProjects).orderBy(desc(videoProjects.updatedAt)).limit(30);
    return Response.json({projects:rows.map(toProject)},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"项目读取失败"},{status:500});}
}

export async function POST(request:Request){
  try{
    await ensureVideoProjectSchema();
    const payload=await request.json() as ProjectPayload;
    if(!payload.id||!payload.sourceId||!payload.source)return Response.json({error:"项目来源资料不完整"},{status:400});
    const now=new Date().toISOString();
    const existing=await getDb().select().from(videoProjects).where(eq(videoProjects.id,payload.id)).get();
    const values:typeof videoProjects.$inferInsert={
      id:payload.id,code:payload.code||existing?.code||`CP-${now.slice(0,10).replaceAll("-","")}-${payload.sourceId.slice(-6)}`,
      productName:payload.productName||existing?.productName||"待补充产品",sourceId:payload.sourceId,sourceJson:JSON.stringify(payload.source),
      analysisId:payload.analysisId===undefined?existing?.analysisId||null:payload.analysisId,researchId:payload.researchId===undefined?existing?.researchId||null:payload.researchId,
      currentStage:payload.currentStage||existing?.currentStage||"02",status:payload.status||existing?.status||"已创建",
      workflowJson:JSON.stringify({...parse(existing?.workflowJson||"{}"),...(payload.workflow||{})}),createdAt:existing?.createdAt||now,updatedAt:now,
    };
    const{id:ignored,createdAt:ignoredCreated,...updates}=values;void ignored;void ignoredCreated;
    await getDb().insert(videoProjects).values(values).onConflictDoUpdate({target:videoProjects.id,set:updates});
    return Response.json({project:toProject(values as typeof videoProjects.$inferSelect)});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"项目保存失败"},{status:500});}
}
