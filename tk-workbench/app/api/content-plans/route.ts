import { desc, eq } from "drizzle-orm";
import { ensureContentPlanSchema, getDb } from "../../../db";
import { contentPlans, contentTasks } from "../../../db/schema";

type PlanTask = {
  id?:string; order?:number; productName?:string; platform?:string; targetAccount?:string;
  videoType?:string; scriptDirection?:string; publishTime?:string; successMetric?:string;
  nextAgent?:string; dependencies?:string[];
};
type PlanPayload = {
  id?:string; planDate?:string; targetCount?:number; status?:string; codexThreadId?:string|null;
  input?:Record<string,unknown>; result?:Record<string,unknown>&{tasks?:PlanTask[]};
};

function parse<T>(value:string,fallback:T){try{return JSON.parse(value) as T;}catch{return fallback;}}
function toPlan(row:typeof contentPlans.$inferSelect,tasks:typeof contentTasks.$inferSelect[]){return{
  id:row.id,planDate:row.planDate,targetCount:row.targetCount,status:row.status,input:parse(row.inputJson,{}),result:parse(row.resultJson,{}),
  codexThreadId:row.codexThreadId,createdAt:row.createdAt,updatedAt:row.updatedAt,
  tasks:tasks.map(task=>({id:task.id,order:task.orderIndex,productName:task.productName,platform:task.platform,targetAccount:task.targetAccount,videoType:task.videoType,scriptDirection:task.scriptDirection,publishTime:task.publishTime,successMetric:task.successMetric,nextAgent:task.nextAgent,dependencies:parse(task.dependencyJson,[]),status:task.status})),
};}

export async function GET(request:Request){
  try{
    await ensureContentPlanSchema();
    const id=new URL(request.url).searchParams.get("id")?.trim();
    const rows=id?await getDb().select().from(contentPlans).where(eq(contentPlans.id,id)).limit(1):await getDb().select().from(contentPlans).orderBy(desc(contentPlans.updatedAt)).limit(20);
    const plans=[];
    for(const row of rows){const tasks=await getDb().select().from(contentTasks).where(eq(contentTasks.planId,row.id)).orderBy(contentTasks.orderIndex);plans.push(toPlan(row,tasks));}
    return Response.json(id?{plan:plans[0]||null}:{plans},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"内容计划读取失败"},{status:500});}
}

export async function POST(request:Request){
  try{
    await ensureContentPlanSchema();
    const payload=await request.json() as PlanPayload;
    if(!payload.id||!payload.planDate||!payload.targetCount||!payload.result)return Response.json({error:"内容计划资料不完整"},{status:400});
    const tasks=Array.isArray(payload.result.tasks)?payload.result.tasks:[];
    if(!tasks.length)return Response.json({error:"总控 Agent 没有返回可执行任务"},{status:400});
    const now=new Date().toISOString(),existing=await getDb().select().from(contentPlans).where(eq(contentPlans.id,payload.id)).get();
    const planValues:typeof contentPlans.$inferInsert={id:payload.id,planDate:payload.planDate,targetCount:payload.targetCount,status:payload.status||"waiting_confirmation",inputJson:JSON.stringify(payload.input||{}),resultJson:JSON.stringify(payload.result),codexThreadId:payload.codexThreadId||null,createdAt:existing?.createdAt||now,updatedAt:now};
    const{id:ignored,createdAt:ignoredCreated,...planUpdates}=planValues;void ignored;void ignoredCreated;
    await getDb().insert(contentPlans).values(planValues).onConflictDoUpdate({target:contentPlans.id,set:planUpdates});
    await getDb().delete(contentTasks).where(eq(contentTasks.planId,payload.id));
    await getDb().insert(contentTasks).values(tasks.map((task,index)=>({id:task.id||`${payload.id}-T${String(index+1).padStart(2,"0")}`,planId:payload.id,orderIndex:task.order||index+1,productName:task.productName||"待确认产品",platform:task.platform||"TikTok",targetAccount:task.targetAccount||"待分配账号",videoType:task.videoType||"待确认类型",scriptDirection:task.scriptDirection||"等待脚本方向",publishTime:task.publishTime||"待排期",successMetric:task.successMetric||"等待指标",nextAgent:task.nextAgent||"爆款采集与素材管理 Agent",dependencyJson:JSON.stringify(task.dependencies||[]),status:"waiting_confirmation",createdAt:now,updatedAt:now})));
    const savedTasks=await getDb().select().from(contentTasks).where(eq(contentTasks.planId,payload.id)).orderBy(contentTasks.orderIndex);
    return Response.json({plan:toPlan(planValues as typeof contentPlans.$inferSelect,savedTasks)});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"内容计划保存失败"},{status:500});}
}

export async function PATCH(request:Request){
  try{
    await ensureContentPlanSchema();
    const payload=await request.json() as {id?:string;status?:string};
    if(!payload.id||!payload.status)return Response.json({error:"缺少计划 ID 或状态"},{status:400});
    const now=new Date().toISOString();
    await getDb().update(contentPlans).set({status:payload.status,updatedAt:now}).where(eq(contentPlans.id,payload.id));
    await getDb().update(contentTasks).set({status:payload.status==="confirmed"?"ready":"waiting_confirmation",updatedAt:now}).where(eq(contentTasks.planId,payload.id));
    return Response.json({ok:true,status:payload.status});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"计划状态更新失败"},{status:500});}
}
