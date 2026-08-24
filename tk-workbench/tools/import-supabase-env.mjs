import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("缺少交接文档路径");

const source = readFileSync(resolve(sourcePath), "utf8");
const url = source.match(/^SUPABASE_URL\s*=\s*([^\s`"']+)/m)?.[1]?.trim();
const secret = source.match(/^SUPABASE_SECRET_KEY\s*=\s*([^\s`"']+)/m)?.[1]?.trim();

if (!url?.startsWith("https://") || !secret || secret.includes("Supabase") || secret.length < 30) {
  throw new Error("文档中未找到有效的 Supabase URL 或 Secret Key");
}

writeFileSync(resolve(".env.local"), `SUPABASE_URL=${url}\nSUPABASE_SECRET_KEY=${secret}\n`, { encoding: "utf8", mode: 0o600 });
process.stdout.write("Supabase 环境变量已安全写入本机。\n");
