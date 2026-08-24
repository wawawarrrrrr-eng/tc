import http from "node:http";
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const workspace = resolve(process.cwd());
const jobsRoot = join(workspace, "workspaces", "video-analysis");
const bridgePort = Number(process.env.VIDEO_BRIDGE_PORT || 4318);
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://tk-seller-workbench-2026.gigi0391.chatgpt.site",
]);
const allowedVideoHosts = ["tiktok.com", "douyin.com", "iesdouyin.com"];
const jobs = new Map();
let executionQueue = Promise.resolve();

mkdirSync(jobsRoot, { recursive: true });

function now() {
  return new Date().toISOString();
}

function asciiJson(value) {
  return JSON.stringify(value, null, 2).replace(/[\u007f-\uffff]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

function isAllowedOrigin(origin) {
  return !origin || allowedOrigins.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) && origin ? origin : "http://localhost:3000",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-File-Name",
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function send(res, status, body, origin) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) });
  res.end(JSON.stringify(body));
}

async function readJson(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("请求内容过大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function publicJob(job) {
  return {
    id: job.id,
    kind: job.kind || "video_analysis",
    mode: job.mode,
    modeLabel: job.modeLabel,
    status: job.status,
    statusLabel: job.statusLabel,
    progress: job.progress,
    detail: job.detail,
    source: job.source,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    codexThreadId: job.codexThreadId || null,
    result: job.result || null,
    error: job.error || null,
    country: job.country || null,
    platform: job.platform || null,
    language: job.language || null,
    productName: job.productName || null,
    assetCount: job.assetCount || 0,
    planDate: job.planDate || null,
    targetCount: job.targetCount || 0,
    inputs: job.inputs || null,
    taskId: job.taskId || null,
    planId: job.planId || null,
    candidateCount: job.candidateCount || 0,
  };
}

function persist(job) {
  job.updatedAt = now();
  mkdirSync(job.dir, { recursive: true });
  writeFileSync(join(job.dir, "job.json"), JSON.stringify(publicJob(job), null, 2), "utf8");
}

function update(job, patch) {
  Object.assign(job, patch);
  persist(job);
}

function safeSource(source) {
  const rawLink=String(source.link||"").trim();
  let link="";
  if(rawLink){
    const parsed=new URL(rawLink);
    if (!allowedVideoHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) throw new Error("目前只允许处理抖音和 TikTok 视频链接");
    link=parsed.toString();
  }
  return {
    id: String(source.id || "unknown").slice(0, 80),
    platform: String(source.platform || "未知平台").slice(0, 30),
    author: String(source.author || "未知作者").slice(0, 120),
    title: String(source.title || "未命名视频").slice(0, 300),
    link,
    metrics: source.metrics || {},
  };
}

function commandPath(name) {
  return name;
}

function run(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const executable = command === "codex" ? process.execPath : commandPath(command);
    const commandArgs = command === "codex" ? [join(workspace, "node_modules", "@openai", "codex", "bin", "codex.js"), ...args] : args;
    const child = spawn(executable, commandArgs, {
      cwd: options.cwd || workspace,
      windowsHide: true,
      shell: false,
      env: { ...process.env, PYTHONUTF8: "1", ...options.env },
    });
    child.stdin.end();
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      options.onStdout?.(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      options.onStderr?.(text);
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else {
        const error = new Error(`${basename(command)} 执行失败（${code}）`);
        error.stdout = stdout;
        error.stderr = stderr;
        rejectPromise(error);
      }
    });
  });
}

function findVideo(job) {
  return readdirSync(job.dir)
    .map((file) => join(job.dir, file))
    .find((file) => /\.(mp4|mov|mkv|webm)$/i.test(file) && statSync(file).isFile());
}

async function downloadVideo(job) {
  update(job, { status: "downloading", statusLabel: "正在获取原视频", progress: 12, detail: "正在从公开视频链接获取视频文件。" });
  const output = join(job.dir, "source.%(ext)s");
  const baseArgs = ["-m", "yt_dlp", "--no-playlist", "--restrict-filenames", "--merge-output-format", "mp4", "-f", "bv*+ba/b", "-o", output, job.source.link];
  const attempts = [baseArgs, ["-m", "yt_dlp", "--cookies-from-browser", "chrome", ...baseArgs.slice(2)], ["-m", "yt_dlp", "--cookies-from-browser", "edge", ...baseArgs.slice(2)]];
  let lastError;
  for (const args of attempts) {
    try {
      await run("py", args);
      const video = findVideo(job);
      if (video) return video;
    } catch (error) {
      lastError = error;
    }
  }
  update(job, {
    status: "needs_upload",
    statusLabel: "需要上传原视频",
    progress: 15,
    detail: "平台阻止了自动下载。请在当前任务上传 MP4，上传后会从整理视频继续执行，不会重新建任务。",
    error: lastError?.stderr?.trim().split("\n").slice(-2).join(" ") || "原视频下载受平台限制",
  });
  return null;
}

async function preprocess(job, videoPath) {
  update(job, { status: "preprocessing", statusLabel: "正在整理视频", progress: 28, detail: "正在提取视频参数、音频和时间轴关键帧。", error: null });
  const probePath = join(job.dir, "video-metadata.json");
  const probe = await run("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", videoPath]);
  writeFileSync(probePath, probe.stdout, "utf8");
  const metadata = JSON.parse(probe.stdout);
  const duration = Number(metadata.format?.duration || 0);

  const framesDir = join(job.dir, "frames");
  mkdirSync(framesDir, { recursive: true });
  const interval = Math.max(0.65, duration > 0 ? duration / 28 : 1);
  await run("ffmpeg", ["-y", "-i", videoPath, "-vf", `fps=1/${interval.toFixed(3)},scale=720:-2`, "-q:v", "2", join(framesDir, "frame-%03d.jpg")]);

  const audioPath = join(job.dir, "audio.wav");
  try {
    await run("ffmpeg", ["-y", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audioPath]);
  } catch {
    writeFileSync(join(job.dir, "transcript.json"), JSON.stringify({ full_text: "", segments: [], note: "视频中未检测到可用音轨" }, null, 2), "utf8");
  }
  return { duration, audioPath, framesDir, probePath };
}

async function transcribe(job, audioPath) {
  const transcriptPath = join(job.dir, "transcript.json");
  if (existsSync(transcriptPath) || !existsSync(audioPath)) return transcriptPath;
  update(job, { status: "transcribing", statusLabel: "正在转写语音", progress: 45, detail: "首次运行可能需要下载本地转写模型，之后会直接复用。" });
  await run("py", [join(workspace, "tools", "transcribe_video.py"), audioPath, transcriptPath, "--model", process.env.WHISPER_MODEL || "small"]);
  return transcriptPath;
}

const copySchema = {
  type: "object",
  additionalProperties: false,
  required: ["jobType", "title", "sourceSummary", "transcript", "expressionStructure", "rewrite", "uncertainties", "reviewGate"],
  properties: {
    jobType: { type: "string", const: "copy_analysis" },
    title: { type: "string" },
    sourceSummary: { type: "string" },
    transcript: {
      type: "object", additionalProperties: false, required: ["fullText", "segments"], properties: {
        fullText: { type: "string" },
        segments: { type: "array", items: { type: "object", additionalProperties: false, required: ["timeRange", "text", "source"], properties: { timeRange: { type: "string" }, text: { type: "string" }, source: { type: "string", enum: ["语音", "画面字幕", "语音＋字幕", "不确定"] } } } },
      },
    },
    expressionStructure: { type: "array", items: { type: "object", additionalProperties: false, required: ["timeRange", "stage", "function", "content", "evidence"], properties: { timeRange: { type: "string" }, stage: { type: "string" }, function: { type: "string" }, content: { type: "string" }, evidence: { type: "string" } } } },
    rewrite: { type: "object", additionalProperties: false, required: ["strategy", "opening", "body", "cta", "fullScript"], properties: { strategy: { type: "string" }, opening: { type: "string" }, body: { type: "string" }, cta: { type: "string" }, fullScript: { type: "string" } } },
    uncertainties: { type: "array", items: { type: "string" } },
    reviewGate: { type: "string" },
  },
};

const rowArray = (required, properties) => ({ type: "array", items: { type: "object", additionalProperties: false, required, properties } });
const stringProps = (...keys) => Object.fromEntries(keys.map((key) => [key, { type: "string" }]));

const productResearchSchema = {
  type: "object", additionalProperties: false,
  required: ["jobType", "title", "scope", "productUnderstanding", "audiences", "painPoints", "marketStrategy", "platformPlaybook", "contentDirections", "localizedCopy", "risks", "actionPlan", "uncertainties", "reviewGate"],
  properties: {
    jobType: { type: "string", const: "product_research" },
    title: { type: "string" },
    scope: { type: "object", additionalProperties: false, required: ["country", "platform", "language", "researchBoundary"], properties: stringProps("country", "platform", "language", "researchBoundary") },
    productUnderstanding: rowArray(["fact", "evidence", "status"], stringProps("fact", "evidence", "status")),
    audiences: rowArray(["segment", "profile", "scenario", "motivation", "priority"], stringProps("segment", "profile", "scenario", "motivation", "priority")),
    painPoints: rowArray(["painPoint", "audience", "currentAlternative", "productResponse", "contentProof"], stringProps("painPoint", "audience", "currentAlternative", "productResponse", "contentProof")),
    marketStrategy: { type: "object", additionalProperties: false, required: ["positioning", "coreMessage", "entryAngle", "offerLogic", "conversionPath"], properties: stringProps("positioning", "coreMessage", "entryAngle", "offerLogic", "conversionPath") },
    platformPlaybook: rowArray(["stage", "objective", "action", "asset", "metric"], stringProps("stage", "objective", "action", "asset", "metric")),
    contentDirections: rowArray(["direction", "hook", "proof", "cta", "format"], stringProps("direction", "hook", "proof", "cta", "format")),
    localizedCopy: { type: "object", additionalProperties: false, required: ["language", "headlines", "sellingPoints", "hooks", "ctas"], properties: { language: { type: "string" }, headlines: { type: "array", items: { type: "string" } }, sellingPoints: { type: "array", items: { type: "string" } }, hooks: { type: "array", items: { type: "string" } }, ctas: { type: "array", items: { type: "string" } } } },
    risks: rowArray(["risk", "reason", "guardrail"], stringProps("risk", "reason", "guardrail")),
    actionPlan: rowArray(["priority", "action", "owner", "deliverable"], stringProps("priority", "action", "owner", "deliverable")),
    uncertainties: { type: "array", items: { type: "string" } },
    reviewGate: { type: "string" },
  },
};

const viralSchema = {
  type: "object", additionalProperties: false,
  required: ["jobType", "title", "basicInfo", "overallStructure", "roles", "openingEventChain", "goldenThreeSeconds", "hook", "conversionShots", "conversionCore", "shotRestoration", "replicationSkeleton", "uncertainties", "reviewGate"],
  properties: {
    jobType: { type: "string", const: "viral_v1_breakdown" }, title: { type: "string" },
    basicInfo: { type: "object", additionalProperties: false, required: ["platform", "duration", "productType", "style", "visibilityNotes"], properties: stringProps("platform", "duration", "productType", "style", "visibilityNotes") },
    overallStructure: rowArray(["section", "timeRange", "visual", "scriptFunction", "viewerPsychology", "type"], stringProps("section", "timeRange", "visual", "scriptFunction", "viewerPsychology", "type")),
    roles: rowArray(["role", "firstAppearance", "relationship", "actions", "emotion", "function", "mustPreserve"], stringProps("role", "firstAppearance", "relationship", "actions", "emotion", "function", "mustPreserve")),
    openingEventChain: rowArray(["order", "time", "event", "whoOrWhat", "productPosition", "retentionReason", "mustReplicate"], { order: { type: "integer" }, ...stringProps("time", "event", "whoOrWhat", "productPosition", "retentionReason", "mustReplicate") }),
    goldenThreeSeconds: { type: "object", additionalProperties: false, required: ["event", "viralPoint", "retentionReason", "psychology", "replicable"], properties: stringProps("event", "viralPoint", "retentionReason", "psychology", "replicable") },
    hook: { type: "object", additionalProperties: false, required: ["primaryType", "manifestation", "reason", "retentionReason"], properties: { primaryType: { type: "string", enum: ["痛点钩子", "结果钩子", "身份/人群钩子", "场景钩子", "好奇钩子", "视觉/反差钩子"] }, ...stringProps("manifestation", "reason", "retentionReason") } },
    conversionShots: rowArray(["structure", "isPrimary", "shots", "valueUnderstanding", "purchaseReason"], stringProps("structure", "isPrimary", "shots", "valueUnderstanding", "purchaseReason")),
    conversionCore: rowArray(["key", "used", "shots", "conversionReason"], stringProps("key", "used", "shots", "conversionReason")),
    shotRestoration: rowArray(["shot", "timeRange", "chapter", "visualDetails", "roleCount", "eventChain", "originalScript", "action", "camera", "audioRhythm", "transition", "purpose", "conversionFunction", "uncertainty"], { shot: { type: "integer" }, ...stringProps("timeRange", "chapter", "visualDetails", "roleCount", "eventChain", "originalScript", "action", "camera", "audioRhythm", "transition", "purpose", "conversionFunction", "uncertainty") }),
    replicationSkeleton: rowArray(["originalShot", "function", "position", "rolesAndEvents", "mustPreserve", "replaceableVariables"], stringProps("originalShot", "function", "position", "rolesAndEvents", "mustPreserve", "replaceableVariables")),
    uncertainties: { type: "array", items: { type: "string" } }, reviewGate: { type: "string" },
  },
};

const contentOrchestratorSchema = {
  type:"object",additionalProperties:false,
  required:["jobType","title","summary","capacityDecision","tasks","risks","reviewGate"],
  properties:{
    jobType:{type:"string",const:"content_orchestration"},title:{type:"string"},summary:{type:"string"},capacityDecision:{type:"string"},
    tasks:{type:"array",items:{type:"object",additionalProperties:false,required:["id","order","priority","productName","platform","targetAccount","videoType","scriptDirection","referenceRule","publishTime","successMetric","requiredInputs","dependencies","nextAgent"],properties:{
      id:{type:"string"},order:{type:"integer"},priority:{type:"string",enum:["P0","P1","P2"]},productName:{type:"string"},platform:{type:"string"},targetAccount:{type:"string"},videoType:{type:"string"},scriptDirection:{type:"string"},referenceRule:{type:"string"},publishTime:{type:"string"},successMetric:{type:"string"},requiredInputs:{type:"array",items:{type:"string"}},dependencies:{type:"array",items:{type:"string"}},nextAgent:{type:"string"},
    }}},
    risks:{type:"array",items:{type:"string"}},reviewGate:{type:"string"},
  },
};

async function executeContentOrchestration(job) {
  update(job,{status:"codex_running",statusLabel:"内容总控 Agent 正在排程",progress:58,detail:"正在把发布目标拆成可执行的内容任务。"});
  const taskPath=join(job.dir,"task.json"),schemaPath=join(job.dir,"output-schema.json"),resultPath=join(job.dir,"result.json"),promptPath=join(job.dir,"prompt.md");
  writeFileSync(taskPath,asciiJson({id:job.id,kind:job.kind,planDate:job.planDate,targetCount:job.targetCount,inputs:job.inputs,createdAt:job.createdAt}),"utf8");
  writeFileSync(schemaPath,JSON.stringify(contentOrchestratorSchema,null,2),"utf8");
  const relativeTask=taskPath.slice(workspace.length+1);
  const prompt=`你是短视频工厂的“内容总控 Agent”，只负责把经营目标转换为可执行的当日内容生产计划，不执行视频拆解、商品调研、脚本创作或媒体生成。\n\n读取 ${relativeTask}。以用户明确填写的产品、平台、账号、发布数量、内容配比和限制为事实边界，不得虚构库存、销量、预算、账号能力或产品卖点。tasks 数量必须等于 targetCount；每个任务必须明确产品、平台、目标账号、视频类型、脚本方向、参考素材规则、发布时间、成功指标、所需输入、依赖和下一个 Agent。任务顺序必须可执行，缺失资料写入 requiredInputs 或 risks，不得擅自补齐。下一步 Agent 只能从“爆款采集与素材管理 Agent”“产品知识库 Agent”“爆款拆解与策略 Agent”“脚本与分镜 Agent”中选择最先需要接手的一个。最终只输出符合 JSON Schema 的中文 JSON，reviewGate 必须明确要求用户确认后才能派发，禁止自动执行后续任务，不要修改仓库文件。`;
  writeFileSync(promptPath,prompt,"utf8");
  const args=["exec","--json","--sandbox","read-only","-C",workspace,"--output-schema",schemaPath,"-o",resultPath,"--",prompt];
  let jsonBuffer="";const logStream=createWriteStream(join(job.dir,"codex-events.jsonl"),{flags:"a"});
  await run("codex",args,{onStdout(text){logStream.write(text);jsonBuffer+=text;const lines=jsonBuffer.split(/\r?\n/);jsonBuffer=lines.pop()||"";for(const line of lines){try{const event=JSON.parse(line);if(event.type==="thread.started"&&event.thread_id)update(job,{codexThreadId:event.thread_id});}catch{}}},onStderr(text){logStream.write(JSON.stringify({type:"stderr",text})+"\n");}});
  logStream.end();
  const result=JSON.parse(readFileSync(resultPath,"utf8"));
  update(job,{status:"completed",statusLabel:"今日内容计划已生成",progress:100,detail:"计划已拆成可执行任务，等待人工确认后派发。",result,error:null});
}

async function runContentOrchestration(job){try{await executeContentOrchestration(job);}catch(error){update(job,{status:"failed",statusLabel:"内容计划生成失败",detail:"输入与任务包已保留，可以重新发起。",error:String(error.stderr||error.message||error).slice(-3000)});}}

const collectorSchema={type:"object",additionalProperties:false,required:["jobType","title","taskSummary","classifications","duplicateGroups","risks","reviewGate"],properties:{
  jobType:{type:"string",const:"viral_asset_collection"},title:{type:"string"},taskSummary:{type:"string"},
  classifications:{type:"array",items:{type:"object",additionalProperties:false,required:["sourceId","fitScore","decision","contentCategory","hookType","structureType","conversionType","recommendedAnalysisMode","language","marketFit","reason","tags","duplicateOf"],properties:{sourceId:{type:"string"},fitScore:{type:"integer",minimum:0,maximum:100},decision:{type:"string",enum:["archive","observe","reject"]},contentCategory:{type:"string"},hookType:{type:"string"},structureType:{type:"string"},conversionType:{type:"string"},recommendedAnalysisMode:{type:"string",enum:["copy","viral"]},language:{type:"string"},marketFit:{type:"string"},reason:{type:"string"},tags:{type:"array",items:{type:"string"}},duplicateOf:{type:"string"}}}},
  duplicateGroups:{type:"array",items:{type:"object",additionalProperties:false,required:["sourceIds","reason"],properties:{sourceIds:{type:"array",items:{type:"string"}},reason:{type:"string"}}}},risks:{type:"array",items:{type:"string"}},reviewGate:{type:"string"},
}};

async function executeCollector(job){update(job,{status:"codex_running",statusLabel:"素材管理 Agent 正在执行策略",progress:55,detail:`正在按采集策略核对 ${job.candidateCount} 条候选素材。`});const taskPath=join(job.dir,"task.json"),schemaPath=join(job.dir,"output-schema.json"),resultPath=join(job.dir,"result.json"),promptPath=join(job.dir,"prompt.md");writeFileSync(taskPath,asciiJson({id:job.id,kind:job.kind,taskId:job.taskId,planId:job.planId,task:job.task,strategy:job.strategy,candidates:job.candidates,createdAt:job.createdAt}),"utf8");writeFileSync(schemaPath,JSON.stringify(collectorSchema,null,2),"utf8");const relativeTask=taskPath.slice(workspace.length+1);const prompt=`你是短视频工厂的“爆款采集与素材管理 Agent”。根据已锁定的内容任务与采集策略，对候选素材完成筛选、分类、标签和去重建议，不执行视频拆解、脚本改写或下载。\n\n读取 ${relativeTask}。必须同时使用 task 和 strategy 作为适配依据；keywords 是搜索方向，signals 是重点评估信号，market 和 platforms 是市场边界，数据阈值已由系统预筛。classifications 必须覆盖 candidates 中每一条 sourceId，不能遗漏或增加素材。fitScore 表示与当前策略和任务的适配度，不等同于热视频绝对质量；数据字段缺失时不得猜测。仅凭标题和指标无法确认的画面、语言、钩子或转化结构必须写“待拆解确认”，reason 中说明证据边界。duplicateOf 没有明确重复证据时填空字符串。decision=archive 只表示建议入库，最终必须人工勾选确认。recommendedAnalysisMode：口播知识/观点内容选择 copy，AI带货或产品演示复刻选择 viral。最终只输出符合 JSON Schema 的中文 JSON，reviewGate 必须要求用户确认入库，禁止自动进入拆解或后续 Agent，不要修改仓库文件。`;writeFileSync(promptPath,prompt,"utf8");const args=["exec","--json","--sandbox","read-only","-C",workspace,"--output-schema",schemaPath,"-o",resultPath,"--",prompt];let jsonBuffer="";const logStream=createWriteStream(join(job.dir,"codex-events.jsonl"),{flags:"a"});await run("codex",args,{onStdout(text){logStream.write(text);jsonBuffer+=text;const lines=jsonBuffer.split(/\r?\n/);jsonBuffer=lines.pop()||"";for(const line of lines){try{const event=JSON.parse(line);if(event.type==="thread.started"&&event.thread_id)update(job,{codexThreadId:event.thread_id});}catch{}}},onStderr(text){logStream.write(JSON.stringify({type:"stderr",text})+"\n");}});logStream.end();const result=JSON.parse(readFileSync(resultPath,"utf8"));update(job,{status:"completed",statusLabel:"采集策略执行完成",progress:100,detail:"候选素材已按策略分类，等待人工确认入库。",result,error:null});}
async function runCollector(job){try{await executeCollector(job);}catch(error){update(job,{status:"failed",statusLabel:"素材分类失败",detail:"候选清单与任务包已保留，可以重新发起。",error:String(error.stderr||error.message||error).slice(-3000)});}}

function buildPrompt(job, packagePaths) {
  const taskRelative = packagePaths.taskPath.slice(workspace.length + 1);
  const transcriptRelative = packagePaths.transcriptPath.slice(workspace.length + 1);
  if (job.mode === "viral") {
    return `你正在执行短视频工厂的“开始拆解”任务。必须显式调用并严格遵守 $content-video-replication-strategist。只完成 V1 爆款视频拆解与原脚本完整还原，不得进入 P1/P2/P3，不得生成二创脚本。\n\n读取 ${taskRelative} 和 ${transcriptRelative}。在 PowerShell 中读取 UTF-8 文件时必须显式使用 Get-Content -Encoding UTF8。不要读取 codex-events.jsonl，除非任务发生错误且确实需要诊断。初始消息附带的图片按文件名顺序排列，是视频时间轴关键帧。结合语音时间码、画面字幕、镜头变化和互动数据进行证据化分析。无法确认的内容写入 uncertainty，禁止补写或猜测。爆点和转化镜头必须分开；主钩子只能选择一个；shotRestoration 必须按真实镜头微时间段细拆，不得机械按 3 秒或 15 秒均分。最终只输出符合指定 JSON Schema 的 JSON，并在 reviewGate 明确“V1 已完成，等待用户确认”。不要修改仓库文件。`;
  }
  return `你正在执行短视频工厂的“开始分析”任务。这是文案与表达分析，不得调用 content-video-replication-strategist，也不得输出爆款复刻 V1。\n\n读取 ${taskRelative} 和 ${transcriptRelative}。在 PowerShell 中读取 UTF-8 文件时必须显式使用 Get-Content -Encoding UTF8。不要读取 codex-events.jsonl，除非任务发生错误且确实需要诊断。初始消息附带的图片按文件名顺序排列，是视频时间轴关键帧。完成：1）语音转写与画面字幕核对；2）表达结构拆解；3）保留原逻辑但不照搬原句的口播改写。原文与改写必须分开；听不清、看不清处明确标注，不得猜测。最终只输出符合指定 JSON Schema 的 JSON。不要修改仓库文件。`;
}

async function executeCodex(job, packagePaths) {
  update(job, { status: "codex_running", statusLabel: job.mode === "viral" ? "Codex 正在拆解 V1" : "Codex 正在分析文案", progress: 68, detail: job.mode === "viral" ? "正在按爆款拆解技能生成八个 V1 模块。" : "正在提取原文、表达结构并生成口播改写。" });
  const schema = job.mode === "viral" ? viralSchema : copySchema;
  const schemaPath = join(job.dir, "output-schema.json");
  const resultPath = join(job.dir, "result.json");
  const promptPath = join(job.dir, "prompt.md");
  const prompt = buildPrompt(job, packagePaths);
  writeFileSync(schemaPath, JSON.stringify(schema, null, 2), "utf8");
  writeFileSync(promptPath, prompt, "utf8");

  const framePaths = readdirSync(packagePaths.framesDir).filter((file) => /\.jpe?g$/i.test(file)).sort().slice(0, 32).map((file) => join(packagePaths.framesDir, file));
  const args = ["exec", "--json", "--sandbox", "read-only", "-C", workspace, "--output-schema", schemaPath, "-o", resultPath];
  for (const framePath of framePaths) args.push("--image", framePath);
  args.push("--", prompt);
  let jsonBuffer = "";
  const logPath = join(job.dir, "codex-events.jsonl");
  const logStream = createWriteStream(logPath, { flags: "a" });
  await run("codex", args, {
    onStdout(text) {
      logStream.write(text);
      jsonBuffer += text;
      const lines = jsonBuffer.split(/\r?\n/);
      jsonBuffer = lines.pop() || "";
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.type === "thread.started" && event.thread_id) update(job, { codexThreadId: event.thread_id });
        } catch {}
      }
    },
    onStderr(text) { logStream.write(JSON.stringify({ type: "stderr", text }) + "\n"); },
  });
  logStream.end();
  const result = JSON.parse(readFileSync(resultPath, "utf8"));
  update(job, { status: "completed", statusLabel: job.mode === "viral" ? "V1 拆解完成" : "分析完成", progress: 100, detail: job.mode === "viral" ? "结果已同步回工作台，等待你确认 V1。" : "文案、表达结构和改写稿已同步回工作台。", result, error: null });
}

async function executeProductResearch(job) {
  update(job, { status: "codex_running", statusLabel: "Codex 正在商品调研", progress: 66, detail: `正在结合${job.country}、${job.platform}和${job.language}分析人群、痛点与市场打法。` });
  const taskPath = join(job.dir, "task.json");
  const schemaPath = join(job.dir, "output-schema.json");
  const resultPath = join(job.dir, "result.json");
  const promptPath = join(job.dir, "prompt.md");
  const assetFiles = readdirSync(job.dir).filter((file) => file.startsWith("asset-")).sort();
  const task = { id: job.id, kind: job.kind, country: job.country, platform: job.platform, language: job.language, productName: job.productName, notes: job.notes, assetFiles, createdAt: job.createdAt };
  writeFileSync(taskPath, asciiJson(task), "utf8");
  writeFileSync(schemaPath, JSON.stringify(productResearchSchema, null, 2), "utf8");
  const relativeTask = taskPath.slice(workspace.length + 1);
  const relativeAssets = assetFiles.map((file) => join(job.dir, file).slice(workspace.length + 1));
  const prompt = `你正在执行短视频工厂第03步“商品调研”，这不是视频文案分析，也不是爆款视频V1拆解，不得调用 content-video-replication-strategist。\n\n读取 ${relativeTask}，并逐个检查以下用户上传的产品资料：\n${relativeAssets.map((file) => `- ${file}`).join("\n")}\n\n调研范围已经锁定为：国家=${job.country}，平台=${job.platform}，目标市场营销文案语言=${job.language}。先区分资料中可证实事实、合理推断和缺失信息，再输出目标人群、人群场景、痛点链、产品应对、市场定位、平台打法、内容方向、转化路径、风险边界和按优先级排列的行动计划。不得虚构产品参数、销量、认证、价格、竞品数据或市场规模；没有实时证据的数据写入 uncertainties。\n\n语言规则必须严格执行：整份调研报告的 title、scope、产品证据、人群、痛点、市场打法、平台策略、内容方向说明、风险、行动计划、不确定项和审核门全部使用简体中文；contentDirections 中的 hook 与 cta 也写成中文策略说明，不直接放外语成稿。只有 localizedCopy 模块中的标题、卖点句、Hook 和 CTA 使用${job.language}，这是提供给${job.country}消费者的可直接使用文案。最终只输出符合指定 JSON Schema 的 JSON，不要修改仓库文件。`;
  writeFileSync(promptPath, prompt, "utf8");
  const args = ["exec", "--json", "--sandbox", "read-only", "-C", workspace, "--output-schema", schemaPath, "-o", resultPath];
  for (const file of assetFiles.filter((name) => /\.(png|jpe?g|webp)$/i.test(name))) args.push("--image", join(job.dir, file));
  args.push("--", prompt);
  let jsonBuffer = "";
  const logStream = createWriteStream(join(job.dir, "codex-events.jsonl"), { flags: "a" });
  await run("codex", args, {
    onStdout(text) {
      logStream.write(text);
      jsonBuffer += text;
      const lines = jsonBuffer.split(/\r?\n/);
      jsonBuffer = lines.pop() || "";
      for (const line of lines) {
        try { const event = JSON.parse(line); if (event.type === "thread.started" && event.thread_id) update(job, { codexThreadId: event.thread_id }); } catch {}
      }
    },
    onStderr(text) { logStream.write(JSON.stringify({ type: "stderr", text }) + "\n"); },
  });
  logStream.end();
  const result = JSON.parse(readFileSync(resultPath, "utf8"));
  update(job, { status: "completed", statusLabel: "商品调研完成", progress: 100, detail: "完整方案已同步回工作台，等待审核后进入脚本与分镜。", result, error: null });
}

async function runProductResearch(job) {
  try {
    update(job, { status: "packaging", statusLabel: "正在整理产品资料", progress: 38, detail: "正在建立产品证据包并锁定国家、平台和语言。", error: null });
    await executeProductResearch(job);
  } catch (error) {
    update(job, { status: "failed", statusLabel: "商品调研失败", detail: "产品资料与任务包已保留，可以重新发起。", error: String(error.stderr || error.message || error).slice(-3000) });
  }
}

async function runPipeline(job) {
  try {
    let videoPath = findVideo(job);
    if (!videoPath) videoPath = await downloadVideo(job);
    if (!videoPath) return;
    const packageParts = await preprocess(job, videoPath);
    const transcriptPath = await transcribe(job, packageParts.audioPath);
    update(job, { status: "packaging", statusLabel: "正在生成 Codex 任务包", progress: 58, detail: `已锁定“${job.modeLabel}”路线，正在整理提示词、转写和关键帧。` });
    const taskPath = join(job.dir, "task.json");
    writeFileSync(taskPath, asciiJson({ id: job.id, mode: job.mode, modeLabel: job.modeLabel, source: job.source, createdAt: job.createdAt, videoPath, transcriptPath, framesDir: packageParts.framesDir, rule: job.mode === "viral" ? "只执行 content-video-replication-strategist V1" : "文案与表达分析，禁止调用爆款拆解技能" }), "utf8");
    await executeCodex(job, { ...packageParts, transcriptPath, taskPath });
  } catch (error) {
    update(job, { status: "failed", statusLabel: "任务执行失败", detail: "任务包已保留，可以修复后重新执行。", error: String(error.stderr || error.message || error).slice(-3000) });
  }
}

function enqueue(job) {
  const execute = () => job.kind === "product_research" ? runProductResearch(job) : job.kind === "content_orchestration" ? runContentOrchestration(job) : job.kind === "viral_asset_collection" ? runCollector(job) : runPipeline(job);
  executionQueue = executionQueue.then(execute, execute);
}

function createJob(payload) {
  const mode = payload.mode === "viral" ? "viral" : "copy";
  const source = safeSource(payload.source || {});
  const id = `${mode}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const requiresUpload=!source.link;
  const job = {
    id, kind:"video_analysis", mode, modeLabel: mode === "viral" ? "开始拆解 · AI带货V1" : "开始分析 · 文案与表达",
    status: requiresUpload?"needs_upload":"queued", statusLabel: requiresUpload?"等待接收本地视频":"任务已创建", progress: requiresUpload?8:3,
    detail: requiresUpload?"任务已建立，正在等待网页上传本地视频。":mode === "viral" ? "已锁定爆款拆解技能 V1 路线。" : "已锁定文案提取、表达结构和口播改写路线。",
    source, createdAt: now(), updatedAt: now(), dir: join(jobsRoot, id), result: null, error: null,
  };
  jobs.set(id, job);
  persist(job);
  if(!requiresUpload)enqueue(job);
  return job;
}

function createContentOrchestrationJob(payload){
  const clean=(value,fallback,length=500)=>String(value||fallback).trim().slice(0,length);
  const targetCount=Math.max(1,Math.min(30,Number(payload.targetCount)||1));
  const id=`orchestrator-${Date.now()}-${randomUUID().slice(0,8)}`;
  const inputs={products:clean(payload.products,"待确认产品",1000),platforms:clean(payload.platforms,"TikTok Shop",300),accounts:clean(payload.accounts,"待分配账号",500),contentMix:clean(payload.contentMix,"按爆款复刻与原创测试合理分配",1000),goal:clean(payload.goal,"完成当日内容发布计划",1000),constraints:clean(payload.constraints,"后续生成与发布必须人工确认",2000)};
  const job={id,kind:"content_orchestration",mode:"orchestrator",modeLabel:"内容总控 Agent",status:"queued",statusLabel:"今日计划已排队",progress:8,detail:"目标已锁定，等待内容总控 Agent 拆分任务。",planDate:clean(payload.planDate,new Date().toISOString().slice(0,10),20),targetCount,inputs,source:{id,platform:inputs.platforms,author:"内容总控 Agent",title:`${clean(payload.planDate,"今日",20)} 内容计划`,link:"",metrics:{}},createdAt:now(),updatedAt:now(),dir:join(jobsRoot,id),result:null,error:null};
  jobs.set(id,job);persist(job);enqueue(job);return job;
}

function createCollectorJob(payload){const clean=(value,fallback,length=500)=>String(value||fallback).trim().slice(0,length);const rawCandidates=Array.isArray(payload.candidates)?payload.candidates.slice(0,24):[];if(!rawCandidates.length)throw new Error("爆款池中没有可供分类的候选素材");const candidates=rawCandidates.map(item=>({id:clean(item.id,"unknown",100),platform:clean(item.platform,"未知平台",40),author:clean(item.author,"未知作者",160),title:clean(item.title,"未命名素材",500),link:clean(item.link,"",1000),likes:Number(item.likes)||0,views:item.views===null?null:Number(item.views)||0,comments:Number(item.comments)||0,favorites:Number(item.favorites)||0,shares:Number(item.shares)||0,analysis:clean(item.analysis,"未拆解",60)}));const id=`collector-${Date.now()}-${randomUUID().slice(0,8)}`,task=payload.task&&typeof payload.task==="object"?payload.task:{},strategy=payload.strategy&&typeof payload.strategy==="object"?payload.strategy:{};const job={id,kind:"viral_asset_collection",mode:"collector",modeLabel:"爆款采集与素材管理 Agent",status:"queued",statusLabel:"采集策略已排队",progress:8,detail:`已按“${clean(strategy.name,"未命名策略",120)}”接收 ${candidates.length} 条候选素材。`,taskId:clean(payload.taskId||task.id,"unassigned-task",120),planId:clean(payload.planId,"unassigned-plan",120),task,strategy,candidates,candidateCount:candidates.length,source:{id:clean(payload.taskId||task.id,"COLLECTOR",80),platform:clean(task.platform,"多平台",60),author:"素材管理 Agent",title:clean(task.productName,"爆款素材分类",200),link:"",metrics:{}},createdAt:now(),updatedAt:now(),dir:join(jobsRoot,id),result:null,error:null};jobs.set(id,job);persist(job);enqueue(job);return job;}

function createProductResearchJob(payload) {
  const clean = (value, fallback, length = 120) => String(value || fallback).trim().slice(0, length);
  const id = `research-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const job = {
    id, kind: "product_research", mode: "research", modeLabel: "商品调研",
    status: "collecting", statusLabel: "等待产品资料", progress: 8,
    detail: "调研范围已锁定，正在接收产品图片、参数与补充说明。",
    country: clean(payload.country, "美国", 40), platform: clean(payload.platform, "TikTok Shop", 60), language: clean(payload.language, "英语", 40),
    productName: clean(payload.productName, "未命名产品", 200), notes: clean(payload.notes, "", 3000),
    source: { id: clean(payload.productName, "PRODUCT", 80), platform: clean(payload.platform, "TikTok Shop", 60), author: "商品调研", title: clean(payload.productName, "未命名产品", 200), link: "", metrics: {} },
    createdAt: now(), updatedAt: now(), dir: join(jobsRoot, id), result: null, error: null, assetCount: 0,
  };
  jobs.set(id, job);
  persist(job);
  return job;
}

async function receiveResearchAsset(req, job) {
  const contentLength = Number(req.headers["content-length"] || 0);
  if (!contentLength || contentLength > 80 * 1024 * 1024) throw new Error("单个产品资料文件需小于 80MB");
  if ((job.assetCount || 0) >= 12) throw new Error("单次调研最多上传 12 个资料文件");
  const encodedName = String(req.headers["x-file-name"] || "product-file");
  let decodedName = encodedName;
  try { decodedName = decodeURIComponent(encodedName); } catch {}
  const original = basename(decodedName).replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
  const target = join(job.dir, `asset-${String((job.assetCount || 0) + 1).padStart(2, "0")}-${original || "file"}`);
  await new Promise((resolvePromise, rejectPromise) => {
    const stream = createWriteStream(target);
    req.pipe(stream); req.on("error", rejectPromise); stream.on("error", rejectPromise); stream.on("finish", resolvePromise);
  });
  update(job, { assetCount: (job.assetCount || 0) + 1, status: "collecting", statusLabel: `已接收 ${Number(job.assetCount || 0) + 1} 份资料`, progress: 12 + Math.min(16, Number(job.assetCount || 0) * 2), detail: "资料保存在本机任务包，点击开始后交给 Codex 调研。" });
}

async function receiveUpload(req, job) {
  const contentLength = Number(req.headers["content-length"] || 0);
  if (!contentLength || contentLength > 1024 * 1024 * 1024) throw new Error("请选择小于 1GB 的视频文件");
  const encodedName = String(req.headers["x-file-name"] || "uploaded.mp4");
  let originalName = encodedName;
  try { originalName = decodeURIComponent(encodedName); } catch {}
  const extension = [".mp4", ".mov", ".mkv", ".webm"].includes(extname(originalName).toLowerCase()) ? extname(originalName).toLowerCase() : ".mp4";
  const tempPath = join(job.dir, `uploading${extension}`);
  const finalPath = join(job.dir, `source-upload${extension}`);
  update(job, { status: "uploading", statusLabel: "正在接收视频", progress: 18, detail: "视频上传到本机任务包，不会发送到公开服务器。", error: null });
  await new Promise((resolvePromise, rejectPromise) => {
    const stream = createWriteStream(tempPath);
    req.pipe(stream);
    req.on("error", rejectPromise);
    stream.on("error", rejectPromise);
    stream.on("finish", resolvePromise);
  });
  renameSync(tempPath, finalPath);
  enqueue(job);
}

for (const folder of readdirSync(jobsRoot, { withFileTypes: true })) {
  if (!folder.isDirectory()) continue;
  const file = join(jobsRoot, folder.name, "job.json");
  if (!existsSync(file)) continue;
  try {
    const stored = JSON.parse(readFileSync(file, "utf8"));
    const restored = { ...stored, dir: join(jobsRoot, folder.name) };
    if (!["completed", "failed", "needs_upload"].includes(restored.status)) {
      restored.status = "failed";
      restored.statusLabel = "本机服务已重启";
      restored.detail = "任务包已保留，请重新创建任务或重新上传视频后继续。";
      restored.error = "任务执行期间本机协作服务被重启";
      persist(restored);
    }
    jobs.set(restored.id, restored);
  } catch {}
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) return send(res, 403, { error: "不允许的网页来源" }, origin);
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(origin));
    return res.end();
  }
  const url = new URL(req.url, `http://127.0.0.1:${bridgePort}`);
  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return send(res, 200, { ok: true, mode: "local-codex", codexAuth: existsSync(join(process.env.USERPROFILE || "", ".codex", "auth.json")), queueSize: [...jobs.values()].filter((job) => !["completed", "failed", "needs_upload"].includes(job.status)).length }, origin);
    }
    if (req.method === "GET" && url.pathname === "/jobs") {
      const history=[...jobs.values()].filter(job=>(job.kind||"video_analysis")==="video_analysis").sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(publicJob);
      return send(res,200,{jobs:history},origin);
    }
    if (req.method === "POST" && url.pathname === "/jobs") {
      const job = createJob(await readJson(req));
      return send(res, 202, publicJob(job), origin);
    }
    if (req.method === "POST" && url.pathname === "/research-jobs") {
      const job = createProductResearchJob(await readJson(req));
      return send(res, 202, publicJob(job), origin);
    }
    if (req.method === "POST" && url.pathname === "/orchestrator-jobs") {
      const job=createContentOrchestrationJob(await readJson(req));
      return send(res,202,publicJob(job),origin);
    }
    const orchestratorMatch=url.pathname.match(/^\/orchestrator-jobs\/([a-z0-9-]+)$/i);
    if(orchestratorMatch&&req.method==="GET"){
      const job=jobs.get(orchestratorMatch[1]);
      if(!job||job.kind!=="content_orchestration")return send(res,404,{error:"内容计划任务不存在"},origin);
      return send(res,200,publicJob(job),origin);
    }
    if(req.method==="POST"&&url.pathname==="/collector-jobs"){
      const job=createCollectorJob(await readJson(req));
      return send(res,202,publicJob(job),origin);
    }
    const collectorMatch=url.pathname.match(/^\/collector-jobs\/([a-z0-9-]+)$/i);
    if(collectorMatch&&req.method==="GET"){
      const job=jobs.get(collectorMatch[1]);
      if(!job||job.kind!=="viral_asset_collection")return send(res,404,{error:"素材分类任务不存在"},origin);
      return send(res,200,publicJob(job),origin);
    }
    const researchMatch = url.pathname.match(/^\/research-jobs\/([a-z0-9-]+)\/(upload|start|rerun)$/i);
    if (researchMatch) {
      const job = jobs.get(researchMatch[1]);
      if (!job || job.kind !== "product_research") return send(res, 404, { error: "商品调研任务不存在" }, origin);
      if (req.method === "POST" && researchMatch[2] === "upload") {
        await receiveResearchAsset(req, job);
        return send(res, 202, publicJob(job), origin);
      }
      if (req.method === "POST" && researchMatch[2] === "start") {
        if (!job.assetCount) return send(res, 400, { error: "请至少上传一份产品资料" }, origin);
        if (!["collecting", "failed"].includes(job.status)) return send(res, 409, { error: "当前任务已经开始" }, origin);
        update(job, { status: "queued", statusLabel: "商品调研已排队", progress: 30, detail: "资料接收完成，等待本机 Codex 执行。", error: null });
        enqueue(job);
        return send(res, 202, publicJob(job), origin);
      }
      if (req.method === "POST" && researchMatch[2] === "rerun") {
        if (!job.assetCount) return send(res, 400, { error: "原任务中没有可复用的产品资料" }, origin);
        if (!["completed", "failed"].includes(job.status)) return send(res, 409, { error: "当前任务仍在执行" }, origin);
        update(job, { status: "queued", statusLabel: "已按新语言规则重新排队", progress: 30, detail: "保留原产品资料，重新生成中文调研分析与目标市场营销文案。", result: null, error: null });
        enqueue(job);
        return send(res, 202, publicJob(job), origin);
      }
    }
    const match = url.pathname.match(/^\/jobs\/([a-z0-9-]+)(\/upload)?$/i);
    if (match) {
      const job = jobs.get(match[1]);
      if (!job) return send(res, 404, { error: "任务不存在" }, origin);
      if (req.method === "GET" && !match[2]) return send(res, 200, publicJob(job), origin);
      if (req.method === "POST" && match[2]) {
        await receiveUpload(req, job);
        return send(res, 202, publicJob(job), origin);
      }
    }
    return send(res, 404, { error: "接口不存在" }, origin);
  } catch (error) {
    return send(res, 400, { error: error.message || String(error) }, origin);
  }
});

server.listen(bridgePort, "127.0.0.1", () => {
  console.log(`TK video analysis bridge listening on http://127.0.0.1:${bridgePort}`);
});
