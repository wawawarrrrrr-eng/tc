import { env } from "cloudflare:workers";
import { ensureReferenceImageSchema } from "../../../db";

type ReferenceAssetInput = {
  id?: string;
  projectId?: string;
  projectCode?: string;
  productName?: string;
  shotId?: string;
  version?: number;
  prompt?: string;
  imageUrl?: string;
  status?: string;
  createdAt?: string;
};

export async function GET(request: Request) {
  await ensureReferenceImageSchema();
  const projectId = new URL(request.url).searchParams.get("projectId")?.trim();
  if (!projectId) return Response.json({ error:"缺少项目 ID" }, { status:400 });
  const result = await env.DB.prepare(`SELECT id, project_id, project_code, product_name, shot_id, version,
    prompt, image_url, status, created_at FROM reference_image_assets
    WHERE project_id = ? ORDER BY shot_id ASC, version DESC`).bind(projectId).all();
  return Response.json({ assets:(result.results || []).map((row:any)=>({
    id:row.id, projectId:row.project_id, projectCode:row.project_code, productName:row.product_name,
    shotId:row.shot_id, version:Number(row.version), prompt:row.prompt, imageUrl:row.image_url,
    status:row.status, createdAt:row.created_at,
  })) });
}

export async function POST(request: Request) {
  await ensureReferenceImageSchema();
  const payload = await request.json() as ReferenceAssetInput | { assets?:ReferenceAssetInput[] };
  const assets = "assets" in payload ? (payload.assets || []) : [payload];
  if (!assets.length) return Response.json({ error:"没有可保存的参考图" }, { status:400 });
  const statements = assets.map((asset)=>{
    const projectId=String(asset.projectId||"").trim();
    const shotId=String(asset.shotId||"").trim();
    const version=Math.max(1,Number(asset.version||1));
    if (!projectId||!shotId||!asset.imageUrl) throw new Error("参考图缺少项目、镜头或图片地址");
    const id=String(asset.id||`${projectId}:${shotId}:v${version}`);
    return env.DB.prepare(`INSERT INTO reference_image_assets (
      id, project_id, project_code, product_name, shot_id, version, prompt, image_url, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, shot_id, version) DO UPDATE SET
      prompt=excluded.prompt, image_url=excluded.image_url, status=excluded.status`)
      .bind(id,projectId,String(asset.projectCode||projectId),String(asset.productName||"未命名产品"),shotId,version,
        String(asset.prompt||""),String(asset.imageUrl),String(asset.status||"confirmed"),String(asset.createdAt||new Date().toISOString()));
  });
  await env.DB.batch(statements);
  return Response.json({ saved:assets.length });
}
