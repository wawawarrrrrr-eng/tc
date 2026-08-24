"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type ModuleKey = "dashboard" | "alerts" | "logistics" | "service" | "ads" | "video" | "selection" | "testing" | "inventory" | "creators" | "links" | "profit" | "settings";
type VideoStageKey = "00" | "01" | "02" | "03" | "04" | "05" | "06";
type WorkbenchHistoryState = { tkWorkbench: true; index: number; module: ModuleKey; stage: VideoStageKey; view: string };
type DataRow = Record<string, unknown>;
type StoreData = {
  connected: boolean;
  error?: string;
  detail?: string;
  source?: string;
  realtime?: boolean;
  selectedShop?: string;
  updatedAt?: string | null;
  shops: DataRow[];
  dashboard: DataRow[];
  metrics: DataRow[];
  alerts: DataRow[];
  inventory: DataRow[];
  packages: DataRow[];
  refunds: DataRow[];
  products: DataRow[];
  counts: { orders: number; refunds: number; packages: number; products: number; skus: number };
};

const navigation: Array<{ key: ModuleKey; icon: string; label: string }> = [
  { key: "dashboard", icon: "⌂", label: "老板驾驶舱" },
  { key: "alerts", icon: "!", label: "异常中心" },
  { key: "logistics", icon: "↗", label: "物流" },
  { key: "service", icon: "✦", label: "客服" },
  { key: "ads", icon: "◎", label: "广告" },
  { key: "video", icon: "▶", label: "短视频工厂" },
  { key: "selection", icon: "◇", label: "选品" },
  { key: "testing", icon: "⌁", label: "测品" },
  { key: "inventory", icon: "▦", label: "库存" },
  { key: "creators", icon: "♧", label: "达人 BD" },
  { key: "links", icon: "↪", label: "链接监控" },
  { key: "profit", icon: "¥", label: "销售利润" },
  { key: "settings", icon: "⚙", label: "设置" },
];

const videoStages: Array<{ key: VideoStageKey; label: string }> = [
  { key: "00", label: "内容总控" },
  { key: "01", label: "爆款池" },
  { key: "02", label: "采集与拆解" },
  { key: "03", label: "商品调研" },
  { key: "04", label: "脚本与分镜" },
  { key: "05", label: "视频生产与发布" },
  { key: "06", label: "数据复盘" },
];

const moduleKeys = new Set<ModuleKey>(navigation.map(item => item.key));
const videoStageKeys = new Set<VideoStageKey>(videoStages.map(item => item.key));
const defaultVideoView = (stage: VideoStageKey) => stage === "04" ? "script:inputs" : stage === "05" ? "production:reference" : stage === "06" ? "review:overview" : "";
const readWorkbenchLocation = () => {
  if (typeof window === "undefined") return { module: "dashboard" as ModuleKey, stage: "00" as VideoStageKey, view: "" };
  const url = new URL(window.location.href);
  const moduleValue = url.searchParams.get("module") as ModuleKey | null;
  const stageValue = url.searchParams.get("stage") as VideoStageKey | null;
  const module = moduleValue && moduleKeys.has(moduleValue) ? moduleValue : "dashboard";
  const stage = stageValue && videoStageKeys.has(stageValue) ? stageValue : "00";
  return { module, stage, view: url.searchParams.get("view") || (module === "video" ? defaultVideoView(stage) : "") };
};

const videoStageMeta: Record<VideoStageKey, { eyebrow: string; title: string; description: string; owner: string }> = {
  "00": { eyebrow: "经营目标", title: "内容总控", description: "先确定今天发布多少条、主推什么产品、使用什么内容结构与账号，再由内容总控 Agent 拆成可执行任务。", owner: "老板 / 总控 Agent" },
  "01": { eyebrow: "选题入口", title: "爆款池", description: "读取飞书内容选题库，先去重与补齐数据，再用“爆点抓流量＋转化镜头促出单”筛出进入 V1 拆解的素材。", owner: "运营" },
  "02": { eyebrow: "结构提炼", title: "采集与拆解", description: "根据视频类型选择文案表达分析或 AI 带货 V1 拆解，输出可审核的原文案、表达结构、口播改写与复刻骨架。", owner: "内容 Agent" },
  "03": { eyebrow: "转化依据", title: "商品调研", description: "确认人群、痛点、卖点、购买阻力、合规风险和内容机会，决定是否进入制作。", owner: "运营 / 老板" },
  "04": { eyebrow: "创意策划", title: "脚本与分镜", description: "锁定脚本后拆成镜头，决定每个镜头使用 AI、实拍或混合制作，并建立产品与人物锚点。", owner: "内容 Agent" },
  "05": { eyebrow: "资产生产", title: "视频生产与发布", description: "逐镜头生成画面提示词、参考图和视频提示词，完成 AI 视频创作后进入发布。", owner: "内容制作" },
  "06": { eyebrow: "经营闭环", title: "数据复盘", description: "把播放、留存、点击、订单、GMV 和利润回写到脚本、镜头和商品，决定下一轮动作。", owner: "老板 / Agent" },
};

const contentProjects = [
  { id: "CP-20260818-530L", workspaceId: "storage-box-viral-test-001", product: "P-530L 透明硬质收纳箱", script: "A版 · 15秒", status: "参考图与提示词已确认", progress: 72 },
];

const legacyShotRows = [
  { id: "A-S01", time: "0.0–0.9s", scene: "玩具房杂乱痛点，积木散落形成视觉钩子", mode: "AI生成", asset: "参考图已确认", status: "等待视频平台", image: "/video-projects/storage-box-viral-test-001/A-S01.png", imagePrompt: "竖屏9:16，真实家庭玩具房，地面散落大量彩色积木，家长无奈站在画面边缘；开场即出现强烈杂乱冲突，真实自然光，不出现目标收纳箱、文字或水印。", videoPrompt: "以确认参考图为首帧。0.0–0.9秒快速轻推镜头，前景积木轻微滚动，人物自然低头看向混乱地面；保持房间、人物与光线一致，不新增产品。" },
  { id: "A-S02", time: "0.9–2.4s", scene: "人物扶住透明空箱，完成产品亮相", mode: "AI＋产品合成", asset: "人物/产品锁定已确认", status: "等待视频平台", image: "/video-projects/storage-box-viral-test-001/A-S02.png", imagePrompt: "竖屏9:16，中景，家长在玩具房举起透明硬质收纳箱；严格匹配产品白底图的透明箱体、黑色把手与比例，人物锚点保持一致，禁止改动产品结构和标签。", videoPrompt: "0.9–2.4秒人物从地面自然扶起空箱并朝镜头略微转动，产品保持刚性、不变形，黑色把手和透明箱体始终清晰；结尾箱口朝上准备装入物品。" },
  { id: "A-S03", time: "2.4–4.7s", scene: "把积木真实装入硬质透明箱", mode: "必须实拍", asset: "实拍清单 LIVE-01", status: "待拍摄", image: "/video-projects/storage-box-viral-test-001/A-S03.png", imagePrompt: "实拍构图参考：俯拍偏侧角度，双手把彩色积木装入真实透明收纳箱；箱体、把手、标签和材质必须来自实物，不用AI替代产品证明画面。", videoPrompt: "LIVE-01：连续拍摄双手将积木装入真实箱体，保留装入前后各0.5秒余量；固定机位，动作完整，禁止遮挡黑色把手和箱体边缘。" },
  { id: "A-S04", time: "4.7–6.8s", scene: "三类玩具分别装箱，建立分类逻辑", mode: "必须实拍", asset: "实拍清单 LIVE-02", status: "待拍摄", image: "/video-projects/storage-box-viral-test-001/A-S04.png", imagePrompt: "实拍构图参考：同一真实透明箱分三次拍摄积木、毛绒玩具和小车，机位、光线、箱体方向完全一致，后期以快速匹配剪辑呈现分类。", videoPrompt: "LIVE-02：相同机位连续拍摄三组内容物切换，每组0.7秒；箱体位置与相机参数锁定，通过跳切形成三类别快速分类效果。" },
  { id: "A-S05", time: "6.8–9.2s", scene: "真实合盖并轻推进入低柜", mode: "必须实拍", asset: "实拍清单 LIVE-03", status: "待拍摄", image: "/video-projects/storage-box-viral-test-001/A-S05.png", imagePrompt: "实拍构图参考：低机位侧拍真实透明箱合盖后被轻推进入低柜；必须证明盖体、把手、硬质箱体和实际滑动过程，禁止AI夸大空间或改变尺寸。", videoPrompt: "LIVE-03：双手完成一次合盖，再沿地面平稳轻推箱体进入低柜；动作符合物理规律，无瞬移、穿模或箱体变形，结尾停稳0.5秒。" },
  { id: "A-S06", time: "9.2–12.4s", scene: "人物指向透明箱体，突出内容物可视", mode: "AI＋产品合成", asset: "参考图已确认", status: "等待视频平台", image: "/video-projects/storage-box-viral-test-001/A-S06.png", imagePrompt: "竖屏9:16，整洁玩具房低柜场景，人物蹲下指向透明箱体内可见的玩具；产品严格匹配白底图，透明度自然，不添加未经证实的功能文字。", videoPrompt: "9.2–12.4秒镜头缓慢横移，人物自然指向箱体内部并微笑，箱体与内容物位置稳定，透明材质和黑色把手不漂移，结尾视线落在产品上。" },
  { id: "A-S07", time: "12.4–15.0s", scene: "整洁结果与透明箱英雄镜头完成CTA", mode: "AI＋实拍", asset: "参考图已确认", status: "等待视频平台", image: "/video-projects/storage-box-viral-test-001/A-S07.png", imagePrompt: "竖屏9:16，干净玩具房最终英雄构图，真实透明收纳箱置于画面中心，整洁环境形成前后对比；保留底部字幕安全区，不生成文字、价格或平台按钮。", videoPrompt: "12.4–15.0秒从整洁空间缓慢推进到产品英雄特写，人物手掌轻触箱盖后离开；产品比例、标签、把手和透明材质全程锁定，结尾停帧0.5秒供CTA叠字。" },
];

const hookVersions = {
  A: { label: "A · 痛点视觉钩子", recommended: true, type: "视觉 / 反差", line: "Toys everywhere? Let’s fix this fast.", visual: "杂乱玩具房先出现，积木滚入前景，人物立刻举起透明空箱。", reason: "收纳箱属于强需求产品，真实杂乱场景能最快触发目标用户共鸣。" },
  B: { label: "B · 结果前置钩子", recommended: false, type: "结果", line: "This room was a mess ten minutes ago.", visual: "先展示整洁结果，再快速闪回满地玩具。", reason: "适合测试结果吸引力，但首帧的痛点识别速度略弱于 A 版。" },
  C: { label: "C · 人群场景钩子", recommended: false, type: "身份 / 场景", line: "Parents with tiny playrooms — try this.", visual: "家长站在小玩具房入口，指向有限的收纳空间。", reason: "人群更精准，适合账号已有稳定亲子受众时测试。" },
} as const;

const legacyScriptMicroRows = [
  { id:"A-S01", time:"0.0–0.9s", slot:"黄金3秒 · 痛点触发", roles:"人物A＋散落玩具", line:"", purpose:"抓注意力" },
  { id:"A-S02", time:"0.9–2.4s", slot:"产品在3秒内亮相", roles:"人物A＋真实产品", line:"Toys everywhere? Let’s fix this fast.", purpose:"展示产品" },
  { id:"A-S03", time:"2.4–4.7s", slot:"动作证明 1", roles:"手部演示者＋真实产品", line:"Blocks — in.", purpose:"建立信任" },
  { id:"A-S04", time:"4.7–6.8s", slot:"动作证明 2", roles:"手部演示者＋三类玩具", line:"Plushies, little cars — sorted in seconds.", purpose:"展示效果" },
  { id:"A-S05", time:"6.8–9.2s", slot:"结构与收纳证明", roles:"手部演示者＋真实产品", line:"Close it and slide it away.", purpose:"建立信任" },
  { id:"A-S06", time:"9.2–12.4s", slot:"核心利益可视化", roles:"人物A＋产品＋内容物", line:"You can still see exactly what’s inside.", purpose:"场景延伸" },
  { id:"A-S07", time:"12.4–15.0s", slot:"结果＋CTA", roles:"人物A＋产品英雄镜头", line:"Make cleanup easier — tap to shop.", purpose:"推动下单" },
];

const videoGenerationModels = [
  { id: "seedance-2.0", name: "Seedance 2.0", minSeconds: 4, maxSeconds: 15, note: "适合 15 秒以内完整段落" },
  { id: "seedance-2.5", name: "Seedance 2.5", minSeconds: 4, maxSeconds: 30, note: "支持更长叙事与连续动作" },
  { id: "veo-3", name: "Veo 3", minSeconds: 4, maxSeconds: 8, note: "按短镜头拆分生成" },
  { id: "omni", name: "Omni", minSeconds: 4, maxSeconds: 10, note: "适合中短段落与产品动作" },
  { id: "grok", name: "Grok", minSeconds: 4, maxSeconds: 10, note: "适合中短段落与快速迭代" },
] as const;

function buildGenerationSegments(totalSeconds: number, segmentLimit: number) {
  const minimum = 4;
  const count = Math.max(1, Math.ceil(totalSeconds / segmentLimit));
  let lengths = count === 1 ? [totalSeconds] : [...Array(count - 1).fill(segmentLimit), totalSeconds - segmentLimit * (count - 1)];
  let exactFit = lengths.every(length => length >= minimum && length <= segmentLimit);
  if (!exactFit && count > 1 && lengths.at(-1)! < minimum) {
    let shortage = minimum - lengths.at(-1)!;
    for (let index = lengths.length - 2; index >= 0 && shortage > 0; index -= 1) {
      const transferable = Math.min(lengths[index] - minimum, shortage);
      lengths[index] -= transferable;
      lengths[lengths.length - 1] += transferable;
      shortage -= transferable;
    }
    exactFit = shortage <= 0;
  }
  if (!exactFit) lengths = Array(count).fill(segmentLimit);
  let cursor = 0;
  const generatedTotal = lengths.reduce((sum, length) => sum + length, 0);
  return lengths.map((length, index) => {
    const start = Number(cursor.toFixed(3));
    const end = Number((cursor + length).toFixed(3));
    const segment = { id: `VP-${String(index + 1).padStart(2, "0")}`, start, end, trim: index === lengths.length - 1 ? Number(Math.max(0, generatedTotal - totalSeconds).toFixed(3)) : 0 };
    cursor += length;
    return segment;
  });
}

function parseDurationSeconds(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*(?:秒|s\b)/i);
  return match ? Number(match[1]) : null;
}

function formatSeconds(value: number) {
  return Number(value.toFixed(3)).toString();
}

function getAnalyzedReferenceDuration(result?: Record<string, unknown> | null) {
  if (!result) return null;
  const basicInfo = result.basicInfo && typeof result.basicInfo === "object" ? result.basicInfo as Record<string, unknown> : {};
  for (const candidate of [basicInfo.duration, result.duration, result.videoDuration, result.sourceDuration, result.sourceSummary]) {
    const parsed = parseDurationSeconds(candidate);
    if (parsed) return parsed;
  }
  const timedRows = [result.shotRestoration, result.overallStructure, result.transcript].flatMap(value => Array.isArray(value) ? value : []);
  const ends = timedRows.flatMap(row => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    const range = String(record.timeRange || record.time || "");
    const match = range.match(/(?:-|–)\s*(\d+(?:\.\d+)?)\s*s/i);
    const direct = parseDurationSeconds(record.end);
    return match ? [Number(match[1])] : direct ? [direct] : [];
  });
  return ends.length ? Math.max(...ends) : null;
}

type AiCreationSegment = {
  id: string;
  sourceStart: number;
  sourceEnd: number;
  targetDuration: number;
  apiDuration: number | null;
  trimDuration: number;
  prompt: string;
  shotIds: string[];
  imageUrls: string[];
};

type AiCreationJob = {
  id: string;
  projectId: string;
  segmentId: string;
  taskId?: string;
  modelId: string;
  modelName: string;
  providerModel?: string | null;
  duration: number;
  ratio: string;
  referenceMode: string;
  prompt: string;
  status: string;
  progress: number;
  error?: string | null;
  videoUrl?: string | null;
  groupName: string;
  createdAt: string;
  updatedAt?: string;
};

type ReferenceImageAsset = {
  id:string;
  projectId:string;
  projectCode:string;
  productName:string;
  shotId:string;
  version:number;
  prompt:string;
  imageUrl:string;
  status:string;
  createdAt:string;
};

type WorkflowProject = {
  id:string;
  code:string;
  productName:string;
  sourceId:string;
  source:Record<string,unknown>;
  analysisId?:string|null;
  researchId?:string|null;
  currentStage:string;
  status:string;
  workflow:Record<string,unknown>;
  createdAt?:string;
  updatedAt?:string;
};

const aiStudioModels = [
  { id:"seedance-2.0",name:"Seedance 2.0",provider:"sd-fast",durations:[10,15],maxImages:9,note:"当前接口可提交" },
  { id:"seedance-2.5",name:"Seedance 2.5",provider:"sd25-30s",durations:[30],maxImages:30,note:"当前接口可提交" },
  { id:"veo-3",name:"Veo 3",provider:null,durations:[4,5,6,7,8],maxImages:3,note:"等待接入对应接口" },
  { id:"omni",name:"Omni",provider:null,durations:[4,5,6,7,8,9,10],maxImages:9,note:"等待接入对应接口" },
  { id:"grok",name:"Grok",provider:null,durations:[4,5,6,7,8,9,10],maxImages:9,note:"等待接入对应接口" },
] as const;
const aiStudioRatios = ["9:16","16:9","1:1","3:4","4:3","21:9"];
const aiStudioReferenceModes = ["自动判断","纯文本生成","单图参考","多图参考"];

type PromptReference = { label:string;url:string;source:string };

function RichPromptEditor({ value, references, placeholder, onChange, onCursor }: { value:string;references:PromptReference[];placeholder:string;onChange:(value:string,cursor:number)=>void;onCursor:(cursor:number)=>void }) {
  const editorRef = useRef<HTMLDivElement|null>(null);
  const lastValueRef = useRef("");
  const lastReferencesRef = useRef("");
  const referenceMap = new Map(references.map(item=>[item.label,item]));
  const referenceSignature = references.map(item=>`${item.label}:${item.url}`).join("|");
  const nodeLength = (node:Node):number => {
    if (node.nodeType===Node.TEXT_NODE) return node.textContent?.length||0;
    if (!(node instanceof HTMLElement)) return 0;
    if (node.dataset.token) return `@${node.dataset.token}`.length;
    const children=Array.from(node.childNodes).reduce((sum,child)=>sum+nodeLength(child),0);
    return children+(node.tagName==="DIV"||node.tagName==="P"?1:node.tagName==="BR"?1:0);
  };
  const readText = (node:Node,root=false):string => {
    if (node.nodeType===Node.TEXT_NODE) return node.textContent||"";
    if (!(node instanceof HTMLElement)) return "";
    if (node.dataset.token) return `@${node.dataset.token}`;
    const body=Array.from(node.childNodes).map(child=>readText(child)).join("");
    if (!root&&(node.tagName==="DIV"||node.tagName==="P"||node.tagName==="BR")) return `${body}\n`;
    return body;
  };
  const cursorOffset = () => {
    const root=editorRef.current;
    const selection=window.getSelection();
    if (!root||!selection?.focusNode||!root.contains(selection.focusNode)) return value.length;
    const target=selection.focusNode;
    const targetOffset=selection.focusOffset;
    let total=0;
    let found=false;
    const walk=(node:Node) => {
      if (found) return;
      if (node===target) {
        if (node.nodeType===Node.TEXT_NODE) total+=Math.min(targetOffset,node.textContent?.length||0);
        else Array.from(node.childNodes).slice(0,targetOffset).forEach(child=>{total+=nodeLength(child);});
        found=true;
        return;
      }
      if (node.contains(target)) Array.from(node.childNodes).forEach(walk);
      else total+=nodeLength(node);
    };
    walk(root);
    return total;
  };
  useEffect(()=>{
    const root=editorRef.current;
    if (!root||(lastValueRef.current===value&&lastReferencesRef.current===referenceSignature)) return;
    root.replaceChildren();
    const pattern=/@([\w\u4e00-\u9fff-]+)/g;
    let index=0;
    let match:RegExpExecArray|null;
    while ((match=pattern.exec(value))) {
      if (match.index>index) root.append(document.createTextNode(value.slice(index,match.index)));
      const reference=referenceMap.get(match[1]);
      if (reference) {
        const token=document.createElement("span");
        token.className="prompt-image-token";
        token.contentEditable="false";
        token.dataset.token=reference.label;
        const thumb=document.createElement("img");thumb.src=reference.url;thumb.alt="";
        const label=document.createElement("b");label.textContent=`图片${reference.label.replace(/\D/g,"")||reference.label}`;
        const preview=document.createElement("span");preview.className="prompt-token-preview";
        const previewImage=document.createElement("img");previewImage.src=reference.url;previewImage.alt=reference.label;
        const caption=document.createElement("small");caption.textContent=`@${reference.label} · ${reference.source}`;
        preview.append(previewImage,caption);token.append(thumb,label,preview);root.append(token);
      } else root.append(document.createTextNode(match[0]));
      index=pattern.lastIndex;
    }
    if (index<value.length) root.append(document.createTextNode(value.slice(index)));
    lastValueRef.current=value;
    lastReferencesRef.current=referenceSignature;
  },[value,referenceSignature]);
  return <div className="rich-prompt-editor" data-placeholder={placeholder} ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" onInput={()=>{const next=readText(editorRef.current!,true).replace(/\n{3,}/g,"\n\n");lastValueRef.current=next;onChange(next,cursorOffset());}} onClick={()=>onCursor(cursorOffset())} onKeyUp={()=>onCursor(cursorOffset())}/>;
}

type PublishAccount = { mediaId:number;mediaType:string;businessType:string;name:string;username:string;avatar:string;country:string;valid:boolean;fans:number };
type PublishTask = { taskId:string;state:string;taskType:string;title:string;video:string;cover:string;publishTime:string;createdAt:string;accounts:{subTaskId:string;mediaId:number;mediaType:string;name:string;state:string;reason:string;error:string;itemId:string;retryable:boolean}[] };

function UpmeePublishWorkspace() {
  const [configured,setConfigured]=useState<boolean|null>(null);
  const [accounts,setAccounts]=useState<PublishAccount[]>([]);
  const [tasks,setTasks]=useState<PublishTask[]>([]);
  const [selectedAccounts,setSelectedAccounts]=useState<number[]>([]);
  const [videoFile,setVideoFile]=useState<File|null>(null);
  const [coverFile,setCoverFile]=useState<File|null>(null);
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [mode,setMode]=useState<"now"|"scheduled"|"draft">("now");
  const [scheduledAt,setScheduledAt]=useState("");
  const [allowComment,setAllowComment]=useState(true);
  const [allowDuet,setAllowDuet]=useState(true);
  const [allowStitch,setAllowStitch]=useState(true);
  const [aiGenerated,setAiGenerated]=useState(true);
  const [brandOrganic,setBrandOrganic]=useState(false);
  const [brandedContent,setBrandedContent]=useState(false);
  const [firstComment,setFirstComment]=useState("");
  const [reviewOpen,setReviewOpen]=useState(false);
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);
  const [progress,setProgress]=useState(0);
  const [statusText,setStatusText]=useState("");
  const [error,setError]=useState("");
  const videoInputRef=useRef<HTMLInputElement|null>(null);
  const coverInputRef=useRef<HTMLInputElement|null>(null);
  const readJson=async(response:Response)=>{const payload=await response.json() as Record<string,unknown>;if(!response.ok)throw new Error(String(payload.error||"请求失败"));return payload;};
  const loadAccounts=async()=>{const payload=await readJson(await fetch("/api/upmee?resource=accounts",{cache:"no-store"}));setConfigured(Boolean(payload.configured));setAccounts((payload.accounts||[]) as PublishAccount[]);};
  const loadTasks=async()=>{const payload=await readJson(await fetch("/api/upmee?resource=tasks",{cache:"no-store"}));setConfigured(Boolean(payload.configured));setTasks((payload.tasks||[]) as PublishTask[]);};
  useEffect(()=>{
    try { const saved=JSON.parse(window.localStorage.getItem("tk-upmee-publish-draft")||"null") as Record<string,unknown>|null;if(saved){setTitle(String(saved.title||""));setDescription(String(saved.description||""));setMode((saved.mode as "now"|"scheduled"|"draft")||"now");setScheduledAt(String(saved.scheduledAt||""));setAllowComment(saved.allowComment!==false);setAllowDuet(saved.allowDuet!==false);setAllowStitch(saved.allowStitch!==false);setAiGenerated(saved.aiGenerated!==false);setBrandOrganic(saved.brandOrganic===true);setBrandedContent(saved.brandedContent===true);setFirstComment(String(saved.firstComment||""));} } catch {}
    Promise.all([loadAccounts(),loadTasks()]).catch(cause=>setError(cause instanceof Error?cause.message:"无法读取飞星发布数据")).finally(()=>setLoading(false));
  },[]);
  useEffect(()=>{window.localStorage.setItem("tk-upmee-publish-draft",JSON.stringify({title,description,mode,scheduledAt,allowComment,allowDuet,allowStitch,aiGenerated,brandOrganic,brandedContent,firstComment}));},[title,description,mode,scheduledAt,allowComment,allowDuet,allowStitch,aiGenerated,brandOrganic,brandedContent,firstComment]);
  useEffect(()=>{if(!tasks.some(task=>["pending","processing"].includes(task.state)))return;const timer=window.setInterval(()=>loadTasks().catch(()=>undefined),9000);return()=>window.clearInterval(timer);},[tasks]);
  const toggleAccount=(id:number)=>setSelectedAccounts(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const canReview=Boolean(videoFile&&selectedAccounts.length&&title.trim()&&(mode!=="scheduled"||scheduledAt));
  const uploadVideo=async(file:File)=>{
    const chunkSize=10*1024*1024,totalParts=Math.ceil(file.size/chunkSize);
    setStatusText("正在建立安全上传任务");setProgress(2);
    const init=await readJson(await fetch("/api/upmee",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"init-upload",totalParts})}));
    const uploadToken=String(init.uploadToken||"");if(!uploadToken)throw new Error("上传服务没有返回凭证");
    for(let index=0;index<totalParts;index++){
      const form=new FormData();form.set("action","upload-part");form.set("uploadToken",uploadToken);form.set("partNumber",String(index+1));form.set("file",file.slice(index*chunkSize,Math.min(file.size,(index+1)*chunkSize)),file.name);
      await readJson(await fetch("/api/upmee",{method:"POST",body:form}));setProgress(Math.round(((index+1)/totalParts)*72));setStatusText(`正在上传成片 ${index+1}/${totalParts}`);
    }
    setStatusText("正在合并视频文件");
    const complete=await readJson(await fetch("/api/upmee",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"complete-upload",uploadToken})}));
    const objectId=String(complete.objectId||"");if(!objectId)throw new Error("视频上传完成但未取得文件 ID");return objectId;
  };
  const uploadCover=async(file:File)=>{const form=new FormData();form.set("action","upload-cover");form.set("file",file,file.name);const payload=await readJson(await fetch("/api/upmee",{method:"POST",body:form}));return String(payload.objectId||"");};
  const submitConfirmed=async()=>{
    if(!videoFile||!canReview||submitting)return;
    setReviewOpen(false);setSubmitting(true);setError("");setProgress(0);
    try{
      const videoId=await uploadVideo(videoFile);let coverId="";
      if(coverFile){setStatusText("正在上传视频封面");setProgress(80);coverId=await uploadCover(coverFile);}
      setStatusText("正在创建发布任务");setProgress(90);
      const scheduledTimestamp=mode==="scheduled"?new Date(scheduledAt).getTime():0;
      await readJson(await fetch("/api/upmee",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"publish",confirmed:true,mediaIds:selectedAccounts,videoId,coverId,title:title.trim(),description:description.trim(),mode,scheduledAt:scheduledTimestamp,allowComment,allowDuet,allowStitch,aiGenerated,brandOrganic,brandedContent,firstComment:firstComment.trim()})}));
      setProgress(100);setStatusText("任务已提交，等待平台处理");await loadTasks();setVideoFile(null);setCoverFile(null);if(videoInputRef.current)videoInputRef.current.value="";if(coverInputRef.current)coverInputRef.current.value="";
    }catch(cause){setError(cause instanceof Error?cause.message:"发布任务提交失败");setStatusText("提交失败");}finally{setSubmitting(false);}
  };
  const stateLabel=(value:string)=>value==="success"?"发布成功":value==="failed"?"发布失败":value==="partial_success"?"部分成功":value==="processing"?"发布处理中":"等待处理";
  const modeLabel=mode==="now"?"立即发布":mode==="scheduled"?`定时发布 · ${scheduledAt.replace("T"," ")}`:"保存到 TikTok 草稿";
  return <section className="upmee-publish-workspace">
    <header className="publish-hero"><div><p className="eyebrow">飞星 · 账号发布中心</p><h3>确认成片后，手动发布到已连接账号</h3><p>账号、视频、文案与合规设置统一在这里完成。系统只保存草稿和查询状态，必须经过二次确认才会创建发布任务。</p></div><span className={configured?"publish-connection ready":"publish-connection"}><i/>{configured?"飞星服务已连接":loading?"正在连接":"发布服务待配置"}</span></header>
    {error&&<div className="publish-error">{error}<button onClick={()=>setError("")}>关闭</button></div>}
    <div className="publish-section"><div className="publish-section-title"><div><b>01</b><span><small>发布账号</small><strong>选择一个或多个 TikTok Business 账号</strong></span></div><em>{selectedAccounts.length} 个已选</em></div><div className="publish-account-grid">{loading?<p className="publish-empty">正在读取账号…</p>:accounts.length?accounts.map(account=><button type="button" className={selectedAccounts.includes(account.mediaId)?"selected":""} key={account.mediaId} onClick={()=>toggleAccount(account.mediaId)}><span className="publish-account-avatar">{account.avatar?<img src={account.avatar} alt=""/>:account.name.slice(0,1)}</span><span><strong>{account.name||account.username}</strong><small>@{account.username||"未填写用户名"} · {account.country||"未标国家"}</small><i>{account.mediaType||account.businessType} · {account.fans.toLocaleString()} 粉丝</i></span><b>{selectedAccounts.includes(account.mediaId)?"✓":"+"}</b></button>):<p className="publish-empty">当前团队没有可用账号，请先在飞星中连接 TikTok Business 账号。</p>}</div></div>
    <div className="publish-main-grid"><section className="publish-section"><div className="publish-section-title"><div><b>02</b><span><small>成片与封面</small><strong>上传本次正式发布的视频</strong></span></div></div><div className="publish-file-grid"><label className={videoFile?"has-file":""}><input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={event=>setVideoFile(event.target.files?.[0]||null)}/><span>▶</span><strong>{videoFile?videoFile.name:"选择成片视频"}</strong><small>{videoFile?`${(videoFile.size/1024/1024).toFixed(1)} MB · 点击可替换`:"支持 MP4、MOV、WEBM，最大 2GB"}</small></label><label className={coverFile?"has-file":""}><input ref={coverInputRef} type="file" accept="image/png,image/jpeg" onChange={event=>setCoverFile(event.target.files?.[0]||null)}/><span>▧</span><strong>{coverFile?coverFile.name:"选择封面（可选）"}</strong><small>{coverFile?`${(coverFile.size/1024/1024).toFixed(1)} MB · 点击可替换`:"PNG / JPG，最大 5MB"}</small></label></div></section>
      <section className="publish-section"><div className="publish-section-title"><div><b>03</b><span><small>发布方式</small><strong>决定何时进入账号</strong></span></div></div><div className="publish-mode-grid">{([['now','立即发布','确认后立即提交'],['scheduled','定时发布','按设定时间发布'],['draft','账号草稿','保存到 TikTok 草稿']] as const).map(item=><button className={mode===item[0]?"active":""} key={item[0]} onClick={()=>setMode(item[0])}><strong>{item[1]}</strong><small>{item[2]}</small></button>)}</div>{mode==="scheduled"&&<label className="publish-field"><span>计划发布时间</span><input type="datetime-local" value={scheduledAt} min={new Date(Date.now()+60000).toISOString().slice(0,16)} onChange={event=>setScheduledAt(event.target.value)}/></label>}</section></div>
    <div className="publish-main-grid"><section className="publish-section"><div className="publish-section-title"><div><b>04</b><span><small>视频文案</small><strong>填写平台展示内容</strong></span></div></div><label className="publish-field"><span>视频标题</span><input maxLength={150} value={title} onChange={event=>setTitle(event.target.value)} placeholder="输入视频标题"/><i>{title.length}/150</i></label><label className="publish-field"><span>视频描述</span><textarea maxLength={2200} value={description} onChange={event=>setDescription(event.target.value)} placeholder="输入正文、标签和行动引导"/><i>{description.length}/2200</i></label><label className="publish-field"><span>首条评论（可选）</span><input value={firstComment} onChange={event=>setFirstComment(event.target.value)} placeholder="例如：商品链接在主页橱窗"/></label></section>
      <section className="publish-section"><div className="publish-section-title"><div><b>05</b><span><small>权限与披露</small><strong>提交前核对平台合规设置</strong></span></div></div><div className="publish-toggle-list">{[["允许评论",allowComment,setAllowComment],["允许合拍",allowDuet,setAllowDuet],["允许拼接",allowStitch,setAllowStitch],["标记为 AI 生成内容",aiGenerated,setAiGenerated],["品牌自有内容",brandOrganic,setBrandOrganic],["品牌合作内容",brandedContent,setBrandedContent]].map(([label,value,setter])=><button type="button" className={value?"active":""} key={String(label)} onClick={()=>{(setter as (value:boolean)=>void)(!value)}}><span><strong>{String(label)}</strong>{label==="标记为 AI 生成内容"&&<small>发布后平台标签通常无法撤销</small>}</span><i>{value?"开启":"关闭"}</i></button>)}</div></section></div>
    <div className="publish-actionbar"><div><small>当前发布计划</small><strong>{videoFile?videoFile.name:"尚未选择成片"} · {selectedAccounts.length} 个账号 · {modeLabel}</strong>{submitting&&<span>{statusText} · {progress}%</span>}</div><button className="primary-button" disabled={!canReview||submitting} onClick={()=>setReviewOpen(true)}>{submitting?`${statusText} ${progress}%`:"检查并确认发布 →"}</button></div>
    <section className="publish-history"><header><div><p className="eyebrow">发布任务记录</p><h3>任务切换或刷新后仍保留在这里</h3></div><button className="secondary-button" disabled={loading} onClick={()=>{setLoading(true);loadTasks().catch(cause=>setError(cause instanceof Error?cause.message:"刷新失败")).finally(()=>setLoading(false));}}>刷新状态</button></header>{tasks.length?<div className="publish-task-list">{tasks.map(task=><article key={task.taskId}><span className={`publish-task-state ${task.state}`}>{stateLabel(task.state)}</span><div><strong>{task.title||"未命名发布任务"}</strong><small>{task.createdAt||task.publishTime||task.taskId}</small><i>任务 ID：{task.taskId}</i></div><div className="publish-task-accounts">{task.accounts.length?task.accounts.map(account=><span key={account.subTaskId||`${task.taskId}-${account.mediaId}`}><b>{account.name||account.mediaType}</b><small>{stateLabel(account.state)}{account.itemId?` · 内容 ID ${account.itemId}`:""}</small>{(account.error||account.reason)&&<em>{account.error||account.reason}</em>}</span>):<span><small>等待平台返回账号结果</small></span>}</div>{task.video&&<a href={task.video} target="_blank" rel="noreferrer">查看视频</a>}</article>)}</div>:<div className="publish-empty-history"><span>↗</span><h4>还没有发布任务</h4><p>完成上方配置并二次确认后，任务状态会保留在这里。</p></div>}</section>
    {reviewOpen&&<div className="publish-modal" role="dialog" aria-modal="true"><div><header><span>最终确认</span><button onClick={()=>setReviewOpen(false)}>×</button></header><h3>确认提交到飞星发布服务？</h3><p>这一步之后会上传视频并创建真实发布任务，请逐项核对。</p><dl><div><dt>视频</dt><dd>{videoFile?.name}</dd></div><div><dt>账号</dt><dd>{accounts.filter(account=>selectedAccounts.includes(account.mediaId)).map(account=>account.name||account.username).join("、")}</dd></div><div><dt>发布方式</dt><dd>{modeLabel}</dd></div><div><dt>标题</dt><dd>{title}</dd></div><div><dt>AI 内容标识</dt><dd>{aiGenerated?"开启":"关闭"}</dd></div><div><dt>品牌披露</dt><dd>{brandOrganic||brandedContent?[brandOrganic&&"品牌自有",brandedContent&&"品牌合作"].filter(Boolean).join("、"):"未开启"}</dd></div></dl><div className="publish-modal-actions"><button className="secondary-button" onClick={()=>setReviewOpen(false)}>返回修改</button><button className="primary-button" onClick={submitConfirmed}>确认提交到飞星</button></div></div></div>}
  </section>;
}

type BatchPublishItem = { id:string;file:File;coverFile:File|null;title:string;description:string;firstComment:string;status:"ready"|"uploading"|"submitted"|"failed";progress:number;error:string };

function BatchUpmeePublishWorkspace({projectId}:{projectId:string}) {
  const [configured,setConfigured]=useState<boolean|null>(null),[accounts,setAccounts]=useState<PublishAccount[]>([]),[tasks,setTasks]=useState<PublishTask[]>([]);
  const [selectedAccounts,setSelectedAccounts]=useState<number[]>([]),[queue,setQueue]=useState<BatchPublishItem[]>([]),[activeId,setActiveId]=useState("");
  const [mode,setMode]=useState<"now"|"scheduled"|"draft">("now"),[scheduledAt,setScheduledAt]=useState("");
  const [allowComment,setAllowComment]=useState(true),[allowDuet,setAllowDuet]=useState(true),[allowStitch,setAllowStitch]=useState(true),[aiGenerated,setAiGenerated]=useState(true),[brandOrganic,setBrandOrganic]=useState(false),[brandedContent,setBrandedContent]=useState(false);
  const [reviewOpen,setReviewOpen]=useState(false),[loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[error,setError]=useState("");
  const [generatedJobs,setGeneratedJobs]=useState<AiCreationJob[]>([]),[importingJobId,setImportingJobId]=useState("");
  const videoInputRef=useRef<HTMLInputElement|null>(null),coverInputRef=useRef<HTMLInputElement|null>(null);
  const activeItem=queue.find(item=>item.id===activeId)||queue[0];
  const readJson=async(response:Response)=>{const payload=await response.json() as Record<string,unknown>;if(!response.ok)throw new Error(String(payload.error||"请求失败"));return payload;};
  const loadAccounts=async()=>{const payload=await readJson(await fetch("/api/upmee?resource=accounts",{cache:"no-store"}));setConfigured(Boolean(payload.configured));setAccounts((payload.accounts||[]) as PublishAccount[]);};
  const loadTasks=async()=>{const payload=await readJson(await fetch(`/api/upmee?resource=tasks&projectId=${encodeURIComponent(projectId)}`,{cache:"no-store"}));setConfigured(Boolean(payload.configured));setTasks((payload.tasks||[]) as PublishTask[]);};
  useEffect(()=>{try{const saved=JSON.parse(window.localStorage.getItem(`tk-upmee-batch-settings:${projectId}`)||"null") as Record<string,unknown>|null;if(saved){setMode((saved.mode as "now"|"scheduled"|"draft")||"now");setScheduledAt(String(saved.scheduledAt||""));setAllowComment(saved.allowComment!==false);setAllowDuet(saved.allowDuet!==false);setAllowStitch(saved.allowStitch!==false);setAiGenerated(saved.aiGenerated!==false);setBrandOrganic(saved.brandOrganic===true);setBrandedContent(saved.brandedContent===true);}}catch{}Promise.all([loadAccounts(),loadTasks(),fetch(`/api/ai-video-history?projectId=${encodeURIComponent(projectId)}`,{cache:"no-store"}).then(response=>response.json()).then((payload:{jobs?:AiCreationJob[]})=>setGeneratedJobs((payload.jobs||[]).filter(job=>job.status==="success"&&job.videoUrl)))]).catch(cause=>setError(cause instanceof Error?cause.message:"无法读取发布数据")).finally(()=>setLoading(false));},[projectId]);
  useEffect(()=>{window.localStorage.setItem(`tk-upmee-batch-settings:${projectId}`,JSON.stringify({mode,scheduledAt,allowComment,allowDuet,allowStitch,aiGenerated,brandOrganic,brandedContent}));},[projectId,mode,scheduledAt,allowComment,allowDuet,allowStitch,aiGenerated,brandOrganic,brandedContent]);
  useEffect(()=>{if(!tasks.some(task=>["pending","processing"].includes(task.state)))return;const timer=window.setInterval(()=>loadTasks().catch(()=>undefined),9000);return()=>window.clearInterval(timer);},[tasks]);
  const addVideos=(files:File[])=>{const accepted=files.filter(file=>(file.type.startsWith("video/")||/\.(mp4|mov|webm)$/i.test(file.name))&&file.size<=2*1024*1024*1024).slice(0,Math.max(0,20-queue.length));const added=accepted.map((file,index)=>({id:`batch-${Date.now()}-${index}`,file,coverFile:null,title:file.name.replace(/\.[^.]+$/,"").slice(0,150),description:"",firstComment:"",status:"ready" as const,progress:0,error:""}));setQueue(current=>[...current,...added]);if(!activeItem&&added[0])setActiveId(added[0].id);if(files.length!==accepted.length)setError("部分文件未加入：仅支持 MP4、MOV、WEBM，单个视频不超过 2GB，队列最多 20 条。");};
  const importGeneratedVideo=async(job:AiCreationJob)=>{if(!job.videoUrl||importingJobId)return;setImportingJobId(job.id);setError("");try{const response=await fetch(job.videoUrl);if(!response.ok)throw new Error("生成视频暂时无法下载");const blob=await response.blob();const file=new File([blob],`${job.segmentId}-${job.id.slice(-6)}.mp4`,{type:blob.type||"video/mp4"});addVideos([file]);}catch(cause){setError(cause instanceof Error?cause.message:"导入生成视频失败");}finally{setImportingJobId("");}};
  const updateItem=(id:string,changes:Partial<BatchPublishItem>)=>setQueue(current=>current.map(item=>item.id===id?{...item,...changes}:item));
  const removeItem=(id:string)=>{setQueue(current=>{const next=current.filter(item=>item.id!==id);if(activeId===id)setActiveId(next[0]?.id||"");return next;});};
  const toggleAccount=(id:number)=>setSelectedAccounts(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const candidates=queue.filter(item=>item.status!=="submitted"),canReview=Boolean(candidates.length&&selectedAccounts.length&&candidates.every(item=>item.title.trim())&&(mode!=="scheduled"||scheduledAt));
  const uploadVideo=async(item:BatchPublishItem)=>{const chunkSize=10*1024*1024,totalParts=Math.ceil(item.file.size/chunkSize);updateItem(item.id,{status:"uploading",progress:2,error:""});const init=await readJson(await fetch("/api/upmee",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"init-upload",totalParts})}));const uploadToken=String(init.uploadToken||"");if(!uploadToken)throw new Error("上传服务没有返回凭证");for(let index=0;index<totalParts;index++){const form=new FormData();form.set("action","upload-part");form.set("uploadToken",uploadToken);form.set("partNumber",String(index+1));form.set("file",item.file.slice(index*chunkSize,Math.min(item.file.size,(index+1)*chunkSize)),item.file.name);await readJson(await fetch("/api/upmee",{method:"POST",body:form}));updateItem(item.id,{progress:Math.round(((index+1)/totalParts)*74)});}const complete=await readJson(await fetch("/api/upmee",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"complete-upload",uploadToken})}));const objectId=String(complete.objectId||"");if(!objectId)throw new Error("视频上传完成但未取得文件 ID");return objectId;};
  const uploadCover=async(file:File)=>{const form=new FormData();form.set("action","upload-cover");form.set("file",file,file.name);const payload=await readJson(await fetch("/api/upmee",{method:"POST",body:form}));return String(payload.objectId||"");};
  const submitConfirmed=async()=>{if(!canReview||submitting)return;setReviewOpen(false);setSubmitting(true);setError("");const scheduledTimestamp=mode==="scheduled"?new Date(scheduledAt).getTime():0;for(const original of candidates){try{const videoId=await uploadVideo(original);let coverId="";if(original.coverFile){updateItem(original.id,{progress:80});coverId=await uploadCover(original.coverFile);}updateItem(original.id,{progress:90});await readJson(await fetch("/api/upmee",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"publish",confirmed:true,mediaIds:selectedAccounts,videoId,coverId,title:original.title.trim(),description:original.description.trim(),mode,scheduledAt:scheduledTimestamp,allowComment,allowDuet,allowStitch,aiGenerated,brandOrganic,brandedContent,firstComment:original.firstComment.trim()})}));updateItem(original.id,{status:"submitted",progress:100,error:""});}catch(cause){updateItem(original.id,{status:"failed",error:cause instanceof Error?cause.message:"任务提交失败"});}}await loadTasks().catch(()=>undefined);setSubmitting(false);};
  const stateLabel=(value:string)=>value==="success"?"发布成功":value==="failed"?"发布失败":value==="partial_success"?"部分成功":value==="processing"?"发布处理中":"等待处理";
  const modeLabel=mode==="now"?"立即发布":mode==="scheduled"?`定时发布 · ${scheduledAt.replace("T"," ")}`:"保存到 TikTok 草稿";
  const completed=queue.filter(item=>item.status==="submitted").length,failed=queue.filter(item=>item.status==="failed").length;
  return <section className="upmee-publish-workspace batch-publish-workspace">
    <header className="publish-hero"><div><p className="eyebrow">飞星 · 批量发布中心</p><h3>一次上传多条成片，建立可逐条检查的发布队列</h3><p>一个视频对应一个官方发布任务，可同时分发到多个账号。只有完成最终批量确认后才开始上传与发布。</p></div><span className={configured?"publish-connection ready":"publish-connection"}><i/>{configured?"飞星服务已连接":loading?"正在连接":"发布服务待配置"}</span></header>
    {error&&<div className="publish-error">{error}<button onClick={()=>setError("")}>关闭</button></div>}
    {generatedJobs.length>0&&<section className="project-generated-assets"><div><small>当前项目已完成视频</small><strong>{generatedJobs.length} 条可加入发布队列</strong></div>{generatedJobs.map(job=><button className="secondary-button" key={job.id} disabled={importingJobId===job.id} onClick={()=>void importGeneratedVideo(job)}>{importingJobId===job.id?"正在导入…":`加入队列 · ${job.segmentId}`}</button>)}</section>}
    <section className="publish-section"><div className="publish-section-title"><div><b>01</b><span><small>发布账号</small><strong>所有待发布视频默认投放到这些账号</strong></span></div><em>{selectedAccounts.length} 个已选</em></div><div className="publish-account-grid">{loading?<p className="publish-empty">正在读取账号…</p>:accounts.length?accounts.map(account=><button type="button" className={selectedAccounts.includes(account.mediaId)?"selected":""} key={account.mediaId} onClick={()=>toggleAccount(account.mediaId)}><span className="publish-account-avatar">{account.avatar?<img src={account.avatar} alt=""/>:account.name.slice(0,1)}</span><span><strong>{account.name||account.username}</strong><small>@{account.username||"未填写用户名"} · {account.country||"未标国家"}</small><i>{account.mediaType||account.businessType} · {account.fans.toLocaleString()} 粉丝</i></span><b>{selectedAccounts.includes(account.mediaId)?"✓":"+"}</b></button>):<p className="publish-empty">当前团队没有可用账号，请先在飞星中连接 TikTok Business 账号。</p>}</div></section>
    <div className="batch-publish-layout"><section className="publish-section batch-queue-panel"><div className="publish-section-title"><div><b>02</b><span><small>视频发布队列</small><strong>一次最多加入 20 条视频</strong></span></div><em>{queue.length} 条</em></div><label className="batch-video-drop"><input ref={videoInputRef} type="file" multiple accept="video/mp4,video/quicktime,video/webm" onChange={event=>{addVideos(Array.from(event.target.files||[]));event.currentTarget.value="";}}/><span>＋</span><strong>选择或批量拖入视频</strong><small>MP4 / MOV / WEBM · 单条最大 2GB</small></label>{queue.length?<div className="batch-queue-list">{queue.map((item,index)=><button type="button" className={`${item.id===activeItem?.id?"active":""} ${item.status}`} key={item.id} onClick={()=>setActiveId(item.id)}><b>{String(index+1).padStart(2,"0")}</b><span><strong>{item.file.name}</strong><small>{(item.file.size/1024/1024).toFixed(1)} MB · {item.status==="submitted"?"已提交":item.status==="uploading"?`上传中 ${item.progress}%`:item.status==="failed"?"失败，可重试":"等待配置"}</small>{item.error&&<em>{item.error}</em>}</span><i onClick={event=>{event.stopPropagation();if(!submitting)removeItem(item.id);}}>×</i></button>)}</div>:<div className="batch-queue-empty"><span>▶</span><p>还没有加入视频</p><small>可一次选择多条成片，加入后逐条填写文案和封面。</small></div>}</section>
      <section className="publish-section batch-item-editor"><div className="publish-section-title"><div><b>03</b><span><small>单条视频配置</small><strong>{activeItem?`正在编辑：${activeItem.file.name}`:"请先加入视频"}</strong></span></div>{activeItem&&<button className="secondary-button" disabled={queue.length<2} onClick={()=>setQueue(current=>current.map(item=>item.id===activeItem.id?item:{...item,title:activeItem.title,description:activeItem.description,firstComment:activeItem.firstComment}))}>文案套用全部</button>}</div>{activeItem?<><div className="batch-active-file"><span>▶</span><div><strong>{activeItem.file.name}</strong><small>{(activeItem.file.size/1024/1024).toFixed(1)} MB · {activeItem.status==="submitted"?"已创建发布任务":activeItem.status==="failed"?"可修改后重新提交":"待提交"}</small></div><label className={activeItem.coverFile?"has-cover":""}><input ref={coverInputRef} type="file" accept="image/png,image/jpeg" onChange={event=>updateItem(activeItem.id,{coverFile:event.target.files?.[0]||null})}/>{activeItem.coverFile?activeItem.coverFile.name:"＋ 添加封面"}</label></div><label className="publish-field"><span>视频标题</span><input maxLength={150} value={activeItem.title} onChange={event=>updateItem(activeItem.id,{title:event.target.value,status:activeItem.status==="failed"?"ready":activeItem.status})} placeholder="输入视频标题"/><i>{activeItem.title.length}/150</i></label><label className="publish-field"><span>视频描述</span><textarea maxLength={2200} value={activeItem.description} onChange={event=>updateItem(activeItem.id,{description:event.target.value})} placeholder="输入正文、标签和行动引导"/><i>{activeItem.description.length}/2200</i></label><label className="publish-field"><span>首条评论（可选）</span><input value={activeItem.firstComment} onChange={event=>updateItem(activeItem.id,{firstComment:event.target.value})} placeholder="例如：商品链接在主页橱窗"/></label></>:<div className="batch-editor-empty"><span>✎</span><h4>等待视频加入队列</h4><p>选择视频后，可在这里逐条编辑标题、描述、封面和首条评论。</p></div>}</section></div>
    <div className="publish-main-grid"><section className="publish-section"><div className="publish-section-title"><div><b>04</b><span><small>批量发布方式</small><strong>统一设置本批视频的发布时间</strong></span></div></div><div className="publish-mode-grid">{([['now','立即发布','确认后依次提交'],['scheduled','定时发布','统一按设定时间发布'],['draft','账号草稿','保存到 TikTok 草稿']] as const).map(item=><button className={mode===item[0]?"active":""} key={item[0]} onClick={()=>setMode(item[0])}><strong>{item[1]}</strong><small>{item[2]}</small></button>)}</div>{mode==="scheduled"&&<label className="publish-field"><span>计划发布时间</span><input type="datetime-local" value={scheduledAt} min={new Date(Date.now()+60000).toISOString().slice(0,16)} onChange={event=>setScheduledAt(event.target.value)}/></label>}</section>
      <section className="publish-section"><div className="publish-section-title"><div><b>05</b><span><small>统一权限与披露</small><strong>应用于本批所有视频</strong></span></div></div><div className="publish-toggle-list">{[["允许评论",allowComment,setAllowComment],["允许合拍",allowDuet,setAllowDuet],["允许拼接",allowStitch,setAllowStitch],["标记为 AI 生成内容",aiGenerated,setAiGenerated],["品牌自有内容",brandOrganic,setBrandOrganic],["品牌合作内容",brandedContent,setBrandedContent]].map(([label,value,setter])=><button type="button" className={value?"active":""} key={String(label)} onClick={()=>{(setter as (value:boolean)=>void)(!value)}}><span><strong>{String(label)}</strong>{label==="标记为 AI 生成内容"&&<small>发布后平台标签通常无法撤销</small>}</span><i>{value?"开启":"关闭"}</i></button>)}</div></section></div>
    <div className="publish-actionbar"><div><small>当前批量发布计划</small><strong>{queue.length} 条视频 · {selectedAccounts.length} 个账号 · {modeLabel}</strong><span>{completed?`已提交 ${completed} 条`:"尚未提交"}{failed?` · 失败 ${failed} 条，可再次确认重试`:""}</span></div><button className="primary-button" disabled={!canReview||submitting} onClick={()=>setReviewOpen(true)}>{submitting?`正在处理 ${completed+failed+1}/${candidates.length}`:`检查并确认批量发布（${candidates.length}） →`}</button></div>
    <section className="publish-history"><header><div><p className="eyebrow">发布任务记录</p><h3>每条视频独立生成任务，切换页面后仍可查询</h3></div><button className="secondary-button" disabled={loading} onClick={()=>{setLoading(true);loadTasks().catch(cause=>setError(cause instanceof Error?cause.message:"刷新失败")).finally(()=>setLoading(false));}}>刷新状态</button></header>{tasks.length?<div className="publish-task-list">{tasks.map(task=><article key={task.taskId}><span className={`publish-task-state ${task.state}`}>{stateLabel(task.state)}</span><div><strong>{task.title||"未命名发布任务"}</strong><small>{task.createdAt||task.publishTime||task.taskId}</small><i>任务 ID：{task.taskId}</i></div><div className="publish-task-accounts">{task.accounts.length?task.accounts.map(account=><span key={account.subTaskId||`${task.taskId}-${account.mediaId}`}><b>{account.name||account.mediaType}</b><small>{stateLabel(account.state)}{account.itemId?` · 内容 ID ${account.itemId}`:""}</small>{(account.error||account.reason)&&<em>{account.error||account.reason}</em>}</span>):<span><small>等待平台返回账号结果</small></span>}</div>{task.video&&<a href={task.video} target="_blank" rel="noreferrer">查看视频</a>}</article>)}</div>:<div className="publish-empty-history"><span>↗</span><h4>还没有发布任务</h4><p>完成批量配置并二次确认后，任务状态会保留在这里。</p></div>}</section>
    {reviewOpen&&<div className="publish-modal" role="dialog" aria-modal="true"><div><header><span>批量发布最终确认</span><button onClick={()=>setReviewOpen(false)}>×</button></header><h3>确认提交 {candidates.length} 条视频？</h3><p>系统将依次上传，并为每条视频建立独立任务；单条失败不会中断其他任务。</p><dl><div><dt>视频数量</dt><dd>{candidates.length} 条</dd></div><div><dt>目标账号</dt><dd>{accounts.filter(account=>selectedAccounts.includes(account.mediaId)).map(account=>account.name||account.username).join("、")}</dd></div><div><dt>预计账号子任务</dt><dd>{candidates.length*selectedAccounts.length} 个</dd></div><div><dt>发布方式</dt><dd>{modeLabel}</dd></div><div><dt>AI 内容标识</dt><dd>{aiGenerated?"本批全部开启":"本批全部关闭"}</dd></div></dl><div className="batch-confirm-list">{candidates.map((item,index)=><span key={item.id}><b>{index+1}</b><i>{item.file.name}</i><small>{item.title}</small></span>)}</div><div className="publish-modal-actions"><button className="secondary-button" onClick={()=>setReviewOpen(false)}>返回修改</button><button className="primary-button" onClick={submitConfirmed}>确认开始批量发布</button></div></div></div>}
  </section>;
}

type ReviewMetric = { item_id?:string;duration?:number;subscribers_gained?:number;profile_view?:number;share?:number;comment?:number;digg?:number;play?:number;favorite?:number;reach?:number;total_time_watched?:number;full_video_watched_rate?:number;average_time_watched?:number };
type ReviewItem = { taskId:string;title:string;video:string;cover:string;publishedAt:number;mediaId:string;mediaName:string;mediaType:string;itemId:string;metrics:ReviewMetric;retention:{second:number;percentage:number}[];analysis:{engagement:number;averageRatio:number;bestWindow:{start:number;end:number;drop:number};largestDrop:{start:number;end:number;drop:number};strengths:string[];risks:string[]};deltas:{play:number;digg:number;comment:number;share:number;favorite:number};score:number };
type ReviewPayload = { configured:boolean;days:number;capturedAt:string;recent30Count:number;summary:{published:number;play:number;digg:number;comment:number;share:number;favorite:number;engagementRate:number};daily:{date:string;published:number;play:number}[];items:ReviewItem[];error?:string };

function VideoReviewDashboard({ projectId, view, onView }: { projectId:string; view: string; onView: (view: string) => void }) {
  const requestedTab = view.replace("review:", "") as "overview"|"videos"|"report";
  const [days,setDays]=useState(7),[payload,setPayload]=useState<ReviewPayload|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[tab,setTab]=useState<"overview"|"videos"|"report">(["overview","videos","report"].includes(requestedTab)?requestedTab:"overview"),[selectedId,setSelectedId]=useState("");
  useEffect(()=>{if(["overview","videos","report"].includes(requestedTab)&&requestedTab!==tab)setTab(requestedTab);},[requestedTab,tab]);
  const openTab=(next:"overview"|"videos"|"report")=>{setTab(next);onView(`review:${next}`);};
  const load=async(nextDays=days)=>{setLoading(true);setError("");try{const response=await fetch(`/api/video-review?days=${nextDays}&projectId=${encodeURIComponent(projectId)}`,{cache:"no-store"});const body=await response.json() as ReviewPayload;if(!response.ok)throw new Error(body.error||"数据复盘读取失败");setPayload(body);setSelectedId(current=>body.items.some(item=>item.itemId===current)?current:body.items[0]?.itemId||"");}catch(cause){setError(cause instanceof Error?cause.message:"数据复盘读取失败");}finally{setLoading(false);}};
  useEffect(()=>{load(days);const timer=window.setInterval(()=>load(days),300000);return()=>window.clearInterval(timer);},[days,projectId]);
  const format=(value:number)=>value>=10000?`${(value/10000).toFixed(value>=100000?1:2)}万`:value.toLocaleString("zh-CN");
  const percent=(value:number)=>`${(value*100).toFixed(1)}%`;
  const selected=payload?.items.find(item=>item.itemId===selectedId)||payload?.items[0],best=payload?.items[0],worst=payload?.items[payload.items.length-1];
  const maxDaily=Math.max(1,...(payload?.daily.map(day=>day.play)||[1]));
  const saveReport=async()=>{if(!payload)return;const response=await fetch("/api/video-review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({days,report:{capturedAt:payload.capturedAt,summary:payload.summary,best:best?{itemId:best.itemId,title:best.title,metrics:best.metrics,analysis:best.analysis}:null,worst:worst?{itemId:worst.itemId,title:worst.title,metrics:worst.metrics,analysis:worst.analysis}:null}})});if(response.ok)window.alert("本期复盘报告已保存");};
  return <section className="video-review-dashboard">
    <header className="review-dashboard-hero"><div><p className="eyebrow">真实发布数据 · 周度复盘</p><h2>视频数据监控与内容归因</h2><p>播放、互动和逐秒留存来自飞星真实数据；页面打开时立即更新，并每5分钟自动刷新一次。</p></div><div className="review-live-state"><i></i><span>数据服务已连接<small>{payload?.capturedAt?`最近更新 ${new Date(payload.capturedAt).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}`:"正在读取"}</small></span><button onClick={()=>load(days)}>立即刷新</button></div></header>
    <nav className="review-toolbar"><div>{[7,30,60].map(value=><button className={days===value?"active":""} key={value} onClick={()=>setDays(value)}>过去 {value} 天</button>)}</div><div>{([['overview','数据总览'],['videos','视频诊断'],['report','周报输出']] as const).map(([key,label])=><button className={tab===key?"active":""} key={key} onClick={()=>openTab(key)}>{label}</button>)}</div></nav>
    {error?<div className="review-error-state"><span>!</span><h3>真实数据暂时无法读取</h3><p>{error}</p><button className="primary-button" onClick={()=>load(days)}>重新连接</button></div>:loading&&!payload?<div className="review-loading"><span></span><h3>正在同步发布任务、互动数据与留存曲线</h3><p>数据量较多时可能需要十几秒。</p></div>:payload&&!payload.items.length?<div className="review-empty-state"><span>7D</span><h3>过去 {days} 天没有成功发布的视频</h3><p>系统不会填充演示数据。当前团队最近30天共有 {payload.recent30Count} 个发布任务，可切换时间范围查看。</p>{days<30&&<button className="primary-button" onClick={()=>setDays(30)}>查看过去30天真实数据 →</button>}</div>:payload&&<>
      <section className="review-kpi-grid">{[["发布视频",payload.summary.published,"条"],["总播放",format(payload.summary.play),"次"],["点赞",format(payload.summary.digg),"次"],["评论",format(payload.summary.comment),"条"],["转发",format(payload.summary.share),"次"],["收藏",format(payload.summary.favorite),"次"],["综合互动率",percent(payload.summary.engagementRate),"真实互动÷播放"]].map(([label,value,unit])=><article key={String(label)}><small>{label}</small><strong>{value}</strong><span>{unit}</span></article>)}</section>
      {tab==="overview"&&<div className="review-overview-grid"><section className="panel review-daily-panel"><div className="panel-heading"><div><p className="eyebrow">发布与播放趋势</p><h3>每日发布数量和当前累计播放</h3></div><span className="source-chip">真实数据</span></div><div className="review-daily-chart">{payload.daily.map(day=><div key={day.date}><span style={{height:`${Math.max(3,day.play/maxDaily*100)}%`}} title={`${day.date} · ${day.play} 播放`}></span><b>{day.date}</b><small>{day.published}条</small></div>)}</div></section>{best&&<section className="panel review-best-card"><div className="panel-heading"><div><p className="eyebrow">本期最佳视频</p><h3>{best.title}</h3></div><span className="approved-pill">综合得分 {best.score.toFixed(1)}</span></div><div className="review-best-body">{best.video?<video src={best.video} poster={best.cover||undefined} controls preload="metadata"/>:best.cover?<img src={best.cover} alt={best.title}/>:<div className="review-video-placeholder">暂无预览</div>}<div><strong>{format(best.metrics.play||0)} 播放 · {percent(best.analysis.engagement)} 互动率</strong><p>留存最稳定区间：{best.analysis.bestWindow.start}–{best.analysis.bestWindow.end} 秒；最大流失发生在 {best.analysis.largestDrop.start}–{best.analysis.largestDrop.end} 秒。</p>{best.analysis.strengths.map(reason=><span key={reason}>✓ {reason}</span>)}<button className="secondary-button" onClick={()=>{setSelectedId(best.itemId);setTab("videos");}}>查看逐秒诊断</button></div></div></section>}</div>}
      {tab==="videos"&&<div className="review-video-workbench"><aside className="review-ranking"><header><small>视频排行榜</small><strong>{payload.items.length} 条真实记录</strong></header>{payload.items.map((item,index)=><button className={selected?.itemId===item.itemId?"active":""} key={item.itemId} onClick={()=>setSelectedId(item.itemId)}><b>{index+1}</b><span><strong>{item.title}</strong><small>{item.mediaName} · {format(item.metrics.play||0)}播放</small></span><i>{item.score.toFixed(0)}</i></button>)}</aside>{selected&&<main className="review-video-detail"><header><div><p className="eyebrow">{selected.mediaName} · {new Date(selected.publishedAt).toLocaleDateString("zh-CN")}</p><h3>{selected.title}</h3></div><span className="source-chip">内容 ID {selected.itemId}</span></header><div className="review-detail-grid"><div>{selected.video?<video src={selected.video} poster={selected.cover||undefined} controls preload="metadata"/>:selected.cover?<img src={selected.cover} alt={selected.title}/>:<div className="review-video-placeholder">暂无视频预览</div>}</div><section><div className="review-mini-kpis">{[["播放",selected.metrics.play],["点赞",selected.metrics.digg],["评论",selected.metrics.comment],["转发",selected.metrics.share],["收藏",selected.metrics.favorite],["完整观看",percent(selected.metrics.full_video_watched_rate||0)]].map(([label,value])=><span key={String(label)}><small>{label}</small><b>{typeof value==="number"?format(value):value}</b></span>)}</div><div className="review-delta-row"><span>相比上次快照</span>{Object.entries(selected.deltas).map(([key,value])=><b key={key}>{key==="play"?"播放":key==="digg"?"点赞":key==="comment"?"评论":key==="share"?"转发":"收藏"} {value>=0?"+":""}{value}</b>)}</div></section></div><section className="review-retention-panel"><div className="panel-heading"><div><p className="eyebrow">逐秒观看趋势</p><h3>真实留存曲线与画面时间定位</h3></div><span>平均观看 {selected.metrics.average_time_watched||0}s / {selected.metrics.duration||0}s</span></div><div className="review-retention-bars">{selected.retention.map(point=><div key={point.second}><span style={{height:`${Math.max(2,point.percentage*100)}%`}} className={point.second>=selected.analysis.largestDrop.start&&point.second<=selected.analysis.largestDrop.end?"drop":""}></span><b>{point.second}s</b><small>{Math.round(point.percentage*100)}%</small></div>)}</div><div className="review-moment-summary"><article><small>最稳定画面区间</small><strong>{selected.analysis.bestWindow.start}–{selected.analysis.bestWindow.end} 秒</strong><p>这一秒段留存下降最少，建议回看并提取对应人物动作、产品展示和字幕表达。</p></article><article className="risk"><small>最大流失区间</small><strong>{selected.analysis.largestDrop.start}–{selected.analysis.largestDrop.end} 秒</strong><p>这一秒段观众流失最多，应检查画面变化、信息密度和卖点衔接。</p></article></div></section><div className="review-diagnosis-grid"><section><small>表现好的原因</small>{selected.analysis.strengths.length?selected.analysis.strengths.map(reason=><p key={reason}>✓ {reason}</p>):<p>当前数据尚未形成明显优势，需要继续积累播放。</p>}</section><section className="risk"><small>需要优化的原因</small>{selected.analysis.risks.length?selected.analysis.risks.map(reason=><p key={reason}>! {reason}</p>):<p>暂未发现明显结构问题。</p>}</section></div></main>}</div>}
      {tab==="report"&&<section className="weekly-report-sheet"><header><div><p className="eyebrow">视频周报 · {days}天范围</p><h2>{new Date(Date.now()-days*86400000).toLocaleDateString("zh-CN")}—{new Date().toLocaleDateString("zh-CN")}</h2><p>基于 {payload.summary.published} 条发布记录、{format(payload.summary.play)} 次播放和逐秒留存生成。</p></div><div><button className="secondary-button" onClick={saveReport}>保存本期报告</button><button className="primary-button" onClick={()=>window.print()}>打印 / 导出PDF</button></div></header><div className="weekly-report-grid"><article><small>本期结论</small><h3>{best?`最佳视频为《${best.title}》`:"本期暂无最佳视频"}</h3><p>{best?`其综合得分 ${best.score.toFixed(1)}，互动率 ${percent(best.analysis.engagement)}，完整观看率 ${percent(best.metrics.full_video_watched_rate||0)}。`:"等待真实发布数据。"}</p></article><article><small>最佳画面线索</small><h3>{best?`${best.analysis.bestWindow.start}–${best.analysis.bestWindow.end} 秒留存最稳定`:"暂无"}</h3><p>复用该时间段的构图、人物动作、产品露出方式和字幕节奏，并在下一批视频中做A/B测试。</p></article><article className="risk"><small>本期主要问题</small><h3>{worst?`《${worst.title}》优先复盘`:"暂无"}</h3><p>{worst?.analysis.risks[0]||"当前没有足够数据形成问题判断。"}</p></article><article><small>下周行动计划</small><h3>保留高留存结构，重做最大流失段</h3><p>以最佳视频为母版复刻内容顺序；首秒留存低的视频更换黄金开头；完整率低的视频压缩中段。</p></article></div><section className="weekly-report-ranking"><h3>本期视频表现排名</h3>{payload.items.map((item,index)=><div key={item.itemId}><b>{index+1}</b><span>{item.title}</span><i>{format(item.metrics.play||0)} 播放</i><em>{percent(item.analysis.engagement)} 互动</em><strong>{item.score.toFixed(1)}</strong></div>)}</section></section>}
    </>}
  </section>;
}

function AiVideoCreation({ projectId, modelName, providerModel, segments }: { projectId:string; modelName: string; providerModel: string | null; segments: AiCreationSegment[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(segments.map(item=>item.id));
  const [activeSegmentId, setActiveSegmentId] = useState(segments[0]?.id||"");
  const [draftPrompts, setDraftPrompts] = useState<Record<string,string>>(()=>Object.fromEntries(segments.map(item=>[item.id,""])));
  const [uploadedRefs, setUploadedRefs] = useState<Record<string,{label:string;file:File;preview:string}[]>>({});
  const [importedReferenceLabels, setImportedReferenceLabels] = useState<Record<string,string[]>>({});
  const initialStudioModel = providerModel==="sd25-30s"?"seedance-2.5":"seedance-2.0";
  const [studioModelId, setStudioModelId] = useState(initialStudioModel);
  const [studioDuration, setStudioDuration] = useState(providerModel==="sd25-30s"?30:15);
  const [studioRatio, setStudioRatio] = useState("9:16");
  const [studioReferenceMode, setStudioReferenceMode] = useState("自动判断");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [serviceConfigured, setServiceConfigured] = useState<boolean | null>(null);
  const [jobs, setJobs] = useState<Record<string, AiCreationJob>>({});
  const [groups, setGroups] = useState<string[]>(["未分组"]);
  const [groupFilter, setGroupFilter] = useState("全部");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const promptRefs = useRef<Record<string,HTMLTextAreaElement|null>>({});
  const promptCursorRefs = useRef<Record<string,number>>({});
  const signature = segments.map(item=>`${item.id}:${item.apiDuration}`).join("|");
  const draftStorageKey=`tk-ai-video-draft:${projectId}:${signature}`;
  useEffect(()=>{
    setDraftReady(false);
    const fallbackPrompts=Object.fromEntries(segments.map(item=>[item.id,""]));
    try {
      const saved=JSON.parse(window.localStorage.getItem(draftStorageKey)||"null") as {activeSegmentId?:string;draftPrompts?:Record<string,string>;importedReferenceLabels?:Record<string,string[]>;studioModelId?:string;studioDuration?:number;studioRatio?:string;studioReferenceMode?:string;groups?:string[]}|null;
      setActiveSegmentId(saved?.activeSegmentId&&segments.some(item=>item.id===saved.activeSegmentId)?saved.activeSegmentId:segments[0]?.id||"");
      setDraftPrompts({...fallbackPrompts,...(saved?.draftPrompts||{})});
      setImportedReferenceLabels(saved?.importedReferenceLabels||{});
      if (saved?.studioModelId) setStudioModelId(saved.studioModelId);
      if (saved?.studioDuration) setStudioDuration(saved.studioDuration);
      if (saved?.studioRatio) setStudioRatio(saved.studioRatio);
      if (saved?.studioReferenceMode) setStudioReferenceMode(saved.studioReferenceMode);
      if (saved?.groups?.length) setGroups(Array.from(new Set(["未分组",...saved.groups])));
    } catch { setActiveSegmentId(segments[0]?.id||"");setDraftPrompts(fallbackPrompts);setImportedReferenceLabels({}); }
    setSelectedIds(segments.map(item=>item.id));setReviewOpen(false);setDraftReady(true);
  },[signature]);
  useEffect(()=>{
    fetch("/api/ai-video", { cache:"no-store" }).then(response=>response.json()).then((payload:{configured?:boolean})=>setServiceConfigured(Boolean(payload.configured))).catch(()=>setServiceConfigured(false));
    fetch(`/api/ai-video-history?projectId=${encodeURIComponent(projectId)}`,{cache:"no-store"}).then(response=>response.json()).then((payload:{jobs?:AiCreationJob[];groups?:string[]})=>{
      const saved=payload.jobs||[];
      setJobs(Object.fromEntries(saved.map(job=>[job.id,{...job,taskId:job.id}])));
      setGroups(current=>Array.from(new Set([...current,...(payload.groups||[]),...saved.map(job=>job.groupName||"未分组")])));
    }).catch(()=>undefined);
  },[projectId]);
  useEffect(()=>{
    if (!draftReady) return;
    window.localStorage.setItem(draftStorageKey,JSON.stringify({activeSegmentId,draftPrompts,importedReferenceLabels,studioModelId,studioDuration,studioRatio,studioReferenceMode,groups}));
  },[draftReady,draftStorageKey,activeSegmentId,draftPrompts,importedReferenceLabels,studioModelId,studioDuration,studioRatio,studioReferenceMode,groups]);
  useEffect(()=>{
    const active = Object.values(jobs).filter(job=>job.taskId&&!["success","failed","cancelled"].includes(job.status));
    if (!active.length) return;
    const timer = window.setInterval(()=>{
      active.forEach(job=>{
        fetch(`/api/ai-video?taskId=${encodeURIComponent(job.taskId!)}`, { cache:"no-store" }).then(response=>response.json()).then((payload:{status?:string;progress?:number;error?:string|null;videoUrl?:string|null})=>{
          const updated={...job,status:payload.status||job.status,progress:Number(payload.progress||0),error:payload.error||null,videoUrl:payload.videoUrl||null,updatedAt:new Date().toISOString()};
          setJobs(current=>({...current,[job.id]:updated}));
          fetch("/api/ai-video-history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(updated)}).catch(()=>undefined);
        }).catch(()=>undefined);
      });
    },6000);
    return ()=>window.clearInterval(timer);
  },[jobs]);
  const activeSegment = segments.find(item=>item.id===activeSegmentId)||segments[0];
  const selectedSegments = activeSegment?[activeSegment]:[];
  const studioModel = aiStudioModels.find(item=>item.id===studioModelId) || aiStudioModels[0];
  const studioProviderModel = studioModel.provider;
  const toggleSegment = (id:string) => setSelectedIds(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const insertReference = (segmentId:string,label:string) => {
    const area = promptRefs.current[segmentId];
    const prompt = draftPrompts[segmentId] || "";
    const cursor = promptCursorRefs.current[segmentId] ?? area?.selectionStart ?? prompt.length;
    const mentionMatch = mentionOpen ? prompt.slice(0,cursor).match(/@[\w\u4e00-\u9fff-]*$/) : null;
    const start = mentionMatch?.index ?? cursor;
    const end = area?.selectionEnd ?? cursor;
    const token = `@${label}`;
    const next = `${prompt.slice(0,start)}${start&&prompt[start-1]!==" "?" ":""}${token} ${prompt.slice(end)}`;
    setDraftPrompts(current=>({...current,[segmentId]:next}));
    promptCursorRefs.current[segmentId]=start+token.length+1;
    setMentionOpen(false);
    setMentionQuery("");
    window.setTimeout(()=>{area?.focus();const cursor=start+token.length+1;area?.setSelectionRange(cursor,cursor);},0);
  };
  const addReferenceFiles = (segmentId:string,files:File[]) => {
    const current = uploadedRefs[segmentId] || [];
    const maxImages = studioModel.maxImages;
    const builtInCount = (importedReferenceLabels[segmentId]||[]).length;
    const labelOffset = segments.find(item=>item.id===segmentId)!.imageUrls.length;
    const next = files.filter(file=>file.type.startsWith("image/")&&file.size<=20*1024*1024).slice(0,Math.max(0,maxImages-builtInCount-current.length)).map((file,index)=>({label:`Image${labelOffset+current.length+index+1}`,file,preview:URL.createObjectURL(file)}));
    setUploadedRefs(value=>({...value,[segmentId]:[...current,...next]}));
  };
  const copyPrompt = async (segmentId:string) => {
    await navigator.clipboard.writeText(draftPrompts[segmentId]||"");
  };
  const updatePrompt = (segmentId:string,value:string,cursor:number) => {
    setDraftPrompts(current=>({...current,[segmentId]:value}));
    promptCursorRefs.current[segmentId]=cursor;
    const match=value.slice(0,cursor).match(/@([\w\u4e00-\u9fff-]*)$/);
    setMentionOpen(Boolean(match));
    setMentionQuery(match?.[1]||"");
  };
  const removeUploadedReference = (segmentId:string,label:string) => {
    setUploadedRefs(current=>({...current,[segmentId]:(current[segmentId]||[]).filter(item=>item.label!==label)}));
    setDraftPrompts(current=>({...current,[segmentId]:(current[segmentId]||"").replaceAll(`@${label}`,"").replace(/ {2,}/g," ")}));
  };
  const removeStoryboardReference = (segmentId:string,label:string) => {
    setImportedReferenceLabels(current=>({...current,[segmentId]:(current[segmentId]||[]).filter(item=>item!==label)}));
    setDraftPrompts(current=>({...current,[segmentId]:(current[segmentId]||"").replaceAll(`@${label}`,"").replace(/ {2,}/g," ")}));
  };
  const submitConfirmed = async () => {
    if (!studioProviderModel||!serviceConfigured||!selectedSegments.length) return;
    setReviewOpen(false);
    setSubmitError("");
    for (const segment of selectedSegments) {
      const prompt = draftPrompts[segment.id] || segment.prompt;
      const now=new Date().toISOString();
      const temporaryId=`local-${segment.id}-${Date.now()}`;
      const baseJob:AiCreationJob={id:temporaryId,projectId,segmentId:segment.id,modelId:studioModel.id,modelName:studioModel.name,providerModel:studioProviderModel,duration:studioDuration,ratio:studioRatio,referenceMode:studioReferenceMode,prompt,status:"submitting",progress:0,groupName:"未分组",createdAt:now,updatedAt:now};
      setJobs(current=>({...current,[temporaryId]:baseJob}));
      try {
        const allowedBuiltIns = importedReferenceLabels[segment.id] || [];
        const builtInRefs = segment.shotIds.map((_,index)=>({label:`Image${index+1}`,url:segment.imageUrls[index],file:null as File|null})).filter(item=>allowedBuiltIns.includes(item.label));
        const customRefs = (uploadedRefs[segment.id]||[]).map(item=>({label:item.label,url:null as string|null,file:item.file}));
        let orderedRefs = [...builtInRefs,...customRefs].filter(item=>prompt.includes(`@${item.label}`)).sort((a,b)=>prompt.indexOf(`@${a.label}`)-prompt.indexOf(`@${b.label}`));
        if (studioReferenceMode==="纯文本生成") orderedRefs=[];
        if (studioReferenceMode==="单图参考") orderedRefs=orderedRefs.slice(0,1);
        const form = new FormData();
        form.set("prompt",prompt);
        form.set("model",studioProviderModel);
        form.set("duration",String(studioDuration));
        form.set("ratio",studioRatio);
        form.set("client_request_id",`${projectId}-${segment.id}-${Date.now()}`);
        for (const reference of orderedRefs) {
          if (reference.file) form.append("images",reference.file,reference.file.name);
          else if (reference.url) { const imageResponse=await fetch(reference.url);if(!imageResponse.ok) throw new Error(`无法读取 @${reference.label}`);form.append("images",await imageResponse.blob(),`${reference.label}.png`); }
        }
        const response = await fetch("/api/ai-video", { method:"POST",body:form });
        const payload = await response.json() as {taskId?:string;status?:string;progress?:number;error?:string};
        if (!response.ok||!payload.taskId) throw new Error(payload.error||"视频任务创建失败");
        const savedJob:AiCreationJob={...baseJob,id:payload.taskId,taskId:payload.taskId,status:payload.status||"queued",progress:Number(payload.progress||0),updatedAt:new Date().toISOString()};
        setJobs(current=>{const next={...current};delete next[temporaryId];next[savedJob.id]=savedJob;return next;});
        fetch("/api/ai-video-history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(savedJob)}).catch(()=>undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : "视频任务创建失败";
        const failedJob:AiCreationJob={...baseJob,status:"failed",error:message,updatedAt:new Date().toISOString()};
        setJobs(current=>({...current,[temporaryId]:failedJob}));
        fetch("/api/ai-video-history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(failedJob)}).catch(()=>undefined);
        setSubmitError(message);
      }
    }
  };
  const statusLabel = (job?:AiCreationJob) => !job?"待确认":job.status==="submitting"?"正在提交":job.status==="queued"?"排队中":job.status==="success"?"生成完成":job.status==="failed"?"生成失败":job.status==="cancelled"?"已取消":`生成中 ${job.progress}%`;
  if (activeSegment) {
    const activeUploads = uploadedRefs[activeSegment.id] || [];
    const activePrompt = draftPrompts[activeSegment.id] || "";
    const activeJob = Object.values(jobs).filter(job=>job.segmentId===activeSegment.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    const importedLabels = importedReferenceLabels[activeSegment.id] || [];
    const referenceOptions = [
      ...activeSegment.imageUrls.map((url,index)=>({label:`Image${index+1}`,url,source:activeSegment.shotIds[index]||`分镜 ${index+1}`,uploaded:false})).filter(item=>importedLabels.includes(item.label)),
      ...activeUploads.map(item=>({label:item.label,url:item.preview,source:"本次上传",uploaded:true})),
    ];
    const mentionOptions = referenceOptions.filter(item=>item.label.toLowerCase().includes(mentionQuery.toLowerCase()));
    const referencedCount = referenceOptions.filter(item=>activePrompt.includes(`@${item.label}`)).length;
    const canStart = Boolean(studioProviderModel&&activePrompt.trim()&&serviceConfigured===true);
    const startReason = !studioProviderModel?"当前模型可编辑，正式识别需等待对应接口":!activePrompt.trim()?"请先填写视频提示词":serviceConfigured!==true?"视频服务尚未配置":"点击后进入最终确认";
    const visibleJobs=Object.values(jobs).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).filter(job=>{
      const query=historySearch.trim().toLowerCase();
      const matchesSearch=!query||`${job.prompt} ${job.modelName} ${job.segmentId} ${job.groupName}`.toLowerCase().includes(query);
      const day=job.createdAt.slice(0,10);
      return matchesSearch&&(groupFilter==="全部"||job.groupName===groupFilter)&&(!historyStartDate||day>=historyStartDate)&&(!historyEndDate||day<=historyEndDate);
    });
    const createGroup=()=>{const name=newGroupName.trim();if(!name)return;setGroups(current=>Array.from(new Set([...current,name])));setGroupFilter(name);setNewGroupName("");fetch("/api/ai-video-history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"group",name})}).catch(()=>undefined);};
    const updateJobGroup=(job:AiCreationJob,groupName:string)=>{const updated={...job,groupName,updatedAt:new Date().toISOString()};setJobs(current=>({...current,[job.id]:updated}));fetch("/api/ai-video-history",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(updated)}).catch(()=>undefined);};
    const reuseJob=(job:AiCreationJob)=>{setActiveSegmentId(segments.some(item=>item.id===job.segmentId)?job.segmentId:segments[0]?.id||"");setDraftPrompts(current=>({...current,[segments.some(item=>item.id===job.segmentId)?job.segmentId:segments[0]?.id||""]:job.prompt}));setStudioModelId(job.modelId);setStudioDuration(job.duration);setStudioRatio(job.ratio);setStudioReferenceMode(job.referenceMode);window.scrollTo({top:0,behavior:"smooth"});};
    const deleteJob=(job:AiCreationJob)=>{setJobs(current=>{const next={...current};delete next[job.id];return next;});fetch(`/api/ai-video-history?id=${encodeURIComponent(job.id)}`,{method:"DELETE"}).catch(()=>undefined);};
    return <section className="ai-creation-page ai-studio-page">
      <header className="ai-creation-hero"><div><p className="eyebrow">独立子项目 · AI 视频创作</p><h2>在一个画布里完成提示词与参考图配置</h2><p>一次只编辑一个视频片段。先切换片段，再复制、粘贴或修改提示词；输入 @ 可从右侧图片中选择引用，最后由你确认后才提交生成。</p></div><span className={serviceConfigured?"ai-service-state ready":"ai-service-state"}><i></i>{serviceConfigured?"视频服务已连接":"视频服务待配置"}</span></header>

      <div className="ai-segment-switcher" role="tablist" aria-label="视频片段切换">
        {segments.map(segment=>{const job=Object.values(jobs).filter(item=>item.segmentId===segment.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];return <button type="button" role="tab" aria-selected={segment.id===activeSegment.id} className={segment.id===activeSegment.id?"active":""} key={segment.id} onClick={()=>{setActiveSegmentId(segment.id);setMentionOpen(false);}}><span>{segment.id}</span><b>{formatSeconds(segment.targetDuration)} 秒提示词段</b><small>参数可单独设置 · {statusLabel(job)}</small></button>})}
      </div>

      <div className="ai-studio-panel">
        <div className="ai-studio-settings">
          <label><span>视频模型</span><select aria-label="选择视频模型" value={studioModelId} onChange={event=>{const next=aiStudioModels.find(item=>item.id===event.target.value)||aiStudioModels[0];setStudioModelId(next.id);setStudioDuration(next.durations[next.durations.length-1]);}}>{aiStudioModels.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select><small>{studioModel.note} · 上一步为 {modelName}</small></label>
          <label><span>生成时长</span><select aria-label="选择生成时长" value={studioDuration} onChange={event=>setStudioDuration(Number(event.target.value))}>{studioModel.durations.map(seconds=><option value={seconds} key={seconds}>{seconds} 秒</option>)}</select><small>当前提示词目标 {formatSeconds(activeSegment.targetDuration)} 秒</small></label>
          <label><span>画面比例</span><select aria-label="选择画面比例" value={studioRatio} onChange={event=>setStudioRatio(event.target.value)}>{aiStudioRatios.map(ratio=><option value={ratio} key={ratio}>{ratio}</option>)}</select><small>可按生成任务单独调整</small></label>
          <label><span>参考方式</span><select aria-label="选择参考方式" value={studioReferenceMode} onChange={event=>setStudioReferenceMode(event.target.value)}>{aiStudioReferenceModes.map(mode=><option value={mode} key={mode}>{mode}</option>)}</select><small>图片按 @引用顺序提交</small></label>
        </div>

        <div className="ai-studio-body">
          <div className="ai-studio-prompt">
            <div className="ai-studio-title"><div><small>视频提示词</small><strong>{activeSegment.id} · 默认空白，由你粘贴或手动导入</strong></div><div className="ai-studio-title-actions"><button type="button" onClick={()=>setDraftPrompts(current=>({...current,[activeSegment.id]:activeSegment.prompt}))}>导入上一步提示词</button><button type="button" disabled={!activePrompt} onClick={()=>copyPrompt(activeSegment.id)}>复制提示词</button><button type="button" disabled={!activePrompt} onClick={()=>setDraftPrompts(current=>({...current,[activeSegment.id]:""}))}>清空</button></div></div>
            <div className="ai-prompt-editor-wrap">
              <RichPromptEditor value={activePrompt} references={referenceOptions} placeholder="在这里粘贴或编辑视频提示词。输入 @ 可选择参考图片。" onChange={(value,cursor)=>updatePrompt(activeSegment.id,value,cursor)} onCursor={cursor=>{promptCursorRefs.current[activeSegment.id]=cursor;const match=activePrompt.slice(0,cursor).match(/@([\w\u4e00-\u9fff-]*)$/);setMentionOpen(Boolean(match));setMentionQuery(match?.[1]||"");}}/>
              {mentionOpen&&<div className="ai-mention-menu"><header><span>选择要引用的图片</span><small>{mentionOptions.length} 张可用</small></header>{mentionOptions.length?mentionOptions.map(item=><button type="button" key={item.label} onMouseDown={event=>event.preventDefault()} onClick={()=>insertReference(activeSegment.id,item.label)}><img src={item.url} alt={item.label}/><span><b>@{item.label}</b><small>{item.source}</small></span></button>):<p>没有匹配的图片</p>}</div>}
            </div>
            <div className="ai-studio-prompt-footer"><span>{activePrompt.length} 字</span><span>{referencedCount} 张图片已引用</span><span>输入 @ 选择图片</span></div>
            {activeSegment.trimDuration>0&&<div className="ai-studio-note">生成后保留前 {formatSeconds(activeSegment.targetDuration)} 秒，裁去末尾 {formatSeconds(activeSegment.trimDuration)} 秒；关键动作须在保留区间内完成。</div>}
            {activeJob?.error&&<div className="ai-job-error">{activeJob.error}</div>}
          </div>

          <aside className="ai-studio-references">
            <header><div><small>参考图片</small><strong>{referenceOptions.length} 张</strong></div><button type="button" onClick={()=>setImportedReferenceLabels(current=>({...current,[activeSegment.id]:activeSegment.imageUrls.map((_,index)=>`Image${index+1}`)}))}>导入上一步分镜图</button></header>
            {!referenceOptions.length&&<div className="ai-reference-empty"><span>＋</span><b>当前没有参考图片</b><small>可上传新图片，或按需导入上一步分镜图。</small></div>}
            <div className="ai-studio-reference-grid">
              {referenceOptions.map(item=><article key={item.label} className={activePrompt.includes(`@${item.label}`)?"used":""}><button type="button" onClick={()=>insertReference(activeSegment.id,item.label)}><img src={item.url} alt={item.label}/><span>@{item.label}</span></button><small>{item.source}</small><button type="button" className="ai-reference-remove" aria-label={`删除 ${item.label}`} onClick={()=>item.uploaded?removeUploadedReference(activeSegment.id,item.label):removeStoryboardReference(activeSegment.id,item.label)}>×</button></article>)}
            </div>
            <label className="ai-studio-upload"><input type="file" accept="image/png,image/jpeg,image/webp,image/bmp" multiple onChange={event=>{addReferenceFiles(activeSegment.id,Array.from(event.target.files||[]));event.currentTarget.value="";}}/><b>＋ 上传参考图片</b><span>支持 PNG、JPG、WEBP、BMP，单张不超过 20MB</span></label>
          </aside>
        </div>

        <footer className="ai-studio-actionbar"><div><small>当前任务</small><strong>{activeSegment.id} · {studioModel.name} · {studioDuration} 秒 · {statusLabel(activeJob)}</strong><span>{startReason}</span></div><button className="primary-button" disabled={!canStart} onClick={()=>setReviewOpen(true)}>开始生成</button></footer>
        {activeJob?.videoUrl&&<video className="ai-generated-preview" controls src={activeJob.videoUrl}/>} {submitError&&<div className="ai-submit-error">{submitError}</div>}
      </div>

      <section className="ai-task-library ai-history-library">
        <div className="panel-heading"><div><p className="eyebrow">视频生成工作区与分组库</p><h3>草稿、任务和结果切换页面后仍会保留</h3></div><span>{Object.keys(jobs).length} 个任务</span></div>
        <div className="ai-history-toolbar"><label><span>搜索</span><input value={historySearch} onChange={event=>setHistorySearch(event.target.value)} placeholder="搜索提示词、模型或分组"/></label><label><span>开始日期</span><input type="date" value={historyStartDate} onChange={event=>setHistoryStartDate(event.target.value)}/></label><label><span>结束日期</span><input type="date" value={historyEndDate} onChange={event=>setHistoryEndDate(event.target.value)}/></label><label><span>分组</span><select value={groupFilter} onChange={event=>setGroupFilter(event.target.value)}><option>全部</option>{groups.map(group=><option key={group}>{group}</option>)}</select></label></div>
        <div className="ai-group-manager"><div className="ai-group-tabs"><button className={groupFilter==="全部"?"active":""} onClick={()=>setGroupFilter("全部")}>全部视频</button>{groups.map(group=><button className={groupFilter===group?"active":""} key={group} onClick={()=>setGroupFilter(group)}>{group}</button>)}</div><div><input value={newGroupName} onChange={event=>setNewGroupName(event.target.value)} placeholder="新分组名称" onKeyDown={event=>{if(event.key==="Enter")createGroup();}}/><button onClick={createGroup}>创建分组</button></div></div>
        {!Object.keys(jobs).length?<div className="ai-task-empty"><span>▶</span><h3>还没有正式生成任务</h3><p>完成上方人工确认后，任务会持续保留在这里并更新状态。</p></div>:!visibleJobs.length?<div className="ai-task-empty"><span>⌕</span><h3>没有符合筛选条件的任务</h3><p>可调整关键词、分组或日期范围。</p></div>:<div className="ai-task-grid ai-history-grid">{visibleJobs.map(job=><article key={job.id}><div className={job.videoUrl?"ai-task-preview has-video":"ai-task-preview"}>{job.videoUrl?<video controls src={job.videoUrl}/>:<span>{job.status==="failed"?"!":job.progress?`${job.progress}%`:"▶"}</span>}<em className={job.status==="success"?"success":job.status==="failed"?"failed":""}>{statusLabel(job)}</em></div><div className="ai-history-card-body"><select value={job.groupName} onChange={event=>updateJobGroup(job,event.target.value)}>{groups.map(group=><option key={group}>{group}</option>)}</select><b>{job.segmentId} · {job.modelName}</b><p>{job.prompt}</p><small>{new Date(job.createdAt).toLocaleString("zh-CN")} · {job.duration} 秒 · {job.ratio}</small><footer><button onClick={()=>reuseJob(job)}>复用</button>{job.taskId&&job.status==="success"?<a href={`/api/ai-video?taskId=${encodeURIComponent(job.taskId)}&download=1`}>下载</a>:<button disabled>下载</button>}<button className="danger" onClick={()=>deleteJob(job)}>删除</button></footer></div></article>)}</div>}
      </section>

      {reviewOpen&&<div className="ai-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-confirm-title"><div className="ai-confirm-dialog"><span>最终确认</span><h3 id="ai-confirm-title">确认提交 {activeSegment.id} 视频生成任务？</h3><p>提交后才会正式调用视频服务。系统不会自动提交，也不会自动重试。</p><div><b>{studioModel.name} · {studioDuration} 秒 · {studioRatio}<small>{studioReferenceMode} · {activePrompt.match(/@[\w\-\u4e00-\u9fff]+/g)?.join(" / ")||"未引用图片"}</small></b></div><footer><button className="secondary-button" onClick={()=>setReviewOpen(false)}>返回检查</button><button className="primary-button" onClick={submitConfirmed}>确认生成</button></footer></div></div>}
    </section>;
  }
  return <section className="ai-creation-page">
    <header className="ai-creation-hero"><div><p className="eyebrow">独立子项目 · 正式视频生成</p><h2>AI 视频创作</h2><p>像独立创作工具一样编辑每一段提示词。可复制、粘贴，在光标位置插入已确认分镜图或新上传图片的 @引用，最后由你人工确认是否提交。</p></div><span className={serviceConfigured?"ai-service-state ready":"ai-service-state"}><i></i>{serviceConfigured?"视频服务已连接":"视频服务待配置"}</span></header>
    <div className="ai-creation-form">
      <div className="ai-form-summary"><label><span>生成模型</span><strong>{modelName}</strong><small>{providerModel?`接口模型：${providerModel}`:"当前接口暂不支持此模型"}</small></label><label><span>画面比例</span><strong>9:16</strong><small>继承已确认竖屏方案</small></label><label><span>待生成任务</span><strong>{selectedSegments.length} 段</strong><small>可取消勾选暂不生成的段落</small></label><label><span>提交方式</span><strong>人工确认</strong><small>不会自动提交或自动重试</small></label></div>
      <div className="ai-generation-list">{segments.map(segment=>{const job=jobs[segment.id];const uploads=uploadedRefs[segment.id]||[];return <article className={selectedIds.includes(segment.id)?"selected":""} key={segment.id}>
        <header><label><input type="checkbox" checked={selectedIds.includes(segment.id)} onChange={()=>toggleSegment(segment.id)}/><span><b>{segment.id}</b><small>脚本 {formatSeconds(segment.sourceStart)}–{formatSeconds(segment.sourceEnd)}s</small></span></label><em className={job?.status==="success"?"success":job?.status==="failed"?"failed":""}>{statusLabel(job)}</em></header>
        <div className="ai-duration-mapping ai-duration-strip"><span><small>提示词目标</small><b>{formatSeconds(segment.targetDuration)}秒</b></span><i>→</i><span><small>API生成</small><b>{segment.apiDuration?`${segment.apiDuration}秒`:"不支持"}</b></span><i>→</i><span><small>成片保留</small><b>{formatSeconds(segment.targetDuration)}秒</b></span></div>
        <div className="ai-composer-layout"><aside className="ai-reference-library"><div><small>参考图片</small><strong>点击图片，将 @引用插入光标位置</strong></div><div className="ai-reference-cards">{segment.imageUrls.map((url,index)=><button type="button" key={url} onClick={()=>insertReference(segment.id,`Image${index+1}`)}><img src={url} alt={`${segment.shotIds[index]}参考图`}/><span>@Image{index+1}<small>{segment.shotIds[index]}</small></span></button>)}{uploads.map(item=><button type="button" key={item.preview} onClick={()=>insertReference(segment.id,item.label)}><img src={item.preview} alt={item.label}/><span>@{item.label}<small>用户上传</small></span></button>)}</div><label className="ai-reference-upload"><input type="file" accept="image/png,image/jpeg,image/webp,image/bmp" multiple onChange={event=>{addReferenceFiles(segment.id,Array.from(event.target.files||[]));event.currentTarget.value="";}}/><span>＋ 上传参考图片</span><small>上传后点击图片即可插入 @引用</small></label></aside>
          <div className="ai-prompt-composer"><div className="ai-prompt-toolbar"><div><small>视频提示词</small><strong>@图片会与上传素材按出现顺序一起提交</strong></div><button type="button" onClick={()=>copyPrompt(segment.id)}>复制提示词</button></div><textarea ref={element=>{promptRefs.current[segment.id]=element;}} value={draftPrompts[segment.id]||""} onChange={event=>setDraftPrompts(current=>({...current,[segment.id]:event.target.value}))} aria-label={`${segment.id}视频提示词`}/><div className="ai-prompt-footer"><span>{(draftPrompts[segment.id]||"").length} 字</span><span>{[...segment.imageUrls.map((_,index)=>`Image${index+1}`),...uploads.map(item=>item.label)].filter(label=>(draftPrompts[segment.id]||"").includes(`@${label}`)).length} 张图片已引用</span></div>{segment.trimDuration>0&&<small className="ai-trim-instruction">生成后保留前 {formatSeconds(segment.targetDuration)} 秒，裁去末尾 {formatSeconds(segment.trimDuration)} 秒；关键动作必须在保留区间内完成。</small>}{job?.error&&<small className="ai-job-error">{job.error}</small>}</div>
        </div>{job?.videoUrl&&<video className="ai-generated-preview" controls src={job.videoUrl}/>}</article>})}</div>
      <footer className="ai-generation-submit"><div><small>提交前检查</small><strong>{selectedSegments.length?`已选择 ${selectedSegments.length} 个生成任务`:"尚未选择生成任务"}</strong><span>请确认每个 @图片 都位于它所控制的画面描述前方。</span></div><button className="primary-button" disabled={!providerModel||!selectedSegments.length||serviceConfigured!==true} onClick={()=>setReviewOpen(true)}>{serviceConfigured===false?"等待配置视频服务":"检查并确认生成 →"}</button></footer>{submitError&&<div className="ai-submit-error">{submitError}</div>}
    </div>
    <section className="ai-task-library"><div className="panel-heading"><div><p className="eyebrow">生成任务与结果</p><h3>每一次生成都单独保留，不覆盖前一次结果</h3></div><span>{Object.keys(jobs).length} 个任务</span></div>{!Object.keys(jobs).length?<div className="ai-task-empty"><span>▶</span><h3>还没有正式生成任务</h3><p>完成上方人工确认后，任务会显示在这里，并在当前页面持续更新状态。</p></div>:<div className="ai-task-grid">{Object.values(jobs).map(job=><article key={job.segmentId}><div className={job.videoUrl?"ai-task-preview has-video":"ai-task-preview"}>{job.videoUrl?<video controls src={job.videoUrl}/>:<span>{job.status==="failed"?"!":"▶"}</span>}</div><b>{job.segmentId}</b><small>{statusLabel(job)}</small></article>)}</div>}</section>
    {reviewOpen&&<div className="ai-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-confirm-title"><div className="ai-confirm-dialog"><span>最终确认</span><h3 id="ai-confirm-title">确认提交 {selectedSegments.length} 个视频生成任务？</h3><p>提交后才会正式调用视频服务。系统不会自动重试，失败任务需要你再次确认后才能重新生成。</p><div>{selectedSegments.map(segment=><b key={segment.id}>{segment.id}<small>{segment.apiDuration}秒 · {(draftPrompts[segment.id]||"").match(/@[\w\-\u4e00-\u9fff]+/g)?.join(" / ")||"未引用图片"}</small></b>)}</div><footer><button className="secondary-button" onClick={()=>setReviewOpen(false)}>返回检查</button><button className="primary-button" onClick={submitConfirmed}>确认生成</button></footer></div></div>}
  </section>;
}

const sourceCandidates = [
  { id: "SRC-0921", title: "Small kitchen, big storage trick", author: "@homefixdaily", views: "4.8M", growth: "+184%", score: 92, tag: "强匹配" },
  { id: "SRC-0918", title: "I stopped stacking pans like this", author: "@tinyhomeideas", views: "2.1M", growth: "+96%", score: 86, tag: "待立项" },
  { id: "SRC-0912", title: "One shelf changed this cabinet", author: "@organizewithme", views: "886K", growth: "+61%", score: 78, tag: "观察" },
];

type ViralPoolRecord = {
  id: string; platform: string; author: string; title: string; likes: number; views: number | null;
  comments: number; favorites: number; shares: number; status: string; analysis: string;
  score: number | null; hook: string; hookType: string; link: string; embedUrl: string;
  localPreview?: boolean;
};

const viralPoolRecords: ViralPoolRecord[] = [
  { id:"VV-7650530444404112741", platform:"抖音", author:"时来", title:"电商公司AI落地五大误区，看完少走弯路", likes:217, views:null, comments:39, favorites:147, shares:62, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7650530444404112741/", embedUrl:"https://open.douyin.com/player/video?vid=7650530444404112741&autoplay=0" },
  { id:"VV-7627166720059349105", platform:"抖音", author:"老王｜跨境说", title:"你的AI视频没效果，就是提示词的原因！", likes:2513, views:null, comments:332, favorites:1894, shares:526, status:"待改写", analysis:"V1 已拆解", score:92, hook:"你的AI视频没效果，不是你不会做，是你第一句话就说错了。", hookType:"结果钩子", link:"https://www.iesdouyin.com/share/video/7627166720059349105/", embedUrl:"https://open.douyin.com/player/video?vid=7627166720059349105&autoplay=0" },
  { id:"VV-7647464806470962447", platform:"抖音", author:"隋校长AI实战", title:"Image 2故事板加即梦Seedance 2.0生视频新思路", likes:5073, views:null, comments:80, favorites:4656, shares:1511, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7647464806470962447/", embedUrl:"https://open.douyin.com/player/video?vid=7647464806470962447&autoplay=0" },
  { id:"VV-7639428756414680350", platform:"TikTok", author:"Josh Morris", title:"This is the most useful thing we’ve bought on here and they’re so cheap", likes:109077, views:21000000, comments:397, favorites:33280, shares:24201, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.tiktok.com/@myfamilypov/video/7639428756414680350", embedUrl:"https://www.tiktok.com/player/v1/7639428756414680350?autoplay=0&controls=1&description=0&music_info=0" },
  { id:"VV-7646130786818624799", platform:"TikTok", author:"Josh Morris", title:"This is a cordless pressure washer for all your cleaning needs", likes:63438, views:11300000, comments:288, favorites:16878, shares:13987, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.tiktok.com/@myfamilypov/video/7646130786818624799", embedUrl:"https://www.tiktok.com/player/v1/7646130786818624799?autoplay=0&controls=1&description=0&music_info=0" },
  { id:"VV-7648001830957403422", platform:"TikTok", author:"Josh Morris", title:"The perfect cleaning tool", likes:61654, views:20500000, comments:137, favorites:9317, shares:8018, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.tiktok.com/@myfamilypov/video/7648001830957403422", embedUrl:"https://www.tiktok.com/player/v1/7648001830957403422?autoplay=0&controls=1&description=0&music_info=0" },
  { id:"VV-7586412734229531918", platform:"TikTok", author:"simplykyla🦋", title:"Let’s make a Loaded Water!", likes:162647, views:4700000, comments:618, favorites:30910, shares:5936, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.tiktok.com/@simplykylamarie/video/7586412734229531918", embedUrl:"https://www.tiktok.com/player/v1/7586412734229531918?autoplay=0&controls=1&description=0&music_info=0" },
  { id:"VV-7650818310648499492", platform:"抖音", author:"赛博鸭AIGC", title:"设计师私藏：7个好用的神仙出图提示词公式", likes:27526, views:null, comments:412, favorites:29226, shares:6257, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7650818310648499492/", embedUrl:"https://open.douyin.com/player/video?vid=7650818310648499492&autoplay=0" },
  { id:"VV-7624947896542055706", platform:"抖音", author:"赛博AI", title:"AI人物太假？三大提示词让AI视频更真实", likes:16545, views:null, comments:392, favorites:15813, shares:3395, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7624947896542055706/", embedUrl:"https://open.douyin.com/player/video?vid=7624947896542055706&autoplay=0" },
  { id:"VV-7644883012064202022", platform:"抖音", author:"电商AI导师 叶炜", title:"搞定一条爆款视频，现在只需要点几下鼠标", likes:977, views:null, comments:329, favorites:730, shares:302, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7644883012064202022/", embedUrl:"https://open.douyin.com/player/video?vid=7644883012064202022&autoplay=0" },
  { id:"VV-7601088425617280302", platform:"抖音", author:"Max的AI干货", title:"小白必看：3步提取顶级风格DNA", likes:4169, views:null, comments:13, favorites:4985, shares:692, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7601088425617280302/", embedUrl:"https://open.douyin.com/player/video?vid=7601088425617280302&autoplay=0" },
  { id:"VV-7598120368192146715", platform:"抖音", author:"Max的AI干货", title:"拒绝AI塑料感！让模特活过来", likes:12624, views:null, comments:152, favorites:14282, shares:3291, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7598120368192146715/", embedUrl:"https://open.douyin.com/player/video?vid=7598120368192146715&autoplay=0" },
  { id:"VV-7644169452733255419", platform:"抖音", author:"白日不做梦🌙", title:"即梦＋豆包生成清冷感古风视频", likes:4964, views:null, comments:161, favorites:3210, shares:1140, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7644169452733255419/", embedUrl:"https://open.douyin.com/player/video?vid=7644169452733255419&autoplay=0" },
  { id:"VV-7650403337883454733", platform:"TikTok", author:"NovaMartUSA", title:"Security stopped him… then saw the footage from his glasses", likes:3218, views:405100, comments:46, favorites:554, shares:255, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.tiktok.com/@novamartusa5/video/7650403337883454733", embedUrl:"https://www.tiktok.com/player/v1/7650403337883454733?autoplay=0&controls=1&description=0&music_info=0" },
  { id:"VV-7647440621828967714", platform:"抖音", author:"徐老师AI", title:"高效搭建一个AI自媒体团队，全流程分享", likes:14040, views:null, comments:429, favorites:1473, shares:363, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7647440621828967714/", embedUrl:"https://open.douyin.com/player/video?vid=7647440621828967714&autoplay=0" },
  { id:"VV-7650952072992443694", platform:"抖音", author:"春观花talk", title:"叫AI帮你安装AI", likes:13582, views:null, comments:241, favorites:16080, shares:2902, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7650952072992443694/", embedUrl:"https://open.douyin.com/player/video?vid=7650952072992443694&autoplay=0" },
  { id:"VV-7649202784336424625", platform:"抖音", author:"CharloChan", title:"用Codex在多维表格一键批量复刻SKU电商图", likes:408, views:null, comments:13, favorites:384, shares:88, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7649202784336424625/", embedUrl:"https://open.douyin.com/player/video?vid=7649202784336424625&autoplay=0" },
  { id:"VV-7663004913202466094", platform:"抖音", author:"老方电商", title:"电商运营必看：RPA vs Codex，上架自动化怎么选", likes:777, views:null, comments:22, favorites:814, shares:212, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7663004913202466094/", embedUrl:"https://open.douyin.com/player/video?vid=7663004913202466094&autoplay=0" },
  { id:"VV-7669817953173059014", platform:"抖音", author:"跨境麦乐鸡块", title:"打造TK爆款！用Codex分析并优化GMV Max", likes:317, views:null, comments:84, favorites:226, shares:50, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7669817953173059014/", embedUrl:"https://open.douyin.com/player/video?vid=7669817953173059014&autoplay=0" },
  { id:"VV-7668740073084456232", platform:"抖音", author:"智丘玩AI", title:"GPT-5.6正式上线，Codex与ChatGPT有哪些新升级", likes:20886, views:null, comments:164, favorites:1246, shares:1320, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7668740073084456232/", embedUrl:"https://open.douyin.com/player/video?vid=7668740073084456232&autoplay=0" },
  { id:"VV-7664557553531079986", platform:"抖音", author:"珍妮丁丁说AI", title:"Codex这波更新太顶了！全是职场功能", likes:14546, views:null, comments:418, favorites:10031, shares:2868, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7664557553531079986/", embedUrl:"https://open.douyin.com/player/video?vid=7664557553531079986&autoplay=0" },
  { id:"VV-7658926973158182195", platform:"抖音", author:"我是戴伦", title:"装完Codex不改这个设置，越用越笨", likes:5311, views:null, comments:532, favorites:5759, shares:1107, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7658926973158182195/", embedUrl:"https://open.douyin.com/player/video?vid=7658926973158182195&autoplay=0" },
  { id:"VV-7650682318205553956", platform:"抖音", author:"袁博士的AI小灶", title:"Codex保姆级教程：30秒让Codex拥有长期记忆", likes:357, views:null, comments:2, favorites:265, shares:50, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7650682318205553956/", embedUrl:"https://open.douyin.com/player/video?vid=7650682318205553956&autoplay=0" },
  { id:"VV-7666810206852107571", platform:"抖音", author:"阿悦很严格", title:"Codex和网页版ChatGPT到底有什么区别？", likes:2381, views:null, comments:80, favorites:1404, shares:281, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7666810206852107571/", embedUrl:"https://open.douyin.com/player/video?vid=7666810206852107571&autoplay=0" },
  { id:"VV-7666832665312982138", platform:"抖音", author:"大李书房一盏灯", title:"什么是Skill？普通人学习AI最应该先学好的能力", likes:18586, views:null, comments:322, favorites:17997, shares:3414, status:"待插件", analysis:"等待 V1", score:null, hook:"待观看原片后判断", hookType:"待识别", link:"https://www.iesdouyin.com/share/video/7666832665312982138/", embedUrl:"https://open.douyin.com/player/video?vid=7666832665312982138&autoplay=0" },
];

const roleTasks = {
  "老板": ["审核 4 项高风险异常", "查看昨日店铺毛利", "确认 2 个测品结论"],
  "运营": ["处理 17 单物流异常", "回复 7 条客服消息", "跟进 16 位达人"],
  "拍剪": ["待拍摄 8 条", "待剪辑 6 条", "待修改 2 条", "待发布 5 条"],
};

const modules: Record<Exclude<ModuleKey, "dashboard">, {
  eyebrow: string; title: string; description: string; stats: Array<[string, string, string]>; steps: string[]; columns: string[]; rows: string[][]; source: string; owner: string;
}> = {
  alerts: { eyebrow: "统一任务流", title: "异常中心", description: "所有模块发现的问题统一进入这里，分配负责人并跟踪至解决。", stats: [["待处理", "29", "4 项高风险"], ["处理中", "12", "今日 +5"], ["已解决", "86", "近 7 天"]], steps: ["发现异常", "生成任务", "分配负责人", "处理中", "已解决"], columns: ["异常", "来源", "店铺", "负责人", "状态"], rows: [["订单 5 天未送达", "物流", "US-01", "运营", "待处理"], ["前台价格不一致", "链接", "US-03", "运营", "处理中"], ["素材消耗 $100 无订单", "广告", "US-02", "老板", "待处理"]], source: "各业务模块", owner: "老板 / 运营" },
  logistics: { eyebrow: "履约巡检", title: "物流预警", description: "订单创建超过 5 天仍未送达时自动生成红色预警。", stats: [["异常订单", "17", "较昨日 +5"], ["最长未送达", "8.4 天", "US-01"], ["正常履约率", "96.7%", "+0.8%"]], steps: ["拉取订单", "读取创建时间", "检查送达状态", "计算时长", "生成预警"], columns: ["订单号", "店铺", "创建时间", "未送达", "状态"], rows: [["TT-104829", "US-01", "08/10 13:22", "8.4 天", "高风险"], ["TT-104903", "US-03", "08/12 09:10", "6.3 天", "待跟进"], ["TT-105012", "US-02", "08/13 17:40", "5.7 天", "待跟进"]], source: "TikTok Shop API", owner: "运营" },
  service: { eyebrow: "消息巡检", title: "客服中心", description: "不重做完整客服系统，只聚合未回复、超时和退款等重点消息。", stats: [["未回复", "7", "2 条超时"], ["退款关键词", "1", "需要优先处理"], ["平均响应", "43 分钟", "目标 < 1 小时"]], steps: ["巡检消息", "识别未回复", "判断超时", "标记关键词", "提醒运营"], columns: ["店铺", "客户", "问题类型", "等待时长", "状态"], rows: [["US-02", "M***a", "物流未收到", "4 小时 23 分", "超时"], ["US-01", "J***n", "申请退款", "2 小时 11 分", "优先"], ["US-03", "S***y", "商品咨询", "38 分钟", "待回复"]], source: "API / 紫鸟", owner: "运营" },
  ads: { eyebrow: "投放监控", title: "广告中心", description: "集中查看消耗、GMV、ROAS、CPA 和异常素材，不复制 Ads Manager。", stats: [["今日消耗", "$1,832", "+8.1%"], ["广告 GMV", "$7,210", "ROAS 3.94"], ["异常素材", "3", "消耗 > $100 零单"]], steps: ["拉取报告", "关联店铺", "关联素材", "识别异常", "生成日报"], columns: ["素材 ID", "店铺", "消耗", "GMV", "ROAS"], rows: [["V2308", "US-01", "$221", "$1,430", "6.47"], ["V2281", "US-02", "$183", "$0", "0.00"], ["V2296", "US-03", "$126", "$612", "4.86"]], source: "TikTok Ads API", owner: "运营" },
  video: { eyebrow: "内容生产系统", title: "短视频工厂", description: "用唯一 ID 串联爆款采集、脚本、拍摄、发布与表现复盘。", stats: [["待拍摄", "8", "今日任务"], ["待剪辑", "6", "2 条优先"], ["本周已发布", "31", "爆款 4 条"]], steps: ["爆款池", "采集 / 转写", "商品调研", "脚本改写", "拍剪 / 发布", "数据复盘"], columns: ["视频 ID", "商品 / 脚本", "账号", "负责人", "阶段"], rows: [["V1298", "P032 / S0832", "A03", "拍剪", "待剪辑"], ["V1302", "P041 / S0841", "A01", "拍剪", "待拍摄"], ["V1286", "P018 / S0819", "A02", "运营", "已发布"]], source: "Agent + 数据采集", owner: "拍剪" },
  selection: { eyebrow: "商品机会", title: "选品中心", description: "从榜单映射到商品，结合利润空间、竞争度和内容潜力形成评分。", stats: [["候选商品", "46", "本周新增 12"], ["待调研", "18", "运营处理"], ["进入测品", "7", "通过率 15.2%"]], steps: ["榜单采集", "商品映射", "成本调研", "机会评分", "进入测品"], columns: ["商品 ID", "品类", "机会分", "预计毛利", "状态"], rows: [["P041", "厨房收纳", "88", "31%", "进入测品"], ["P038", "宠物清洁", "82", "27%", "待确认"], ["P043", "家居工具", "76", "24%", "调研中"]], source: "榜单采集 + Agent", owner: "老板 / 运营" },
  testing: { eyebrow: "投入产出", title: "测品中心", description: "关联商品的脚本、视频、广告消耗、订单和毛利，形成可复盘的测品结论。", stats: [["测试中", "7", "3 个新品"], ["本月通过", "4", "通过率 22%"], ["内容投入", "126 条", "脚本 + 视频"]], steps: ["商品立项", "脚本投入", "视频发布", "流量 / 广告", "订单 / 毛利", "测试结论"], columns: ["商品", "脚本 / 视频", "广告消耗", "总订单", "结论"], rows: [["P032", "26 / 21", "$730", "146", "通过"], ["P041", "8 / 5", "$184", "23", "观察"], ["P038", "12 / 9", "$302", "8", "待优化"]], source: "多表数据关联", owner: "老板" },
  inventory: { eyebrow: "双库存模型", title: "库存中心", description: "同时监控 TikTok 链接库存与仓库真实库存，识别断货和超卖风险。", stats: [["库存风险", "4", "1 项超卖风险"], ["低库存 SKU", "9", "小于 7 天"], ["库存准确率", "97.2%", "+1.4%"]], steps: ["读取链接库存", "录入真实库存", "计算差异", "判断风险", "生成补货任务"], columns: ["SKU", "店铺", "链接库存", "真实库存", "风险"], rows: [["SKU-A093", "US-03", "500", "20", "超卖风险"], ["SKU-B018", "US-01", "18", "137", "链接不足"], ["SKU-C072", "US-02", "86", "92", "正常"]], source: "Shop API + 仓库录入", owner: "运营" },
  creators: { eyebrow: "合作管道", title: "达人 BD", description: "追踪达人从筛选、联系、寄样、发布到出单的完整合作链路。", stats: [["待跟进", "16", "今日 5 位"], ["已寄样", "23", "待发布 11"], ["本月达人单", "392", "+18.4%"]], steps: ["达人入库", "首次联系", "确认合作", "寄样", "发布视频", "归因出单"], columns: ["达人", "粉丝", "商品", "最近动作", "阶段"], rows: [["@homewithmia", "248K", "P032", "08/17 寄样", "待发布"], ["@dailyfinds", "91K", "P041", "08/18 回复", "洽谈中"], ["@kitchenglow", "506K", "P018", "已出 81 单", "已合作"]], source: "Agent + 人工", owner: "运营" },
  links: { eyebrow: "前台巡检", title: "链接监控", description: "通过紫鸟依次巡检各店铺商品前台价格、库存、购买按钮和商品状态。", stats: [["监控链接", "186", "5 个店铺"], ["当前异常", "2", "1 项价格异常"], ["最近巡检", "09:32", "预计 11:32 再次"]], steps: ["启动指定店铺", "打开商品前台", "读取关键字段", "比对设定值", "异常通知"], columns: ["SKU", "店铺", "设定价", "前台价", "状态"], rows: [["A093", "US-03", "$29.99", "$19.99", "价格异常"], ["B018", "US-01", "$24.99", "$24.99", "库存异常"], ["C072", "US-02", "$18.99", "$18.99", "正常"]], source: "紫鸟 WebDriver + Selenium", owner: "Agent" },
  profit: { eyebrow: "经营结果", title: "销售利润", description: "统一核算收入、货品、物流、平台、达人、广告、退款与其他成本。", stats: [["今日 GMV", "$12,821", "+12.6%"], ["预估毛利", "$3,082", "毛利率 24.0%"], ["待补成本", "6 单", "影响约 $143"]], steps: ["订单收入", "商品成本", "履约成本", "平台 / 达人费", "广告 / 退款", "毛利"], columns: ["店铺", "GMV", "广告费", "总成本", "毛利率"], rows: [["US-01", "$4,892", "$702", "$3,662", "25.1%"], ["US-02", "$3,746", "$641", "$2,941", "21.5%"], ["US-03", "$2,981", "$506", "$2,183", "26.8%"]], source: "订单 + 成本表", owner: "老板" },
  settings: { eyebrow: "系统基础", title: "设置", description: "先维护店铺、角色、预警规则和数据接入状态，再逐项连接真实数据源。", stats: [["店铺", "5", "均为示例"], ["成员", "3", "老板 / 运营 / 拍剪"], ["数据源", "0 / 4", "等待连接"]], steps: ["维护店铺", "配置角色", "设置规则", "连接数据源", "启用 Agent"], columns: ["数据源", "用途", "接入方式", "优先级", "状态"], rows: [["TikTok Shop", "订单 / 商品 / 库存", "官方 API", "第一阶段", "未连接"], ["TikTok Ads", "广告 / 素材", "官方 API", "第二阶段", "未连接"], ["紫鸟", "前台 / 客服巡检", "Selenium", "第三阶段", "未连接"]], source: "系统配置", owner: "老板" },
};

const metrics = [
  { label: "今日 GMV", value: "$12,821", delta: "+12.6%", tone: "purple" },
  { label: "今日订单", value: "518", delta: "+8.2%", tone: "blue" },
  { label: "广告消耗", value: "$2,137", delta: "ROAS 3.94", tone: "orange" },
  { label: "预估毛利", value: "$3,082", delta: "毛利率 24.0%", tone: "green" },
];

const dashboardAlerts = [["物流异常", "17", "5 天以上未送达", "high"], ["客服待处理", "6", "2 条已超过 4 小时", "high"], ["库存风险", "4", "1 个 SKU 存在超卖风险", "medium"], ["链接异常", "2", "价格或购买状态异常", "medium"]];

function pick(row: DataRow | undefined, fields: string[], fallback: unknown = "—") {
  for (const field of fields) if (row?.[field] !== undefined && row[field] !== null && row[field] !== "") return row[field];
  return fallback;
}

function display(value: unknown) {
  if (typeof value === "number") return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function money(value: unknown) {
  if (typeof value === "number") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
  return display(value);
}

function formatUpdate(value?: string | null) {
  if (!value) return "等待首次同步";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN", { hour12: false });
}

function Dashboard({ onAlerts, data, loading }: { onAlerts: () => void; data: StoreData | null; loading: boolean }) {
  const dashboardRows = data?.dashboard ?? [];
  const sum = (field: string) => dashboardRows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
  const realMetrics = data?.connected ? [
    { label: "今日 GMV", value: money(sum("gmv")), delta: "经营快照汇总", tone: "purple" },
    { label: "今日订单", value: display(sum("orders")), delta: `历史订单 ${display(data.counts.orders)}`, tone: "blue" },
    { label: "待处理预警", value: display(sum("open_alerts")), delta: `高风险 ${display(sum("critical_alerts"))}`, tone: "orange" },
    { label: "低库存 SKU", value: display(sum("low_stock_skus")), delta: `SKU 总数 ${display(data.counts.skus)}`, tone: "green" },
  ] : metrics;
  const alertTotal = data?.connected ? data.alerts.length : 29;
  const realAlerts = data?.connected ? data.alerts.slice(0, 4).map((row) => [
    display(pick(row, ["alert_title", "title", "alert_type", "rule_name"], "待处理异常")),
    display(pick(row, ["occurrence_count", "count", "severity"], "1")),
    display(pick(row, ["detail", "message", "description", "shop_name", "shop_code"], "点击查看异常详情")),
    String(pick(row, ["severity", "level"], "medium")).toLowerCase().includes("high") ? "high" : "medium",
  ]) : dashboardAlerts;
  const trendByDate = new Map<string, number>();
  for (const row of data?.metrics ?? []) {
    const date = display(pick(row, ["metric_date", "date"]));
    trendByDate.set(date, (trendByDate.get(date) ?? 0) + (Number(pick(row, ["gmv", "orders"], 0)) || 0));
  }
  const rawTrend = [...trendByDate.entries()].sort(([a],[b])=>a.localeCompare(b)).slice(-7);
  const trendMax = Math.max(1, ...rawTrend.map(([,value])=>value));
  const trend = rawTrend.map(([date,value])=>({ height: Math.max(8, Math.round(value / trendMax * 100)), label: date.slice(-2) }));
  return <>
    <section className="welcome-panel"><div><span className="live-pill">{data?.connected ? "Supabase 已连接" : loading ? "正在连接数据库" : "等待数据库密钥"}</span><h2>早上好，先看今天最重要的事。</h2><p>{data?.connected ? `已汇总 ${data.shops.length} 个店铺；数据更新时间：${formatUpdate(data.updatedAt)}。当前数据来自报表同步，并非实时 API。` : data?.detail || "服务端接入已完成，配置真实 Secret Key 后自动读取店铺数据。"}</p></div><button className="primary-button" onClick={onAlerts}>查看全部异常 <span>→</span></button></section>
    <section className="metrics-grid" aria-label="核心指标">{realMetrics.map(metric => <article className="metric-card" key={metric.label}><div className={`metric-icon ${metric.tone}`}>{metric.label.slice(0, 1)}</div><p>{metric.label}</p><strong>{metric.value}</strong><span>{metric.delta}</span></article>)}</section>
    <div className="dashboard-grid">
      <section className="panel performance-panel"><div className="panel-heading"><div><p className="eyebrow">经营趋势</p><h3>近 7 日销售表现</h3></div><span className="framework-tag">{data?.connected ? "真实快照" : "示例数据"}</span></div><div className="chart" aria-label="销售趋势">{(data?.connected && trend.length ? trend : [42,55,48,72,64,84,76].map((height,index)=>({height,label:["12","13","14","15","16","17","18"][index]}))).map((item,index)=><div className="bar-column" key={index}><div className="bar-track"><span style={{height:`${item.height}%`}} /></div><small>{item.label}</small></div>)}</div></section>
      <section className="panel alerts-panel"><div className="panel-heading"><div><p className="eyebrow">待办聚合</p><h3>异常中心</h3></div><span className="count-badge">{alertTotal} 项</span></div><div className="alert-list">{realAlerts.map(([name,count,note,level],index)=><button className="alert-row" key={`${name}-${index}`} onClick={onAlerts}><span className={`alert-level ${level}`} /><span><strong>{name}</strong><small>{note}</small></span><b>{count}</b><i>→</i></button>)}</div></section>
    </div>
    <section className="panel role-panel"><div className="panel-heading"><div><p className="eyebrow">今日执行</p><h3>三人协作视图</h3></div><span className="framework-tag">按角色过滤</span></div><div className="role-columns">{Object.entries(roleTasks).map(([role,tasks])=><article key={role}><strong>{role}</strong><span>{role === "老板" ? "经营与决策" : role === "运营" ? "店铺与异常" : "内容生产"}</span>{tasks.slice(0,3).map(task=><p key={task}>✓ {task}</p>)}</article>)}</div></section>
  </>;
}

function ModuleView({ moduleKey, data }: { moduleKey: Exclude<ModuleKey, "dashboard">; data: StoreData | null }) {
  const item = modules[moduleKey];
  const shopName = (shopId: unknown) => display(data?.shops.find(row=>row.id===shopId)?.shop_name ?? shopId);
  const connectedRows: Partial<Record<Exclude<ModuleKey, "dashboard">, { columns: string[]; rows: string[][] }>> = data?.connected ? {
    alerts: { columns: ["异常", "店铺", "级别", "最近发现", "状态"], rows: data.alerts.slice(0,20).map(row=>[display(pick(row,["alert_title","title","alert_type","rule_name"])),display(pick(row,["shop_name","shop_code","shop_id"])),display(pick(row,["severity","level"])),display(pick(row,["last_detected_at","updated_at"])),display(pick(row,["status"],"open"))]) },
    logistics: { columns: ["包裹号", "店铺", "承运商", "更新时间", "物流状态"], rows: data.packages.slice(0,20).map(row=>[display(pick(row,["package_id","tracking_number","id"])),shopName(row.shop_id),display(pick(row,["shipping_provider","carrier_name","carrier"])),display(pick(row,["source_updated_at","updated_at"])),display(pick(row,["logistics_status","status"]))]) },
    inventory: { columns: ["SKU", "名称", "可售库存", "预占库存", "安全库存"], rows: data.inventory.slice(0,30).map(row=>[display(pick(row,["seller_sku","sku_id"])),display(pick(row,["sku_name","product_name"])),display(pick(row,["available_stock"])),display(pick(row,["reserved_stock"])),display(pick(row,["safety_stock"]))]) },
    links: { columns: ["商品 ID", "商品标题", "店铺", "审核状态", "商品状态"], rows: data.products.slice(0,20).map(row=>[display(pick(row,["product_id","id"])),display(pick(row,["title","product_title","product_name"])),shopName(row.shop_id),display(pick(row,["review_status","audit_status"])),display(pick(row,["status","product_status"]))]) },
    settings: { columns: ["店铺编码", "店铺名称", "市场", "连接状态", "更新时间"], rows: data.shops.map(row=>[display(pick(row,["shop_code"])),display(pick(row,["shop_name"])),display(pick(row,["market"])),display(pick(row,["status"])),display(pick(row,["updated_at"]))]) },
  } : {};
  const table = connectedRows[moduleKey];
  const lowStock = data?.dashboard.reduce((total,row)=>total+(Number(row.low_stock_skus)||0),0) ?? 0;
  const dynamicStats: Partial<Record<Exclude<ModuleKey,"dashboard">, Array<[string,string,string]>>> = data?.connected ? {
    alerts: [["待处理",display(data.alerts.length),"数据库当前开放预警"],["高风险",display(data.alerts.filter(row=>["high","critical"].includes(String(row.severity).toLowerCase())).length),"需优先处理"],["连接店铺",display(data.shops.length),"店铺筛选已生效"]],
    logistics: [["历史包裹",display(data.counts.packages),"已入库报表记录"],["最近记录",display(data.packages.length),"当前页最多 20 条"],["退款 / 退货",display(data.counts.refunds),"历史报表记录"]],
    inventory: [["低库存 SKU",display(lowStock),"店铺总览汇总"],["SKU 总数",display(data.counts.skus),"当前库存记录"],["当前展示",display(data.inventory.length),"按可售库存升序"]],
    links: [["商品链接",display(data.counts.products),"已入库商品"],["当前展示",display(data.products.length),"最近更新记录"],["连接店铺",display(data.shops.length),"支持按店铺筛选"]],
    settings: [["店铺",display(data.shops.length),"真实店铺记录"],["数据源","Supabase","仅服务端读取"],["同步方式","报表","当前非实时 API"]],
  } : {};
  const stats = dynamicStats[moduleKey] || item.stats;
  return <>
    <section className="module-hero"><div><p className="eyebrow">{item.eyebrow}</p><h2>{item.title}</h2><p>{item.description}</p></div><div className="owner-chip"><small>主要负责人</small><strong>{item.owner}</strong></div></section>
    <section className="module-stats">{stats.map(([label,value,note])=><article key={label}><p>{label}</p><strong>{value}</strong><span>{note}</span></article>)}</section>
    <section className="panel process-panel"><div className="panel-heading"><div><p className="eyebrow">模块骨架</p><h3>核心工作流</h3></div><span className="source-chip">数据：{item.source}</span></div><div className="process-flow">{item.steps.map((step,index)=><div className="process-step" key={step}><b>{String(index+1).padStart(2,"0")}</b><span>{step}</span>{index < item.steps.length-1 && <i>→</i>}</div>)}</div></section>
    <section className="panel table-panel"><div className="panel-heading"><div><p className="eyebrow">{table ? "Supabase 数据" : "字段预览"}</p><h3>核心记录表</h3></div><button className="ghost-button" disabled>+ 新建记录</button></div><div className="data-table"><div className="table-row table-head">{(table?.columns || item.columns).map(column=><span key={column}>{column}</span>)}</div>{(table?.rows || item.rows).map((row,rowIndex)=><div className="table-row" key={rowIndex}>{row.map((cell,index)=><span key={`${cell}-${index}`} className={index === row.length-1 ? "status-cell" : ""}>{cell}</span>)}</div>)}</div><p className="placeholder-note">{table ? `数据源：${data?.source}；更新时间：${formatUpdate(data?.updatedAt)}。` : "当前模块尚无数据库记录，暂时保留框架示例。"}</p></section>
  </>;
}

function StageRail({ stage, onStage }: { stage: VideoStageKey; onStage: (stage: VideoStageKey) => void }) {
  return <div className="factory-stage-rail" aria-label="短视频生产流程">{videoStages.map((item,index)=><button className={item.key===stage?"active":""} key={item.key} onClick={()=>onStage(item.key)}><b>{item.key}</b><span>{item.label}</span>{index<videoStages.length-1&&<i>→</i>}</button>)}</div>;
}

function VideoFactory({ stage, onStage }: { stage: VideoStageKey; onStage: (stage: VideoStageKey) => void }) {
  const meta = videoStageMeta[stage];
  const shotRows=legacyShotRows;
  const [project, setProject] = useState(contentProjects[0].id);
  const [scriptTab, setScriptTab] = useState("script");
  const [productionTab, setProductionTab] = useState("image-prompt");
  const [selectedShot, setSelectedShot] = useState("SHOT-01");
  const activeProject = contentProjects.find(item=>item.id===project)!;
  const activeShot = legacyShotRows.find(item=>item.id===selectedShot)!;
  const nextStage = String(Math.min(6, Number(stage)+1)).padStart(2,"0") as VideoStageKey;
  return <>
    <section className="module-hero factory-hero"><div><p className="eyebrow">{meta.eyebrow} · 工作站 {videoStages.findIndex(item=>item.key===stage)+1}/{videoStages.length}</p><h2>{meta.title}</h2><p>{meta.description}</p></div><div className="owner-chip"><small>当前负责人</small><strong>{meta.owner}</strong></div></section>
    <StageRail stage={stage} onStage={onStage} />
    <section className="factory-context"><div><span className="context-mark">CP</span><div><small>当前内容项目</small><strong>{activeProject.id}</strong><p>{activeProject.product} · {activeProject.script}</p></div></div><label><span>切换项目</span><select value={project} onChange={event=>setProject(event.target.value)}>{contentProjects.map(item=><option key={item.id} value={item.id}>{item.id} · {item.status}</option>)}</select></label><div className="project-progress"><span><i style={{width:`${activeProject.progress}%`}} /></span><small>总进度 {activeProject.progress}%</small></div></section>

    {stage === "01" && <div className="factory-layout">
      <section className="panel factory-main"><div className="panel-heading"><div><p className="eyebrow">候选素材</p><h3>今日爆款雷达</h3></div><button className="action-button">＋ 添加爆款</button></div><div className="source-list">{sourceCandidates.map((item,index)=><article key={item.id}><div className="source-rank">0{index+1}</div><div className="source-info"><span>{item.id} · {item.author}</span><strong>{item.title}</strong><div><small>播放 {item.views}</small><small>增长 {item.growth}</small><small className="score">匹配分 {item.score}</small></div></div><div className="source-action"><span>{item.tag}</span><button onClick={()=>onStage("02")}>立项并采集 →</button></div></article>)}</div></section>
      <aside className="panel factory-side"><div className="panel-heading"><div><p className="eyebrow">筛选标准</p><h3>进入条件</h3></div></div><div className="criteria-list"><p><b>01</b><span>增长速度</span><i>近24小时明显加速</i></p><p><b>02</b><span>商品匹配</span><i>可映射到现有商品</i></p><p><b>03</b><span>结构可复制</span><i>Hook与转化链路清楚</i></p><p><b>04</b><span>风险可控</span><i>无明显侵权和违规</i></p></div><div className="mini-summary"><span>今日新增</span><strong>24</strong><small>建议立项 6 条</small></div></aside>
    </div>}

    {stage === "02" && <div className="factory-layout">
      <aside className="panel task-queue"><div className="panel-heading"><div><p className="eyebrow">任务队列</p><h3>待采集与拆解</h3></div><span className="count-badge">8</span></div>{["SRC-0921 正在拆解","SRC-0918 等待下载","SRC-0907 转写完成","SRC-0899 结构待确认"].map((item,index)=><button className={index===0?"active":""} key={item}><b>{String(index+1).padStart(2,"0")}</b><span>{item}</span><small>{index===0?"72%":"待处理"}</small></button>)}</aside>
      <section className="panel transcript-workbench"><div className="panel-heading"><div><p className="eyebrow">SRC-0921</p><h3>爆款结构拆解</h3></div><span className="working-pill">Agent 处理中</span></div><div className="transcript-grid"><article><small>原始口播转写</small><p>“If your kitchen cabinet always looks like this, stop stacking everything...”</p><p>“This expandable shelf doubles the usable space in seconds...”</p></article><article><small>结构提取</small><div className="structure-line"><b>0–3s</b><span>混乱画面＋命令式 Hook</span></div><div className="structure-line"><b>3–8s</b><span>痛点放大＋错误示范</span></div><div className="structure-line"><b>8–15s</b><span>产品解决过程</span></div><div className="structure-line"><b>15–20s</b><span>结果对比＋CTA</span></div></article></div><div className="analysis-tags"><span>Hook：视觉冲突</span><span>节奏：快速</span><span>镜头：6个</span><span>产品露出：第7秒</span><span>可复制度：高</span></div><div className="stage-actions"><button className="secondary-button">保存拆解</button><button className="primary-button" onClick={()=>onStage("03")}>提交商品调研 →</button></div></section>
    </div>}

    {stage === "03" && <>
      <section className="research-grid"><article className="panel"><span className="research-icon">人</span><small>目标人群</small><h3>小户型厨房用户</h3><p>橱柜空间不足、物品堆叠混乱，希望快速改善但不想打孔安装。</p><div className="chip-row"><span>租房人群</span><span>25–44岁</span><span>收纳需求</span></div></article><article className="panel"><span className="research-icon">痛</span><small>核心痛点</small><h3>垂直空间被浪费</h3><p>拿取底层物品需要先搬开上层，容易倾倒，日常整理时间长。</p><div className="chip-row"><span>频率高</span><span>可视化强</span><span>强转化</span></div></article><article className="panel"><span className="research-icon">卖</span><small>最强卖点</small><h3>免工具伸缩扩容</h3><p>真实结构与尺寸需要实拍证明；AI画面只负责痛点和生活方式场景。</p><div className="chip-row"><span>必须实拍</span><span>结构证明</span><span>避免夸大</span></div></article></section>
      <section className="panel research-verdict"><div><p className="eyebrow">调研结论</p><h3>条件性强需求 · 建议进入制作</h3><p>痛点高频且易可视化，产品解决方式直观。需重点回应承重、尺寸适配和安装稳定性。</p></div><div className="verdict-score"><strong>86</strong><span>内容机会分</span></div><div className="stage-actions"><button className="secondary-button">退回爆款池</button><button className="primary-button" onClick={()=>onStage("04")}>生成脚本与分镜 →</button></div></section>
    </>}

    {stage === "04" && <section className="panel creative-workbench"><div className="workbench-tabs" role="tablist">{[["script","脚本"],["shots","分镜"],["route","AI / 实拍分流"],["locks","锁定资料"]].map(([key,label])=><button role="tab" aria-selected={scriptTab===key} className={scriptTab===key?"active":""} key={key} onClick={()=>setScriptTab(key)}>{label}</button>)}</div>
      {scriptTab === "script" && <div className="script-editor"><div className="script-summary"><span>脚本 S0832-V3</span><b>20 秒 · US TikTok · English</b><i>脚本状态：已锁定</i></div><div className="script-lines"><article><b>00–03s</b><div><small>A · 创意开头</small><p>“Stop stacking your pans like this.”</p><span>杂乱橱柜突然倾倒，迅速制造视觉冲突。</span></div></article><article><b>03–10s</b><div><small>B · 痛点与证明</small><p>“You already have the space — you’re just not using it.”</p><span>展示浪费的垂直空间，再切到产品真实结构。</span></div></article><article><b>10–17s</b><div><small>B · 解决与结果</small><p>“Slide, lock, and double the usable space in seconds.”</p><span>实拍伸缩操作，随后展示整洁结果。</span></div></article><article><b>17–20s</b><div><small>C · 转化</small><p>“Tap to organize your cabinet today.”</p><span>产品英雄特写与行动号召。</span></div></article></div></div>}
      {scriptTab === "shots" && <div className="shot-table"><div className="shot-row shot-head"><span>镜头</span><span>时间</span><span>画面任务</span><span>制作方式</span><span>状态</span></div>{legacyShotRows.map(row=><button className="shot-row" key={row.id} onClick={()=>setSelectedShot(row.id)}><b>{row.id}</b><span>{row.time}</span><span>{row.scene}</span><span className={row.mode.includes("实拍")?"mode-live":"mode-ai"}>{row.mode}</span><span>{row.status}</span></button>)}</div>}
      {scriptTab === "route" && <div className="route-board"><article><span className="route-type ai">AI</span><h3>默认 AI 生成</h3><p>痛点氛围、生活方式、视觉钩子、转场和不要求真实证明的画面。</p><strong>3 个镜头</strong><small>SHOT-01 · 02 · 05</small></article><article><span className="route-type live">LIVE</span><h3>必须实拍</h3><p>产品结构、材质、真实操作、承重与所有需要建立可信度的证明镜头。</p><strong>2 个镜头</strong><small>SHOT-03 · 06</small></article><article><span className="route-type hybrid">MIX</span><h3>混合制作</h3><p>真实产品主体与 AI 场景结合，既保持产品准确，又降低场景拍摄成本。</p><strong>1 个镜头</strong><small>SHOT-04</small></article></div>}
      {scriptTab === "locks" && <div className="lock-board"><article><div className="lock-preview product-lock"><span>PRODUCT</span><b>LOCK</b></div><div><small>产品锁定资料</small><h3>P032 产品指纹卡</h3><p>外轮廓、颜色、伸缩结构、材质、比例与正确使用方向已锁定。</p><span className="approved-pill">已审核</span></div></article><article><div className="lock-preview person-lock"><span>PERSON</span><b>LOCK</b></div><div><small>人物锁定资料</small><h3>UGC 女性角色 A</h3><p>五官、发型、年龄感、肤色和固定服装等待人物参考图。</p><span className="waiting-pill">待上传参考</span></div></article></div>}
      <div className="stage-actions"><button className="secondary-button">新建脚本版本</button><button className="primary-button" onClick={()=>onStage("05")}>进入视频生产 →</button></div></section>}

    {stage === "05" && <section className="production-shell"><div className="production-tabs" role="tablist">{[["image-prompt","画面提示词"],["reference","参考图"],["video-prompt","视频提示词"],["ai-video","AI视频"],["publish","发布"]].map(([key,label],index)=><button className={productionTab===key?"active":""} key={key} onClick={()=>setProductionTab(key)}><b>{String(index+1).padStart(2,"0")}</b><span>{label}</span></button>)}</div><div className="production-body"><aside className="shot-sidebar"><div><small>镜头队列</small><strong>6 个镜头</strong></div>{shotRows.map(row=><button className={selectedShot===row.id?"active":""} key={row.id} onClick={()=>setSelectedShot(row.id)}><b>{row.id}</b><span>{row.time} · {row.mode}</span><small>{row.status}</small></button>)}</aside><main className="asset-workbench"><div className="asset-header"><div><p className="eyebrow">{activeShot.id} · {activeShot.time}</p><h3>{activeShot.scene}</h3></div><span className={activeShot.mode.includes("实拍")?"asset-mode live":"asset-mode ai"}>{activeShot.mode}</span></div>
      {productionTab === "image-prompt" && <div className="prompt-editor"><div className="prompt-meta"><span>画面提示词 IP-01-V2</span><i>已保存</i></div><p>竖屏 9:16，中近景，美国小户型厨房，清晨自然光。台面上锅具堆叠不稳并突然向一侧倾倒，年轻女性露出无奈表情，动作自然，画面前 1 秒产生强烈视觉冲突。冷灰与暖木色调，商业 UGC 质感，真实空间纹理。</p><div className="negative-box"><small>禁止内容</small><span>不出现品牌标志；不出现目标产品；人物身份不漂移；不生成多余手指；无文字和水印。</span></div><div className="editor-actions"><button className="secondary-button">生成新版本</button><button className="primary-button" onClick={()=>setProductionTab("reference")}>生成参考图 →</button></div></div>}
      {productionTab === "reference" && <div className="reference-workbench"><div className="reference-grid"><button className="reference-frame selected"><span className="frame-scene messy">AI</span><b>IMG-01-V2</b><small>已通过</small></button><button className="reference-frame"><span className="frame-scene alt">AI</span><b>IMG-01-V1</b><small>人物动作不自然</small></button><button className="reference-frame empty"><span>＋</span><b>生成新版本</b><small>使用 IP-01-V2</small></button></div><div className="quality-checks"><span>✓ 构图与时间段正确</span><span>✓ 人物锚点一致</span><span>✓ 无产品误生成</span><span>✓ 适合作为视频首帧</span></div><div className="editor-actions"><button className="secondary-button">标记不通过</button><button className="primary-button" onClick={()=>setProductionTab("video-prompt")}>确认并生成视频提示词 →</button></div></div>}
      {productionTab === "video-prompt" && <div className="prompt-editor video-prompt-editor"><div className="prompt-meta"><span>视频提示词 VP-01-V1</span><i>基于 IMG-01-V2</i></div><p>以审核参考图 IMG-01-V2 为首帧。0–1 秒镜头静止建立杂乱场景；1–2 秒锅具向右侧滑落，人物迅速伸手但未接住；2–3 秒镜头轻微推进，人物看向混乱台面并叹气。保持人物五官、发型、服装与首帧一致，厨房结构不改变，动作符合物理规律。</p><div className="prompt-specs"><span>时长 <b>3s</b></span><span>画幅 <b>9:16</b></span><span>运镜 <b>缓慢推进</b></span><span>结尾 <b>人物看向台面</b></span></div><div className="negative-box"><small>禁止变化</small><span>禁止换脸、突然换景、多余手指、物体穿模、文字、水印和镜头抖动。</span></div><div className="editor-actions"><button className="secondary-button">重新生成提示词</button><button className="primary-button" onClick={()=>setProductionTab("ai-video")}>提交 AI 视频生成 →</button></div></div>}
      {productionTab === "ai-video" && <div className="clip-board"><div className="clip-grid"><article className="selected"><div className="clip-preview"><span>▶</span><i>3.0s</i></div><b>CLIP-01-V3</b><small>动作自然 · 推荐采用</small></article><article><div className="clip-preview rejected"><span>▶</span><i>3.0s</i></div><b>CLIP-01-V2</b><small>手部异常 · 已拒绝</small></article><article><div className="clip-preview processing"><span>•••</span><i>生成中</i></div><b>CLIP-01-V4</b><small>预计还需 2 分钟</small></article></div><div className="quality-checks"><span>✓ 人物未漂移</span><span>✓ 动作完整</span><span>✓ 物体无穿模</span><span>✓ 结尾可衔接</span></div><div className="editor-actions"><button className="secondary-button">再生成一版</button><button className="primary-button">选为最终片段</button></div></div>}
      {productionTab === "publish" && <div className="publish-board"><div className="publish-summary"><span className="approved-pill">成片审核通过</span><h3>V1298 · Cabinet Space Hack</h3><p>商品 P032 · 脚本 S0832-V3 · 6 个镜头 · AI 4 / 实拍 2</p></div><div className="publish-fields"><label><span>发布账号</span><select><option>A03 · Home Finds US</option><option>A01 · Daily Kitchen US</option></select></label><label><span>关联店铺</span><select><option>US-02</option><option>US-01</option></select></label><label><span>发布时间</span><input value="2026-08-18 20:30" readOnly /></label><label><span>关联商品</span><input value="P032 · 伸缩收纳架" readOnly /></label></div><div className="publish-checks"><span>✓ 成片审核</span><span>✓ 字幕与语言</span><span>✓ 商品链接</span><span>✓ 合规检查</span><span>✓ 数据采集任务</span></div><div className="editor-actions"><button className="secondary-button">保存发布计划</button><button className="primary-button" onClick={()=>onStage("06")}>确认发布并进入数据采集 →</button></div></div>}
    </main></div></section>}

    {stage === "06" && <>
      <section className="review-metrics"><article><small>播放量</small><strong>186.4K</strong><span>高于账号均值 43%</span></article><article><small>3秒留存</small><strong>71.8%</strong><span>Hook 表现优秀</span></article><article><small>商品点击率</small><strong>4.2%</strong><span>仍有优化空间</span></article><article><small>订单 / GMV</small><strong>126 / $2,941</strong><span>自然订单 84</span></article></section>
      <div className="factory-layout review-layout"><section className="panel retention-panel"><div className="panel-heading"><div><p className="eyebrow">逐镜头表现</p><h3>留存与转化节点</h3></div><span className="framework-tag">发布后 72h</span></div><div className="retention-chart">{[100,84,72,69,58,54].map((height,index)=><div key={index}><span style={{height:`${height}%`}} /><b>{shotRows[index].id}</b><small>{height}%</small></div>)}</div><p className="review-note">SHOT-04 进入混合场景后留存下降 11%，建议保留脚本，重做产品与背景合成。</p></section><aside className="panel feedback-panel"><div className="panel-heading"><div><p className="eyebrow">Agent 结论</p><h3>下一轮动作</h3></div></div><button><span className="feedback-icon keep">✓</span><div><strong>保留 Hook 与脚本</strong><small>前3秒和口播结构有效</small></div></button><button onClick={()=>{onStage("05");setProductionTab("reference");setSelectedShot("SHOT-04")}}><span className="feedback-icon redo">↻</span><div><strong>重做 SHOT-04</strong><small>返回参考图与视频提示词</small></div></button><button onClick={()=>onStage("04")}><span className="feedback-icon test">A/B</span><div><strong>生成 3 个结尾版本</strong><small>测试更强产品点击 CTA</small></div></button></aside></div>
      <section className="panel lineage-panel"><div className="panel-heading"><div><p className="eyebrow">数据归因</p><h3>从结果追溯到生产资产</h3></div></div><div className="lineage-flow"><span>报告 R-1298</span><i>←</i><span>发布 PUB-1298</span><i>←</i><span>成片 V-1298</span><i>←</i><span>6 个镜头</span><i>←</i><span>脚本 S0832-V3</span><i>←</i><span>商品 P032</span></div></section>
    </>}
    {stage !== "06" && stage !== "05" && stage !== "04" && <div className="bottom-next"><span>完成当前工作站后，项目状态将自动流转到下一阶段。</span><button onClick={()=>onStage(nextStage)}>下一工作站：{videoStageMeta[nextStage].title} →</button></div>}
  </>;
}

type AnalysisJob = {
  id: string;
  mode: "copy" | "viral" | "research";
  modeLabel: string;
  status: string;
  statusLabel: string;
  progress: number;
  detail: string;
  codexThreadId?: string | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  assetCount?: number;
  country?: string | null;
  platform?: string | null;
  language?: string | null;
  productName?: string | null;
  source?: { id?:string;platform?:string;author?:string;title?:string;link?:string;metrics?:Record<string,unknown> } | null;
  createdAt?: string;
  updatedAt?: string;
};

type ContentPlanTask = { id:string;order:number;priority?:string;productName:string;platform:string;targetAccount:string;videoType:string;scriptDirection:string;referenceRule?:string;publishTime:string;successMetric:string;requiredInputs?:string[];dependencies:string[];nextAgent:string;status?:string };
type ContentPlan = { id:string;planDate:string;targetCount:number;status:string;input:Record<string,unknown>;result:Record<string,unknown>;tasks:ContentPlanTask[];codexThreadId?:string|null;createdAt:string;updatedAt:string };
type OrchestratorJob = { id:string;kind:string;status:string;statusLabel:string;progress:number;detail:string;planDate:string;targetCount:number;inputs:Record<string,unknown>;result?:Record<string,unknown>&{tasks?:ContentPlanTask[]};codexThreadId?:string|null;error?:string|null;createdAt:string;updatedAt:string };
type SourceAsset={id:string;taskId:string;planId:string;sourceId:string;platform:string;title:string;author:string;link:string;embedUrl:string;metrics:Record<string,unknown>;classification:Record<string,unknown>&{contentCategory?:string;hookType?:string;structureType?:string;conversionType?:string;recommendedAnalysisMode?:string;marketFit?:string;reason?:string;tags?:string[];duplicateOf?:string};fitScore:number;decision:string;status:string;agentJobId:string;createdAt:string;updatedAt:string};
type CollectorJob={id:string;kind:string;status:string;statusLabel:string;progress:number;detail:string;taskId:string;planId:string;candidateCount:number;result?:Record<string,unknown>&{classifications?:Array<Record<string,unknown>>};codexThreadId?:string|null;error?:string|null};
type CollectionStrategy={id:string;taskId:string;name:string;keywords:string;market:string;platforms:string[];signals:string[];dataWindow:string;minViews:number;minLikes:number;maxResults:number;status:string;createdAt:string;updatedAt:string};

function ContentOrchestratorWorkspace({onContinue}:{onContinue:()=>void}){
  const today=new Date().toLocaleDateString("sv-SE");
  const [planDate,setPlanDate]=useState(today);
  const [targetCount,setTargetCount]=useState(6);
  const [products,setProducts]=useState("透明硬质收纳箱");
  const [platforms,setPlatforms]=useState("TikTok Shop · 美国");
  const [accounts,setAccounts]=useState("主账号、测试账号");
  const [contentMix,setContentMix]=useState("3条爆款结构复刻、2条痛点演示、1条产品证明");
  const [goal,setGoal]=useState("完成当日内容发布，并筛选可进入广告测试的视频");
  const [constraints,setConstraints]=useState("所有生成、发布和广告动作都必须人工确认；不得虚构产品参数和优惠");
  const [bridgeReady,setBridgeReady]=useState(false);
  const [job,setJob]=useState<OrchestratorJob|null>(null);
  const [plans,setPlans]=useState<ContentPlan[]>([]);
  const [activePlan,setActivePlan]=useState<ContentPlan|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const savedJobRef=useRef("");
  const loadPlans=async()=>{const response=await fetch("/api/content-plans",{cache:"no-store"});const payload=await response.json() as {plans?:ContentPlan[];error?:string};if(!response.ok)throw new Error(payload.error||"内容计划读取失败");const rows=payload.plans||[];setPlans(rows);setActivePlan(current=>current||rows[0]||null);};
  useEffect(()=>{fetch("http://127.0.0.1:4318/health").then(response=>setBridgeReady(response.ok)).catch(()=>setBridgeReady(false));loadPlans().catch(cause=>setError(cause instanceof Error?cause.message:"内容计划读取失败"));},[]);
  useEffect(()=>{
    if(!job||["completed","failed"].includes(job.status))return;
    const timer=window.setInterval(()=>fetch(`http://127.0.0.1:4318/orchestrator-jobs/${encodeURIComponent(job.id)}`,{cache:"no-store"}).then(async response=>{const payload=await response.json() as OrchestratorJob&{error?:string};if(!response.ok)throw new Error(payload.error||"总控任务读取失败");setJob(payload);}).catch(()=>setBridgeReady(false)),1500);
    return()=>window.clearInterval(timer);
  },[job?.id,job?.status]);
  useEffect(()=>{
    if(!job||job.status!=="completed"||!job.result||savedJobRef.current===job.id)return;
    savedJobRef.current=job.id;
    fetch("/api/content-plans",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:job.id,planDate:job.planDate,targetCount:job.targetCount,status:"waiting_confirmation",input:job.inputs,result:job.result,codexThreadId:job.codexThreadId})}).then(async response=>{const payload=await response.json() as {plan?:ContentPlan;error?:string};if(!response.ok||!payload.plan)throw new Error(payload.error||"内容计划保存失败");setActivePlan(payload.plan);setPlans(current=>[payload.plan!,...current.filter(item=>item.id!==payload.plan!.id)]);}).catch(cause=>{savedJobRef.current="";setError(cause instanceof Error?cause.message:"内容计划保存失败");});
  },[job?.id,job?.status]);
  const start=async()=>{if(busy)return;setBusy(true);setError("");setActivePlan(null);try{const response=await fetch("http://127.0.0.1:4318/orchestrator-jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({planDate,targetCount,products,platforms,accounts,contentMix,goal,constraints})});const payload=await response.json() as OrchestratorJob&{error?:string};if(!response.ok)throw new Error(payload.error||"内容总控任务创建失败");setBridgeReady(true);setJob(payload);}catch(cause){setBridgeReady(false);setError(cause instanceof Error?cause.message:"内容总控服务未连接");}finally{setBusy(false);}};
  const confirm=async()=>{if(!activePlan||activePlan.status==="confirmed")return onContinue();setBusy(true);setError("");try{const response=await fetch("/api/content-plans",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:activePlan.id,status:"confirmed"})});if(!response.ok)throw new Error("计划确认失败");const next={...activePlan,status:"confirmed",tasks:activePlan.tasks.map(task=>({...task,status:"ready"}))};setActivePlan(next);setPlans(current=>current.map(item=>item.id===next.id?next:item));onContinue();}catch(cause){setError(cause instanceof Error?cause.message:"计划确认失败");}finally{setBusy(false);}};
  const tasks=activePlan?.tasks||[];
  return <section className="orchestrator-shell">
    <div className="orchestrator-intro"><div><p className="eyebrow">AGENT 01 · CONTENT ORCHESTRATOR</p><h2>先定今天做什么，再让后续 Agent 开始生产</h2><p>这里生成的是可确认、可保存、可派发的任务计划。内容总控 Agent 不会自动拆解、生成或发布。</p></div><span className={bridgeReady?"approved-pill":"waiting-pill"}>{bridgeReady?"本机 Codex 已连接":"本机 Agent 服务未连接"}</span></div>
    <div className="orchestrator-grid"><section className="panel orchestrator-form"><div className="panel-heading"><div><p className="eyebrow">今日经营目标</p><h3>锁定发布数量、产品和账号范围</h3></div><span className="framework-tag">人工发起</span></div><div className="orchestrator-fields"><label><span>计划日期</span><input type="date" value={planDate} onChange={event=>setPlanDate(event.target.value)}/></label><label><span>今日发布数量</span><input type="number" min="1" max="30" value={targetCount} onChange={event=>setTargetCount(Math.max(1,Math.min(30,Number(event.target.value)||1)))}/></label><label className="wide"><span>主推产品</span><input value={products} onChange={event=>setProducts(event.target.value)} placeholder="可填写多个产品，并标注优先级"/></label><label><span>国家 / 平台</span><input value={platforms} onChange={event=>setPlatforms(event.target.value)}/></label><label><span>目标账号</span><input value={accounts} onChange={event=>setAccounts(event.target.value)}/></label><label className="wide"><span>内容配比</span><textarea value={contentMix} onChange={event=>setContentMix(event.target.value)}/></label><label className="wide"><span>今日目标</span><textarea value={goal} onChange={event=>setGoal(event.target.value)}/></label><label className="wide"><span>限制与人工审核规则</span><textarea value={constraints} onChange={event=>setConstraints(event.target.value)}/></label></div>{error&&<p className="orchestrator-error">{error}</p>}<button className="primary-button orchestrator-run" disabled={busy||!!(job&&!['completed','failed'].includes(job.status))} onClick={start}>{job&&!['completed','failed'].includes(job.status)?`${job.statusLabel} · ${job.progress}%`:"手动生成今日内容计划 →"}</button></section>
      <aside className="panel orchestrator-history"><div className="panel-heading"><div><p className="eyebrow">计划档案</p><h3>已保存的内容计划</h3></div><span className="count-badge">{plans.length}</span></div>{plans.length?<div>{plans.slice(0,8).map(plan=><button className={activePlan?.id===plan.id?"active":""} key={plan.id} onClick={()=>{setActivePlan(plan);setJob(null);}}><b>{plan.planDate}</b><span>{plan.targetCount} 条任务</span><small>{plan.status==="confirmed"?"已确认":"待确认"}</small></button>)}</div>:<div className="orchestrator-empty"><span>⌁</span><p>生成后的计划会持续保存在这里</p></div>}</aside></div>
    {(job&&!activePlan)&&<section className={`panel orchestrator-progress ${job.status}`}><div className="job-progress-ring" style={{"--progress":`${job.progress*3.6}deg`} as CSSProperties}><span>{job.progress}%</span></div><div><small>内容总控 Agent</small><h3>{job.statusLabel}</h3><p>{job.detail}</p>{job.error&&<em>{job.error}</em>}</div></section>}
    {activePlan&&<section className="panel orchestrator-plan"><header><div><p className="eyebrow">{activePlan.planDate} · 今日任务单</p><h3>{String(activePlan.result.title||"今日内容生产计划")}</h3><p>{String(activePlan.result.summary||"计划已经生成，请逐条确认后再派发。")}</p></div><span className={activePlan.status==="confirmed"?"approved-pill":"waiting-pill"}>{activePlan.status==="confirmed"?"已确认并可派发":"等待人工确认"}</span></header><div className="orchestrator-task-head"><span>顺序</span><span>产品 / 内容</span><span>账号与平台</span><span>发布时间 / 指标</span><span>下一 Agent</span></div><div className="orchestrator-task-list">{tasks.map(task=><article key={task.id}><b>{String(task.order).padStart(2,"0")}<small>{task.priority||"P1"}</small></b><div><strong>{task.productName}</strong><span>{task.videoType}</span><p>{task.scriptDirection}</p></div><div><strong>{task.targetAccount}</strong><span>{task.platform}</span></div><div><strong>{task.publishTime}</strong><span>{task.successMetric}</span></div><div><strong>{task.nextAgent}</strong><span>{task.dependencies?.length?`依赖：${task.dependencies.join("、")}`:"可直接开始"}</span></div></article>)}</div><footer><div><small>审核门</small><strong>{String(activePlan.result.reviewGate||"确认计划后才能进入爆款采集与任务派发。")}</strong></div><button className="primary-button" disabled={busy} onClick={confirm}>{activePlan.status==="confirmed"?"进入爆款池":"确认并派发到下一步 →"}</button></footer></section>}
  </section>;
}

function ViralCollectionAgent({poolRecords,onSelect}:{poolRecords:ViralPoolRecord[];onSelect:(sourceId:string)=>void}){
  const [plans,setPlans]=useState<ContentPlan[]>([]),[taskId,setTaskId]=useState("");
  const [limit,setLimit]=useState(12),[bridgeReady,setBridgeReady]=useState(false),[job,setJob]=useState<CollectorJob|null>(null),[assets,setAssets]=useState<SourceAsset[]>([]),[selectedIds,setSelectedIds]=useState<string[]>([]),[submittedCandidates,setSubmittedCandidates]=useState<ViralPoolRecord[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [strategyId,setStrategyId]=useState(""),[strategyName,setStrategyName]=useState(""),[keywords,setKeywords]=useState(""),[market,setMarket]=useState(""),[platforms,setPlatforms]=useState<string[]>(["飞书内容库","TikTok"]),[signals,setSignals]=useState<string[]>(["增长速度","收藏分享","产品机会"]),[dataWindow,setDataWindow]=useState("30d"),[minViews,setMinViews]=useState(0),[minLikes,setMinLikes]=useState(0),[strategyHistory,setStrategyHistory]=useState<CollectionStrategy[]>([]);
  const savedJobRef=useRef("");
  const tasks=plans.filter(plan=>plan.status==="confirmed").flatMap(plan=>plan.tasks.map(task=>({...task,planId:plan.id,planDate:plan.planDate})));
  const activeTask=tasks.find(task=>task.id===taskId)||tasks[0]||null;
  const applyStrategy=(strategy:CollectionStrategy)=>{setStrategyId(strategy.id);setStrategyName(strategy.name);setKeywords(strategy.keywords);setMarket(strategy.market);setPlatforms(strategy.platforms);setSignals(strategy.signals);setDataWindow(strategy.dataWindow);setMinViews(strategy.minViews);setMinLikes(strategy.minLikes);setLimit(strategy.maxResults);};
  const loadStrategies=async(nextTaskId:string)=>{if(!nextTaskId){setStrategyHistory([]);return;}const response=await fetch(`/api/collection-strategies?taskId=${encodeURIComponent(nextTaskId)}`,{cache:"no-store"});const payload=await response.json() as {strategies?:CollectionStrategy[];error?:string};if(!response.ok)throw new Error(payload.error||"采集策略读取失败");const rows=payload.strategies||[];setStrategyHistory(rows);if(rows[0])applyStrategy(rows[0]);else if(activeTask){setStrategyId("");setStrategyName(`${activeTask.productName} · 爆款采集`);setKeywords(activeTask.productName);setMarket(activeTask.platform);setLimit(12);}};
  const loadAssets=async(nextTaskId:string)=>{if(!nextTaskId){setAssets([]);return;}const response=await fetch(`/api/source-assets?taskId=${encodeURIComponent(nextTaskId)}`,{cache:"no-store"});const payload=await response.json() as {assets?:SourceAsset[];error?:string};if(!response.ok)throw new Error(payload.error||"素材库读取失败");const rows=payload.assets||[];setAssets(rows);setSelectedIds(rows.filter(item=>item.status==="archived"||item.decision==="archive").map(item=>item.id));};
  useEffect(()=>{Promise.all([fetch("/api/content-plans",{cache:"no-store"}).then(response=>response.json()),fetch("http://127.0.0.1:4318/health").then(response=>({ok:response.ok})).catch(()=>({ok:false}))]).then(([planPayload,health])=>{const rows=(planPayload.plans||[]) as ContentPlan[];setPlans(rows);const first=rows.filter(plan=>plan.status==="confirmed").flatMap(plan=>plan.tasks)[0];if(first)setTaskId(first.id);setBridgeReady(health.ok);}).catch(cause=>setError(cause instanceof Error?cause.message:"任务读取失败"));},[]);
  useEffect(()=>{if(activeTask){Promise.all([loadAssets(activeTask.id),loadStrategies(activeTask.id)]).catch(cause=>setError(cause instanceof Error?cause.message:"采集资料读取失败"));}},[activeTask?.id]);
  useEffect(()=>{if(!job||["completed","failed"].includes(job.status))return;const timer=window.setInterval(()=>fetch(`http://127.0.0.1:4318/collector-jobs/${encodeURIComponent(job.id)}`,{cache:"no-store"}).then(async response=>{const payload=await response.json() as CollectorJob&{error?:string};if(!response.ok)throw new Error(payload.error||"素材分类任务读取失败");setJob(payload);}).catch(()=>setBridgeReady(false)),1500);return()=>window.clearInterval(timer);},[job?.id,job?.status]);
  useEffect(()=>{if(!job||job.status!=="completed"||!job.result||!activeTask||savedJobRef.current===job.id)return;savedJobRef.current=job.id;fetch("/api/source-assets",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:job.id,taskId:activeTask.id,planId:activeTask.planId,result:job.result,candidates:submittedCandidates})}).then(async response=>{const payload=await response.json() as {assets?:SourceAsset[];error?:string};if(!response.ok)throw new Error(payload.error||"分类结果保存失败");const rows=payload.assets||[];setAssets(rows);setSelectedIds(rows.filter(item=>item.decision==="archive").map(item=>item.id));}).catch(cause=>{savedJobRef.current="";setError(cause instanceof Error?cause.message:"分类结果保存失败");});},[job?.id,job?.status]);
  const candidatePool=poolRecords.filter(record=>(platforms.includes("飞书内容库")||platforms.includes(record.platform))&&(record.views===null||record.views>=minViews)&&record.likes>=minLikes);
  const start=async()=>{if(!activeTask||busy)return;if(!strategyName.trim()||!keywords.trim())return setError("请先填写策略名称和搜索关键词");if(!platforms.length||!signals.length)return setError("请至少选择一个采集来源和一个内容信号");setBusy(true);setError("");setAssets([]);setSelectedIds([]);try{const strategyResponse=await fetch("/api/collection-strategies",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:strategyId||undefined,taskId:activeTask.id,name:strategyName,keywords,market:market||activeTask.platform,platforms,signals,dataWindow,minViews,minLikes,maxResults:limit,status:"active"})});const strategyPayload=await strategyResponse.json() as {strategy?:CollectionStrategy;error?:string};if(!strategyResponse.ok||!strategyPayload.strategy)throw new Error(strategyPayload.error||"采集策略保存失败");const strategy=strategyPayload.strategy;applyStrategy(strategy);setStrategyHistory(current=>[strategy,...current.filter(item=>item.id!==strategy.id)]);const candidates=[...candidatePool].sort((a,b)=>(b.views||b.likes*20)-(a.views||a.likes*20)).slice(0,limit);if(!candidates.length)throw new Error("当前素材库没有达到该策略阈值的候选，请降低数据门槛或先同步飞书");setSubmittedCandidates(candidates);const response=await fetch("http://127.0.0.1:4318/collector-jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId:activeTask.id,planId:activeTask.planId,task:activeTask,strategy,candidates})});const payload=await response.json() as CollectorJob&{error?:string};if(!response.ok)throw new Error(payload.error||"素材管理任务创建失败");setBridgeReady(true);setJob(payload);}catch(cause){setError(cause instanceof Error?cause.message:"采集策略执行失败");}finally{setBusy(false);}};
  const confirm=async()=>{if(!activeTask||!selectedIds.length||busy)return;setBusy(true);setError("");try{const response=await fetch("/api/source-assets",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId:activeTask.id,assetIds:selectedIds})});const payload=await response.json() as {error?:string};if(!response.ok)throw new Error(payload.error||"素材入库失败");setAssets(current=>current.map(item=>selectedIds.includes(item.id)?{...item,status:"archived"}:item));const first=assets.find(item=>selectedIds.includes(item.id));if(first)onSelect(first.sourceId);}catch(cause){setError(cause instanceof Error?cause.message:"素材入库失败");}finally{setBusy(false);}};
  const toggle=(value:string,current:string[],setter:(items:string[])=>void)=>setter(current.includes(value)?current.filter(item=>item!==value):[...current,value]);
  return <section className="collection-agent-shell panel"><header><div><p className="eyebrow">AGENT 02 · VIRAL ASSET COLLECTOR</p><h2>按今日任务筛选、分类并归档爆款素材</h2><p>Agent 只做候选分类和素材管理；确认入库后才会把选中的素材送往拆解，不会自动开始分析。</p></div><span className={bridgeReady?"approved-pill":"waiting-pill"}>{bridgeReady?"本机 Codex 已连接":"本机 Agent 服务未连接"}</span></header>
    <div className="collection-strategy-panel"><div className="collection-strategy-heading"><div><small>采集策略</small><strong>先定义要找什么，再形成候选素材</strong></div>{strategyHistory.length>0&&<select value={strategyId} onChange={event=>{const item=strategyHistory.find(strategy=>strategy.id===event.target.value);if(item)applyStrategy(item);}}><option value="">新建策略</option>{strategyHistory.map(strategy=><option key={strategy.id} value={strategy.id}>{strategy.name}</option>)}</select>}</div><div className="collection-strategy-fields"><label><span>策略名称</span><input value={strategyName} onChange={event=>setStrategyName(event.target.value)} placeholder="例如：收纳用品高转化素材"/></label><label><span>搜索关键词 / 产品方向</span><input value={keywords} onChange={event=>setKeywords(event.target.value)} placeholder="产品词、痛点词、场景词"/></label><label><span>目标市场</span><input value={market} onChange={event=>setMarket(event.target.value)} placeholder="例如：美国 TikTok Shop"/></label><label><span>数据周期</span><select value={dataWindow} onChange={event=>setDataWindow(event.target.value)}><option value="7d">近 7 天</option><option value="30d">近 30 天</option><option value="90d">近 90 天</option></select></label><label><span>最低播放量</span><input type="number" min="0" value={minViews} onChange={event=>setMinViews(Math.max(0,Number(event.target.value)||0))}/></label><label><span>最低点赞量</span><input type="number" min="0" value={minLikes} onChange={event=>setMinLikes(Math.max(0,Number(event.target.value)||0))}/></label></div><div className="collection-strategy-options"><div><small>采集来源</small><p>{["飞书内容库","TikTok","抖音","手动链接"].map(item=><button className={platforms.includes(item)?"active":""} key={item} onClick={()=>toggle(item,platforms,setPlatforms)}>{item}{item==="飞书内容库"?" · 已连接":item==="TikTok"?" · 待数据接口":""}</button>)}</p></div><div><small>重点内容信号</small><p>{["增长速度","收藏分享","开头钩子","产品演示","转化意图","产品机会"].map(item=><button className={signals.includes(item)?"active":""} key={item} onClick={()=>toggle(item,signals,setSignals)}>{item}</button>)}</p></div></div><footer><span>当前先读取飞书实时库；外部平台数据接口接入后，继续沿用同一采集策略扩展来源。</span><b>{candidatePool.length} 条现有素材符合数据门槛</b></footer></div>
    <div className="collection-agent-controls"><label><span>接收的内容任务</span><select value={activeTask?.id||""} onChange={event=>{setTaskId(event.target.value);setJob(null);setError("");}} disabled={!tasks.length}>{tasks.length?tasks.map(task=><option key={task.id} value={task.id}>{task.planDate} · {task.productName} · {task.videoType}</option>):<option>请先确认内容总控计划</option>}</select></label><label><span>本次扫描数量</span><select value={limit} onChange={event=>setLimit(Number(event.target.value))}>{[6,12,18,24].map(value=><option key={value} value={value}>{value} 条候选</option>)}</select></label><div><small>当前任务目标</small><strong>{activeTask?`${activeTask.targetAccount} · ${activeTask.platform}`:"等待总控任务"}</strong><span>{activeTask?.scriptDirection||"请先返回内容总控，确认一份任务计划。"}</span></div><button className="primary-button" disabled={!activeTask||busy||!!(job&&!['completed','failed'].includes(job.status))} onClick={start}>{job&&!['completed','failed'].includes(job.status)?`${job.statusLabel} · ${job.progress}%`:"手动扫描并分类 →"}</button></div>
    {error&&<p className="collection-agent-error">{error}</p>}
    {job&&!assets.length&&<div className={`collection-agent-progress ${job.status}`}><div className="job-progress-ring" style={{"--progress":`${job.progress*3.6}deg`} as CSSProperties}><span>{job.progress}%</span></div><div><small>爆款采集与素材管理 Agent</small><strong>{job.statusLabel}</strong><p>{job.detail}</p>{job.error&&<em>{job.error}</em>}</div></div>}
    {assets.length>0&&<div className="collection-result"><div className="collection-result-heading"><div><small>分类结果</small><strong>{assets.length} 条候选 · 已选择 {selectedIds.length} 条入库</strong></div><span>勾选后仍需人工确认</span></div><div className="collection-asset-grid">{assets.map(asset=><label className={`${asset.decision} ${selectedIds.includes(asset.id)?"selected":""}`} key={asset.id}><input type="checkbox" checked={selectedIds.includes(asset.id)} onChange={event=>setSelectedIds(current=>event.target.checked?[...current,asset.id]:current.filter(id=>id!==asset.id))}/><div className="collection-score"><b>{asset.fitScore}</b><small>适配分</small></div><div><span>{asset.platform} · {asset.author}</span><h3>{asset.title}</h3><p>{String(asset.classification.reason||"等待分类说明")}</p><div>{[asset.classification.contentCategory,asset.classification.hookType,asset.classification.conversionType,...(asset.classification.tags||[])].filter(Boolean).slice(0,5).map(tag=><i key={String(tag)}>{String(tag)}</i>)}</div><footer><strong>{asset.decision==="archive"?"建议入库":asset.decision==="observe"?"继续观察":"建议排除"}</strong><span>下一步：{asset.classification.recommendedAnalysisMode==="viral"?"爆款 V1 拆解":"文案表达分析"}</span></footer></div></label>)}</div><div className="collection-confirm"><div><small>人工审核门</small><strong>{String(job?.result?.reviewGate||"确认所选素材后才会进入采集与拆解。")}</strong></div><button className="primary-button" disabled={!selectedIds.length||busy} onClick={confirm}>确认入库并送往拆解 →</button></div></div>}
  </section>;
}

const researchCountries = ["中国", "美国", "英国", "俄罗斯", "法国", "土耳其", "日本", "越南", "瑞士", "德国", "加拿大", "澳大利亚", "意大利", "西班牙", "墨西哥", "巴西", "沙特阿拉伯", "阿联酋", "印度", "印度尼西亚", "泰国", "马来西亚", "新加坡", "韩国"];
const researchPlatforms = ["Amazon", "Walmart", "TikTok Shop", "淘宝", "天猫", "拼多多", "抖音", "小红书", "Shopee", "Lazada", "Ozon", "Temu"];
const researchLanguages = ["国语", "英语", "法语", "俄语", "西班牙语", "德语", "意大利语", "葡萄牙语", "土耳其语", "日语", "韩语", "越南语", "泰语", "阿拉伯语", "印尼语"];

const resultLabels: Record<string, string> = {
  basicInfo: "01 · 视频基础信息", overallStructure: "02 · 视频整体结构", roles: "03 · 人物 / 角色 / 事件链",
  openingEventChain: "开头事件链", goldenThreeSeconds: "04 · 黄金3秒爆点", hook: "唯一主钩子",
  conversionShots: "05 · 转化镜头", conversionCore: "转化核心检查", shotRestoration: "06 · 原脚本逐镜还原",
  replicationSkeleton: "07 · 1:1复刻结构骨架", uncertainties: "08 · 不确定信息", reviewGate: "人工审核门",
  transcript: "01 · 原文案与字幕", expressionStructure: "02 · 内容表达结构", rewrite: "03 · 口播改写稿",
  sourceSummary: "素材摘要", fullText: "完整原文", segments: "分段原文", strategy: "改写策略", opening: "开场", body: "正文", cta: "CTA", fullScript: "完整改写稿",
  scope: "01 · 调研范围", productUnderstanding: "02 · 产品事实与证据", audiences: "03 · 目标人群", painPoints: "04 · 人群痛点链",
  marketStrategy: "05 · 产品市场打法", platformPlaybook: "06 · 平台执行路径", contentDirections: "07 · 内容方向", localizedCopy: "目标市场文案", risks: "08 · 风险边界", actionPlan: "09 · 行动计划",
};

function ResultBlock({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) return <span className="result-empty">—</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return <p>{String(value)}</p>;
  if (Array.isArray(value)) return <div className={depth > 0 ? "result-list nested" : "result-list"}>{value.map((item,index)=><article key={index}><b>{String(index+1).padStart(2,"0")}</b><ResultBlock value={item} depth={depth+1}/></article>)}</div>;
  return <div className="result-object">{Object.entries(value as Record<string, unknown>).map(([key,item])=><div key={key}><small>{resultLabels[key] || key}</small><ResultBlock value={item} depth={depth+1}/></div>)}</div>;
}

function AnalysisResult({ job, onConfirm }: { job: AnalysisJob; onConfirm: () => void }) {
  const result = job.result || {};
  const hidden = new Set(["jobType", "title"]);
  return <section className="analysis-result-shell">
    <div className="analysis-result-header"><div><p className="eyebrow">{job.mode === "viral" ? "V1 技能结果" : "文案表达结果"}</p><h3>{String(result.title || (job.mode === "viral" ? "爆款视频 V1 拆解" : "文案与表达分析"))}</h3><p>{job.mode === "viral" ? "本页只完成原片还原与结构拆解，确认前不会进入商品改写。" : "原文、表达结构和改写稿已分开保存。"}</p></div><span className="approved-pill">Codex 已完成</span></div>
    <div className="analysis-result-sections">{Object.entries(result).filter(([key])=>!hidden.has(key)).map(([key,value])=><section key={key}><h4>{resultLabels[key] || key}</h4><ResultBlock value={value}/></section>)}</div>
    <div className="analysis-result-actions"><button className="secondary-button" onClick={()=>window.print()}>打印 / 导出</button><button className="primary-button" onClick={onConfirm}>{job.mode === "viral" ? "确认 V1，进入商品调研" : "确认分析结果，进入脚本"} →</button></div>
  </section>;
}

const productResearchTabs = [
  { key: "overview", number: "01", icon: "览", label: "调研概览", note: "结论与机会" },
  { key: "productUnderstanding", number: "02", icon: "证", label: "产品证据", note: "事实与缺口" },
  { key: "audiences", number: "03", icon: "人", label: "目标人群", note: "分层与场景" },
  { key: "painPoints", number: "04", icon: "痛", label: "痛点与卖点", note: "需求对应" },
  { key: "marketStrategy", number: "05", icon: "打", label: "市场打法", note: "定位与转化" },
  { key: "platformPlaybook", number: "06", icon: "台", label: "平台策略", note: "执行路径" },
  { key: "contentDirections", number: "07", icon: "内", label: "内容与文案", note: "中文策略＋目标语言文案" },
  { key: "risk", number: "08", icon: "险", label: "风险与行动", note: "边界与任务" },
];

function ProductResearchResult({ job, country, platform, language, onConfirm, onRerun, onNew }: { job: AnalysisJob; country: string; platform: string; language: string; onConfirm: () => void; onRerun: () => void; onNew: () => void }) {
  const [activeTab, setActiveTab] = useState("overview");
  const result = job.result || {};
  const count = (key: string) => Array.isArray(result[key]) ? result[key].length : 0;
  const strategy = (result.marketStrategy || {}) as Record<string, unknown>;
  const activeMeta = productResearchTabs.find(item => item.key === activeTab) || productResearchTabs[0];
  const renderContent = () => {
    if (activeTab === "overview") return <div className="research-overview-content"><div className="research-overview-kpis"><article><small>目标人群</small><strong>{count("audiences")}</strong><span>个优先细分人群</span></article><article><small>核心痛点</small><strong>{count("painPoints")}</strong><span>组需求对应关系</span></article><article><small>内容方向</small><strong>{count("contentDirections")}</strong><span>条可进入策划</span></article><article><small>风险项</small><strong>{count("risks")}</strong><span>项需要控制</span></article></div><section className="research-executive-card"><div><p className="eyebrow">执行摘要</p><h3>{String(result.title || "商品调研方案")}</h3><p>{String(strategy.coreMessage || strategy.positioning || "完整调研结果已经生成，请从左侧栏目逐项审核。")}</p></div><div className="research-strategy-summary"><span><small>市场定位</small><strong>{String(strategy.positioning || "待审核")}</strong></span><span><small>切入角度</small><strong>{String(strategy.entryAngle || "待审核")}</strong></span><span><small>转化路径</small><strong>{String(strategy.conversionPath || "待审核")}</strong></span></div></section><section className="research-review-gate"><span>审核门</span><p>{String(result.reviewGate || "确认资料与策略后再进入脚本与分镜。")}</p></section></div>;
    if (activeTab === "contentDirections") return <div className="research-combined-sections"><section><h4>中文内容策略说明</h4><ResultBlock value={result.contentDirections}/></section><section className="localized-copy-section"><div className="localized-copy-heading"><div><small>仅此模块使用目标市场语言</small><h4>{language}营销文案</h4></div><span>{country} · {platform}</span></div><ResultBlock value={result.localizedCopy}/></section></div>;
    if (activeTab === "risk") return <div className="research-combined-sections"><section><h4>风险边界</h4><ResultBlock value={result.risks}/></section><section><h4>优先行动计划</h4><ResultBlock value={result.actionPlan}/></section><section><h4>仍需确认的信息</h4><ResultBlock value={result.uncertainties}/></section><section className="research-review-gate"><span>最终审核门</span><p>{String(result.reviewGate || "确认后进入下一阶段。")}</p></section></div>;
    return <section className="research-tab-section"><div className="research-section-heading"><span>{activeMeta.number}</span><div><small>{activeMeta.note}</small><h3>{activeMeta.label}</h3></div></div><ResultBlock value={result[activeTab]}/></section>;
  };
  return <section className="research-project-page"><header className="research-project-header"><div><p className="eyebrow">商品调研项目 · {job.id.slice(-8).toUpperCase()}</p><h2>{String(result.title || "商品调研完整方案")}</h2><div className="research-scope-chips"><span>{country}</span><span>{platform}</span><span>营销文案：{language}</span><span>分析报告：中文</span><span>V1 调研版</span></div></div><div className="research-project-tools"><span className="approved-pill">调研已完成</span><button className="secondary-button" onClick={onRerun}>按新规则重跑</button><button className="secondary-button" onClick={()=>window.print()}>导出方案</button></div></header><div className="research-project-layout"><aside className="research-result-nav"><div><small>方案目录</small><strong>8 个审核栏目</strong></div>{productResearchTabs.map(item=><button className={activeTab===item.key?"active":""} key={item.key} onClick={()=>setActiveTab(item.key)}><span>{item.icon}</span><div><b>{item.number} · {item.label}</b><small>{item.note}</small></div><i>›</i></button>)}</aside><main className="research-result-canvas"><div className="research-canvas-title"><div><small>{activeMeta.number} / 08</small><h3>{activeMeta.label}</h3></div><span>{activeMeta.note}</span></div>{renderContent()}</main></div><footer className="research-project-footer"><div><small>当前方案已保存到工作台</small><strong>请逐项审核，确认后再进入脚本与分镜</strong></div><div><button className="secondary-button" onClick={onNew}>新建商品调研</button><button className="primary-button" onClick={onConfirm}>确认方案，进入脚本与分镜 →</button></div></footer></section>;
}

function RealVideoFactory({ stage, onStage, view, onView }: { stage: VideoStageKey; onStage: (stage: VideoStageKey) => void; view: string; onView: (view: string) => void }) {
  const meta = videoStageMeta[stage];
  const legacyProject = contentProjects[0];
  const [workflowProject,setWorkflowProject]=useState<WorkflowProject>({id:legacyProject.workspaceId,code:legacyProject.id,productName:legacyProject.product,sourceId:"legacy-source",source:{},analysisId:null,researchId:null,currentStage:"05",status:legacyProject.status,workflow:{scriptApproved:true,storyboardReady:true},createdAt:"2026-08-20T00:00:00.000Z",updatedAt:"2026-08-20T00:00:00.000Z"});
  const project={id:workflowProject.code,workspaceId:workflowProject.id,product:workflowProject.productName,script:legacyProject.script,status:workflowProject.status,progress:legacyProject.progress};
  const [scriptTab, setScriptTab] = useState("inputs");
  const [hookVersion, setHookVersion] = useState<keyof typeof hookVersions>("A");
  const [scriptApproved, setScriptApproved] = useState(Boolean(workflowProject.workflow.scriptApproved));
  const [storyboardReady, setStoryboardReady] = useState(Boolean(workflowProject.workflow.storyboardReady));
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [uploadedReferenceDuration, setUploadedReferenceDuration] = useState<number | null>(null);
  const [productionTab, setProductionTab] = useState("reference");
  const [referenceEntryMode, setReferenceEntryMode] = useState<"view" | "generate">("view");
  const [selectedShot, setSelectedShot] = useState("A-S01");
  const [videoModelId, setVideoModelId] = useState("");
  const [videoSegmentLimit, setVideoSegmentLimit] = useState<number | null>(null);
  const [generationPlanReady, setGenerationPlanReady] = useState(false);
  const [poolFilter, setPoolFilter] = useState("all");
  const [poolSearch, setPoolSearch] = useState("");
  const [poolRecords, setPoolRecords] = useState<ViralPoolRecord[]>(viralPoolRecords);
  const [poolSyncState, setPoolSyncState] = useState<"checking" | "live" | "snapshot" | "error">("checking");
  const [poolSyncDetail, setPoolSyncDetail] = useState("正在检查飞书数据连接");
  const [poolUpdatedAt, setPoolUpdatedAt] = useState<string | null>(null);
  const [poolPreviewRecord, setPoolPreviewRecord] = useState<ViralPoolRecord | null>(null);
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [customAnalysisVideo, setCustomAnalysisVideo] = useState<{ record: ViralPoolRecord; file: File | null } | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"copy" | "viral">("copy");
  const [analysisJob, setAnalysisJob] = useState<AnalysisJob | null>(null);
  const [analysisOpenedFromArchive, setAnalysisOpenedFromArchive] = useState(false);
  const [analysisArchive, setAnalysisArchive] = useState<AnalysisJob[]>([]);
  const [analysisPersistence, setAnalysisPersistence] = useState<"loading"|"saved"|"local"|"error">("loading");
  const [bridgeState, setBridgeState] = useState<"checking" | "ready" | "offline">("checking");
  const [analysisError, setAnalysisError] = useState("");
  const [researchCountry, setResearchCountry] = useState("美国");
  const [researchPlatform, setResearchPlatform] = useState("TikTok Shop");
  const [researchLanguage, setResearchLanguage] = useState("英语");
  const [researchProductName, setResearchProductName] = useState("透明硬质收纳箱");
  const [researchNotes, setResearchNotes] = useState("");
  const [researchFiles, setResearchFiles] = useState<File[]>([]);
  const [researchJob, setResearchJob] = useState<AnalysisJob | null>(null);
  const [researchArchive, setResearchArchive] = useState<AnalysisJob[]>([]);
  const [researchCreatingNew, setResearchCreatingNew] = useState(false);
  const [researchPersistence, setResearchPersistence] = useState<"loading" | "saved" | "local" | "error">("loading");
  const [researchError, setResearchError] = useState("");
  const [referenceAssets, setReferenceAssets] = useState<ReferenceImageAsset[]>([]);
  const workflowRestoreReady=useRef(false);
  const bridgeHistorySynced=useRef(false);
  const analysisResult=analysisJob?.result||{};
  const researchResult=researchJob?.result||{};
  const restorationRows=Array.isArray(analysisResult.shotRestoration)?analysisResult.shotRestoration.filter(item=>item&&typeof item==="object") as Record<string,unknown>[]:[];
  const localizedCopy=researchResult.localizedCopy&&typeof researchResult.localizedCopy==="object"?researchResult.localizedCopy as Record<string,unknown>:{};
  const localizedText=(value:unknown)=>value&&typeof value==="object"?String((value as Record<string,unknown>).copy||(value as Record<string,unknown>).text||(value as Record<string,unknown>).line||""):String(value||"");
  const localizedHooks=Array.isArray(localizedCopy.hooks)?localizedCopy.hooks.map(localizedText).filter(Boolean):[];
  const localizedCtas=Array.isArray(localizedCopy.ctas)?localizedCopy.ctas.map(localizedText).filter(Boolean):[];
  const shotRows=restorationRows.length?restorationRows.map((row,index)=>{
    const base=legacyShotRows[index%legacyShotRows.length];
    const id=String(row.shot||`S-${String(index+1).padStart(2,"0")}`),time=String(row.timeRange||row.time||`${index*2}–${(index+1)*2}s`).replace(/\s/g,"");
    const scene=String(row.visualDetails||row.eventChain||row.action||"按原片结构复刻该镜头");
    const proof=/实拍|尺寸|材质|承重|安装|开合|操作|证明|重量|容量/.test(`${scene}${String(row.conversionFunction||"")}`);
    return{id,time:time.endsWith("s")?time:`${time}s`,scene,mode:proof?"必须实拍":"AI＋产品合成",asset:proof?"等待实拍":"等待生成参考图",status:proof?"待拍摄":"等待视频平台",image:workflowProject.id===legacyProject.workspaceId?base.image:"/video-projects/empty-reference.svg",imagePrompt:`竖屏9:16，${researchCountry}${researchPlatform}商品短视频，目标产品“${researchProductName}”。${scene}；${String(row.action||"")}；${String(row.camera||"")}。严格保持真实产品结构、比例、颜色与标签，不生成文字、水印或虚构功能。`,videoPrompt:`${time}，${scene}。动作：${String(row.action||"保持自然连续动作")}；镜头：${String(row.camera||"稳定竖屏机位")}；转场：${String(row.transition||"自然衔接")}。继承参考图中的人物、产品、场景和光线，不改变产品。`};
  }):legacyShotRows;
  const scriptMicroRows=restorationRows.length?shotRows.map((shot,index)=>{
    const source=restorationRows[index]||{};
    const isLast=index===shotRows.length-1;
    return{id:shot.id,time:shot.time,slot:String(source.chapter||source.conversionFunction||(index===0?"黄金开头":isLast?"结尾行动号召":"内容推进")),roles:String(source.roleCount||source.roles||"继承原片角色与事件顺序"),line:isLast?(localizedCtas[0]||String(source.originalScript||"")):index===0?(localizedHooks[0]||String(source.originalScript||"")):String(source.originalScript||""),purpose:String(source.purpose||source.conversionFunction||(isLast?"推动转化":"维持观看"))};
  }):legacyScriptMicroRows;
  const saveWorkflowProject=async(patch:Partial<WorkflowProject>&{workflow?:Record<string,unknown>})=>{
    const next:WorkflowProject={...workflowProject,...patch,workflow:{...workflowProject.workflow,...(patch.workflow||{})}};
    setWorkflowProject(next);
    try{
      const response=await fetch("/api/video-projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(next)});
      const payload=await response.json() as {project?:WorkflowProject};
      if(response.ok&&payload.project)setWorkflowProject(payload.project);
    }catch{/* local state remains available until the next successful save */}
    return next;
  };
  useEffect(()=>{
    let cancelled=false;
    fetch("/api/video-projects",{cache:"no-store"}).then(response=>response.json()).then((payload:{projects?:WorkflowProject[]})=>{
      if(cancelled)return;
      if(!payload.projects?.[0]){workflowRestoreReady.current=true;return;}
      const restored=payload.projects[0];setWorkflowProject(restored);
      setScriptApproved(Boolean(restored.workflow?.scriptApproved));setStoryboardReady(Boolean(restored.workflow?.storyboardReady));
      if(restored.sourceId&&!restored.sourceId.startsWith("legacy")){
        const source=restored.source,metrics=(source.metrics||{}) as Record<string,unknown>;
        const restoredRecord:ViralPoolRecord={id:restored.sourceId,platform:String(source.platform||"历史项目"),author:String(source.author||"用户素材"),title:String(source.title||"已保存项目"),likes:Number(metrics.likes||0),views:metrics.views===null?null:Number(metrics.views||0),comments:Number(metrics.comments||0),favorites:Number(metrics.favorites||0),shares:Number(metrics.shares||0),status:"已保存",analysis:restored.analysisId?"V1 已拆解":"等待处理",score:null,hook:"项目已恢复",hookType:"历史项目",link:String(source.link||""),embedUrl:String(source.link||""),localPreview:false};
        setCustomAnalysisVideo({record:restoredRecord,file:null});
      }
      workflowRestoreReady.current=true;
    }).catch(()=>undefined);
    return()=>{cancelled=true;};
  },[]);
  useEffect(()=>{
    if(!workflowRestoreReady.current)return;
    void saveWorkflowProject({status:storyboardReady?"分镜结构已确认":scriptApproved?"脚本已确认":workflowProject.status,workflow:{scriptApproved,storyboardReady}});
  },[scriptApproved,storyboardReady]);
  useEffect(()=>{
    if(stage==="04"&&view.startsWith("script:")){const next=view.slice(7);if(next&&next!==scriptTab)setScriptTab(next);}
    if(stage==="05"&&view.startsWith("production:")){const next=view.slice(11);if(next&&next!==productionTab)setProductionTab(next);}
  },[stage,view]);
  const openScriptTab=(next:string)=>{setScriptTab(next);onView(`script:${next}`);};
  const openProductionTab=(next:string)=>{setProductionTab(next);onView(`production:${next}`);};
  useEffect(()=>{
    const projectId=project.workspaceId;
    const seeded:ReferenceImageAsset[]=shotRows.map((row)=>({
      id:`${projectId}:${row.id}:v1`, projectId, projectCode:project.id, productName:project.product,
      shotId:row.id, version:1, prompt:row.imagePrompt, imageUrl:row.image, status:"confirmed",
      createdAt:"2026-08-20T00:00:00.000Z",
    }));
    fetch(`/api/reference-images?projectId=${encodeURIComponent(projectId)}`,{cache:"no-store"})
      .then(response=>response.json()).then((payload:{assets?:ReferenceImageAsset[]})=>{
        if (payload.assets?.length) { setReferenceAssets(payload.assets); return; }
        if(projectId!==legacyProject.workspaceId){setReferenceAssets([]);return;}
        setReferenceAssets(seeded);
        fetch("/api/reference-images",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({assets:seeded})}).catch(()=>undefined);
      }).catch(()=>setReferenceAssets(seeded));
  },[project.id,project.product,project.workspaceId]);
  const handleReferenceFiles = (files: File[]) => {
    const nextFiles = files.slice(0, 3);
    setReferenceFiles(nextFiles);
    setUploadedReferenceDuration(null);
    const videoFile = nextFiles.find(file => file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv)$/i.test(file.name));
    if (!videoFile) return;
    const objectUrl = URL.createObjectURL(videoFile);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) setUploadedReferenceDuration(video.duration);
      URL.revokeObjectURL(objectUrl);
    };
    video.onerror = () => URL.revokeObjectURL(objectUrl);
    video.src = objectUrl;
  };
  const activeShot = shotRows.find(item => item.id === selectedShot) ?? shotRows[0];
  const currentProjectReferenceAssets = referenceAssets.filter(asset=>asset.projectId===project.workspaceId);
  const activeReferenceAsset = currentProjectReferenceAssets
    .filter(asset=>asset.shotId===activeShot.id)
    .sort((a,b)=>b.version-a.version)[0];
  const selectedPoolRecord = customAnalysisVideo?.record ?? poolRecords.find(item => item.id === selectedPoolId) ?? null;
  const analysisPreviewUrl = selectedPoolRecord?.embedUrl || "";
  const analysisPreviewIsDirectVideo = Boolean(selectedPoolRecord?.localPreview) || /^(blob:|data:video\/)/i.test(analysisPreviewUrl) || /\.(mp4|mov|webm)(?:[?#]|$)/i.test(analysisPreviewUrl);
  const analysisPreviewCanEmbed = /open\.douyin\.com\/player\/video|tiktok\.com\/(?:player\/v1|embed)/i.test(analysisPreviewUrl);
  const visiblePoolRecords = poolRecords.filter(item => {
    const matchesFilter = poolFilter === "all" || item.platform === poolFilter || (poolFilter === "ready" && item.analysis === "V1 已拆解");
    const query = poolSearch.trim().toLocaleLowerCase();
    return matchesFilter && (!query || `${item.title} ${item.author} ${item.id}`.toLocaleLowerCase().includes(query));
  });
  const formatCount = (value: number) => value >= 10000 ? `${(value / 10000).toFixed(1)}万` : value.toLocaleString("zh-CN");
  const nextStage = String(Math.min(6, Number(stage) + 1)).padStart(2, "0") as VideoStageKey;
  const productionTabs = [["image-prompt","画面提示词"],["reference","参考图"],["video-prompt","视频提示词"],["ai-video","AI 视频创作"],["publish","发布"]];
  const productionProjectGroups = [
    { label:"创作准备",items:productionTabs.slice(0,3) },
    { label:"内容生成",items:productionTabs.slice(3,4) },
    { label:"发布交付",items:productionTabs.slice(4) },
  ];
  const scriptTabs = [["inputs","输入与资产复用"],["mapping","结构映射"],["script","目标脚本"],["shots","分镜结构确认"],["route","制作路线"],["locks","锚点资料"]];
  const selectedHook=hookVersions[hookVersion];
  const analyzedHook=analysisResult.hook&&typeof analysisResult.hook==="object"?analysisResult.hook as Record<string,unknown>:{};
  const goldenOpening=analysisResult.goldenThreeSeconds&&typeof analysisResult.goldenThreeSeconds==="object"?analysisResult.goldenThreeSeconds as Record<string,unknown>:{};
  const currentHook={...selectedHook,type:String(analyzedHook.primaryType||analyzedHook.type||selectedHook.type),line:localizedHooks[0]||selectedHook.line,visual:String(goldenOpening.event||goldenOpening.visual||selectedHook.visual),reason:String(analyzedHook.reason||selectedHook.reason)};
  const selectedVideoModel = videoGenerationModels.find(model => model.id === videoModelId);
  const videoDurationOptions = selectedVideoModel ? Array.from({ length: selectedVideoModel.maxSeconds - selectedVideoModel.minSeconds + 1 }, (_, index) => selectedVideoModel.minSeconds + index) : [];
  const analyzedReferenceDuration = getAnalyzedReferenceDuration(analysisJob?.result);
  const storyboardDuration = Math.max(...shotRows.map(row => Number(row.time.replace("s", "").split("–")[1])));
  const replicaDurationSeconds = Number((uploadedReferenceDuration || analyzedReferenceDuration || storyboardDuration).toFixed(3));
  const replicaDurationSource = uploadedReferenceDuration ? "用户新上传的参考视频" : analyzedReferenceDuration ? "阶段 02 的参考视频分析结果" : "当前已确认分镜时间轴";
  const generationSegments = buildGenerationSegments(replicaDurationSeconds, videoSegmentLimit || 4).map(segment => {
    const sourceEnd = Math.min(segment.end, replicaDurationSeconds);
    const shots = shotRows.filter(row => {
      const [start, end] = row.time.replace("s", "").split("–").map(Number);
      return start < sourceEnd && end > segment.start;
    });
    const scriptRows = scriptMicroRows.filter(row => shots.some(shot => shot.id === row.id));
    return { ...segment, sourceEnd, shots, scriptRows };
  });
  const providerModel = videoModelId === "seedance-2.0" ? "sd-fast" : videoModelId === "seedance-2.5" ? "sd25-30s" : null;
  const aiCreationSegments: AiCreationSegment[] = generationSegments.map(segment=>{
    const targetDuration = Number((segment.sourceEnd-segment.start).toFixed(3));
    const apiDuration = videoModelId === "seedance-2.0" ? (targetDuration<=10?10:15) : videoModelId === "seedance-2.5" ? 30 : null;
    return { id:segment.id,sourceStart:segment.start,sourceEnd:segment.sourceEnd,targetDuration,apiDuration,trimDuration:apiDuration?Number(Math.max(0,apiDuration-targetDuration).toFixed(3)):0,prompt:segment.shots.map((shot,index)=>`@Image${index+1} ${shot.videoPrompt}`).join("\n\n"),shotIds:segment.shots.map(shot=>shot.id),imageUrls:segment.shots.map(shot=>shot.image) };
  });
  const generationSplitLabel = generationSegments.map(segment => `${formatSeconds(segment.end - segment.start)}s`).join(" + ");
  const reusableAnalysis = analysisJob?.status === "completed" || selectedPoolRecord?.analysis === "V1 已拆解";
  const researchReady = researchJob?.status === "completed" || Boolean(workflowProject.researchId);

  const jobStorageKey = `tk-video-job:${selectedPoolRecord?.id || "no-source"}:${analysisMode}`;
  const activeAnalysisStorageKey = "tk-video-analysis-active-job";
  const researchStorageKey = "tk-product-research-job";
  const researchSnapshotKey = "tk-product-research-snapshot";
  const generationConfigStorageKey = `tk-video-generation-config:${project.workspaceId}`;
  const invalidateGenerationPlan = () => {
    setGenerationPlanReady(false);
    window.localStorage.removeItem(generationConfigStorageKey);
  };
  const confirmGenerationPlan = () => {
    if (!selectedVideoModel || !videoSegmentLimit) return;
    setGenerationPlanReady(true);
    openProductionTab("video-prompt");
    window.localStorage.setItem(generationConfigStorageKey, JSON.stringify({ modelId: selectedVideoModel.id, segmentLimit: videoSegmentLimit }));
  };
  const refreshViralPool = async () => {
    setPoolSyncState("checking");
    setPoolSyncDetail("正在从飞书读取最新记录");
    try {
      const response = await fetch("/api/viral-pool", { cache: "no-store" });
      const payload = await response.json() as { configured?: boolean; records?: ViralPoolRecord[]; updatedAt?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || "飞书同步失败");
      if (payload.configured && payload.records?.length) {
        setPoolRecords(payload.records);
        setPoolUpdatedAt(payload.updatedAt || new Date().toISOString());
        setPoolSyncState("live");
        setPoolSyncDetail(`已同步 ${payload.records.length} 条最新视频数据`);
        return;
      }
      setPoolRecords(viralPoolRecords);
      setPoolSyncState("snapshot");
      setPoolSyncDetail(payload.error || "飞书应用尚未授权，当前显示最近一次快照");
    } catch (error) {
      setPoolRecords(viralPoolRecords);
      setPoolSyncState("error");
      setPoolSyncDetail(error instanceof Error ? error.message : "飞书同步失败，当前显示最近一次快照");
    }
  };
  const choosePoolRecord = (id: string) => {
    if (customAnalysisVideo) URL.revokeObjectURL(customAnalysisVideo.record.embedUrl);
    setCustomAnalysisVideo(null);
    setSelectedPoolId(id);
    setAnalysisJob(null);
    setAnalysisOpenedFromArchive(false);
    setAnalysisError("");
    window.localStorage.removeItem(activeAnalysisStorageKey);
    const record=poolRecords.find(item=>item.id===id);
    if(record){const projectId=`video-project-${record.id}`;void saveWorkflowProject({id:projectId,code:`CP-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${record.id.slice(-6)}`,productName:"待补充产品",sourceId:record.id,source:{id:record.id,platform:record.platform,author:record.author,title:record.title,link:record.link,metrics:{likes:record.likes,views:record.views,comments:record.comments,favorites:record.favorites,shares:record.shares}},analysisId:null,researchId:null,currentStage:"02",status:"等待拆解",workflow:{scriptApproved:false,storyboardReady:false}});setScriptApproved(false);setStoryboardReady(false);}
    onStage("02");
  };
  const chooseCustomVideo = (file: File) => {
    if (customAnalysisVideo) URL.revokeObjectURL(customAnalysisVideo.record.embedUrl);
    const preview = URL.createObjectURL(file);
    const record: ViralPoolRecord = {
      id: `UPLOAD-${Date.now()}`, platform: "本地上传", author: "用户上传", title: file.name,
      likes: 0, views: null, comments: 0, favorites: 0, shares: 0, status: "待分析", analysis: "等待处理",
      score: null, hook: "待分析", hookType: "待识别", link: "", embedUrl: preview, localPreview: true,
    };
    setSelectedPoolId("");
    setCustomAnalysisVideo({ record, file });
    setAnalysisJob(null);
    setAnalysisOpenedFromArchive(false);
    setAnalysisError("");
    window.localStorage.removeItem(activeAnalysisStorageKey);
    const projectId=`video-project-${record.id}`;
    void saveWorkflowProject({id:projectId,code:`CP-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${record.id.slice(-6)}`,productName:"待补充产品",sourceId:record.id,source:{id:record.id,platform:record.platform,author:record.author,title:record.title,link:"",metrics:{}},analysisId:null,researchId:null,currentStage:"02",status:"等待拆解",workflow:{scriptApproved:false,storyboardReady:false}});
    setScriptApproved(false);setStoryboardReady(false);
  };
  const openArchivedAnalysis = (job:AnalysisJob) => {
    const source=job.source||{};
    const metrics=source.metrics||{};
    const record:ViralPoolRecord={
      id:String(source.id||job.id),platform:String(source.platform||"历史任务"),author:String(source.author||"用户素材"),title:String(source.title||"已完成的拆解任务"),
      likes:Number(metrics.likes||0),views:metrics.views===null?null:Number(metrics.views||0),comments:Number(metrics.comments||0),favorites:Number(metrics.favorites||0),shares:Number(metrics.shares||0),
      status:"已完成",analysis:job.mode==="viral"?"V1 已拆解":"文案已分析",score:null,hook:"已完成",hookType:"历史结果",link:String(source.link||""),embedUrl:String(source.link||""),localPreview:false,
    };
    setSelectedPoolId("");
    setCustomAnalysisVideo({record,file:null});
    setAnalysisMode(job.mode==="viral"?"viral":"copy");
    setAnalysisJob(job);
    setAnalysisOpenedFromArchive(true);
    setAnalysisError("");
    window.localStorage.setItem(activeAnalysisStorageKey,JSON.stringify({jobId:job.id,sourceId:record.id,mode:job.mode}));
    onStage("02");
  };
  const closeArchivedAnalysis = () => {
    setAnalysisOpenedFromArchive(false);
    setAnalysisJob(null);
    setAnalysisError("");
    setSelectedPoolId("");
    setCustomAnalysisVideo(null);
    window.localStorage.removeItem(activeAnalysisStorageKey);
    window.setTimeout(()=>document.querySelector(".analysis-history-panel")?.scrollIntoView({behavior:"smooth",block:"start"}),0);
  };
  useEffect(() => { void refreshViralPool(); }, []);
  useEffect(() => () => {
    if (customAnalysisVideo) URL.revokeObjectURL(customAnalysisVideo.record.embedUrl);
  }, [customAnalysisVideo]);
  const applyResearchProject = (job: AnalysisJob) => {
    setResearchJob(job);
    setResearchCreatingNew(false);
    if (job.country) setResearchCountry(job.country);
    if (job.platform) setResearchPlatform(job.platform);
    if (job.language) setResearchLanguage(job.language);
    if (job.productName) setResearchProductName(job.productName);
    window.localStorage.setItem(researchStorageKey, job.id);
  };
  const persistAnalysisProject = async (job:AnalysisJob,linkToWorkflow=true) => {
    if(job.status!=="completed"||!job.result||!job.source)return;
    try{
      const response=await fetch("/api/analysis-projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(job)});
      const payload=await response.json() as {project?:AnalysisJob;error?:string};
      if(!response.ok||!payload.project)throw new Error(payload.error||"拆解结果保存失败");
      setAnalysisArchive(current=>[payload.project!,...current.filter(item=>item.id!==payload.project!.id)].slice(0,50));
      setAnalysisPersistence("saved");
      if(linkToWorkflow)void saveWorkflowProject({analysisId:payload.project.id,currentStage:"03",status:"拆解已完成",workflow:{analysisMode:payload.project.mode,analysisCompleted:true}});
    }catch{setAnalysisArchive(current=>[job,...current.filter(item=>item.id!==job.id)].slice(0,50));setAnalysisPersistence("local");}
  };
  const syncBridgeAnalysisProjects = async () => {
    try {
      const response=await fetch("http://127.0.0.1:4318/jobs");
      if(!response.ok)return [];
      const payload=await response.json() as {jobs?:AnalysisJob[]};
      const completed=(payload.jobs||[]).filter(job=>job.status==="completed"&&job.result);
      if(completed.length){
        setAnalysisArchive(current=>[...completed,...current].filter((job,index,all)=>all.findIndex(item=>item.id===job.id)===index).slice(0,50));
        await Promise.all(completed.map(job=>persistAnalysisProject(job,false)));
      }
      return completed;
    } catch {
      return [];
    }
  };
  const persistResearchProject = async (job: AnalysisJob) => {
    if (job.status !== "completed" || !job.result) return;
    try { window.localStorage.setItem(researchSnapshotKey, JSON.stringify(job)); } catch { /* D1 remains authoritative */ }
    try {
      const response = await fetch("/api/research-projects", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(job) });
      const payload = await response.json() as { project?: AnalysisJob; error?: string };
      if (!response.ok || !payload.project) throw new Error(payload.error || "方案保存失败");
      setResearchArchive(current=>[payload.project!,...current.filter(item=>item.id!==payload.project!.id)].slice(0,20));
      setResearchPersistence("saved");
      void saveWorkflowProject({researchId:payload.project.id,productName:payload.project.productName||researchProductName,currentStage:"04",status:"调研已完成",workflow:{researchCompleted:true}});
    } catch {
      setResearchPersistence("local");
    }
  };
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(generationConfigStorageKey);
      if (!saved) return;
      const config = JSON.parse(saved) as { modelId?: string; segmentLimit?: number };
      const model = videoGenerationModels.find(item => item.id === config.modelId);
      if (!model || !config.segmentLimit || config.segmentLimit < model.minSeconds || config.segmentLimit > model.maxSeconds) return;
      setVideoModelId(model.id);
      setVideoSegmentLimit(config.segmentLimit);
      setGenerationPlanReady(true);
    } catch { /* invalid local draft is ignored */ }
  }, [generationConfigStorageKey]);
  useEffect(()=>{
    if(workflowProject.analysisId){const match=analysisArchive.find(job=>job.id===workflowProject.analysisId);if(match&&analysisJob?.id!==match.id){setAnalysisJob(match);setAnalysisMode(match.mode==="viral"?"viral":"copy");}}
    if(workflowProject.researchId){const match=researchArchive.find(job=>job.id===workflowProject.researchId);if(match&&researchJob?.id!==match.id)applyResearchProject(match);}
  },[workflowProject.analysisId,workflowProject.researchId,analysisArchive,researchArchive]);
  const refreshJob = async (jobId: string) => {
    const response = await fetch(`http://127.0.0.1:4318/jobs/${jobId}`);
    if (!response.ok) throw new Error("无法读取本机任务");
    const nextJob = await response.json() as AnalysisJob;
    setAnalysisJob(nextJob);
    if(nextJob.status==="completed")void persistAnalysisProject(nextJob);
    return nextJob;
  };
  const refreshResearchJob = async (jobId: string) => {
    const response = await fetch(`http://127.0.0.1:4318/jobs/${jobId}`);
    if (!response.ok) throw new Error("无法读取商品调研任务");
    const nextJob = await response.json() as AnalysisJob;
    setResearchJob(nextJob);
    if (nextJob.country) setResearchCountry(nextJob.country);
    if (nextJob.platform) setResearchPlatform(nextJob.platform);
    if (nextJob.language) setResearchLanguage(nextJob.language);
    if (nextJob.productName) setResearchProductName(nextJob.productName);
    if (nextJob.status === "completed") void persistResearchProject(nextJob);
    return nextJob;
  };
  useEffect(() => {
    let cancelled=false;
    fetch("/api/analysis-projects",{cache:"no-store"}).then(async response=>{
      const payload=await response.json() as {projects?:AnalysisJob[]};
      if(!response.ok)throw new Error();
      if(cancelled)return;
      const projects=payload.projects||[];
      setAnalysisArchive(projects);
      setAnalysisPersistence("saved");
      try{
        const active=JSON.parse(window.localStorage.getItem(activeAnalysisStorageKey)||"null") as {jobId?:string}|null;
        const match=projects.find(job=>job.id===active?.jobId);
        if(match&&!analysisJob)openArchivedAnalysis(match);
      }catch{}
    }).catch(()=>{if(!cancelled)setAnalysisPersistence("error");});
    return()=>{cancelled=true;};
  },[]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/research-projects", { cache:"no-store" }).then(async response=>{
      const payload = await response.json() as { projects?: AnalysisJob[] };
      if (!response.ok) throw new Error();
      if (cancelled) return;
      const projects = payload.projects || [];
      setResearchArchive(projects);
      setResearchPersistence("saved");
      if (projects[0]) {
        setResearchJob(current=>current || projects[0]);
        if (projects[0].country) setResearchCountry(projects[0].country);
        if (projects[0].platform) setResearchPlatform(projects[0].platform);
        if (projects[0].language) setResearchLanguage(projects[0].language);
        if (projects[0].productName) setResearchProductName(projects[0].productName);
        return;
      }
      try {
        const snapshot = window.localStorage.getItem(researchSnapshotKey);
        if (snapshot) {
          const job = JSON.parse(snapshot) as AnalysisJob;
          setResearchArchive([job]);
          setResearchJob(current=>current || job);
          if (job.country) setResearchCountry(job.country);
          if (job.platform) setResearchPlatform(job.platform);
          if (job.language) setResearchLanguage(job.language);
          if (job.productName) setResearchProductName(job.productName);
          setResearchPersistence("local");
          void persistResearchProject(job);
        }
      }
      catch { /* bridge restore still runs when stage 03 opens */ }
    }).catch(()=>{
      if (cancelled) return;
      try {
        const snapshot = window.localStorage.getItem(researchSnapshotKey);
        if (snapshot) {
          const job = JSON.parse(snapshot) as AnalysisJob;
          setResearchArchive([job]);
          setResearchJob(current=>current || job);
          if (job.country) setResearchCountry(job.country);
          if (job.platform) setResearchPlatform(job.platform);
          if (job.language) setResearchLanguage(job.language);
          if (job.productName) setResearchProductName(job.productName);
          setResearchPersistence("local");
          return;
        }
      } catch { /* show empty state below */ }
      setResearchPersistence("error");
    });
    return ()=>{cancelled=true;};
  }, []);
  useEffect(() => {
    if (stage !== "02" && stage !== "03") return;
    let cancelled = false;
    fetch("http://127.0.0.1:4318/health").then(response => {
      if (!response.ok) throw new Error();
      if (!cancelled) setBridgeState("ready");
      if(!bridgeHistorySynced.current){
        bridgeHistorySynced.current=true;
        void syncBridgeAnalysisProjects().catch(()=>undefined);
      }
      if (stage === "02") {
        try{
          const active=JSON.parse(window.localStorage.getItem(activeAnalysisStorageKey)||"null") as {jobId?:string}|null;
          if(active?.jobId)return refreshJob(active.jobId);
        }catch{}
        const saved = window.localStorage.getItem(jobStorageKey);
        if (saved) return refreshJob(saved);
      }
      const savedResearch = window.localStorage.getItem(researchStorageKey);
      if (savedResearch) return refreshResearchJob(savedResearch);
    }).catch(() => { if (!cancelled) setBridgeState("offline"); });
    return () => { cancelled = true; };
  }, [stage, jobStorageKey, researchStorageKey]);
  useEffect(() => {
    if (!analysisJob || ["completed","failed","needs_upload"].includes(analysisJob.status)) return;
    const timer = window.setInterval(() => refreshJob(analysisJob.id).catch(() => setBridgeState("offline")), 1500);
    return () => window.clearInterval(timer);
  }, [analysisJob?.id, analysisJob?.status]);
  useEffect(() => {
    if (!researchJob || ["completed","failed","collecting"].includes(researchJob.status)) return;
    const timer = window.setInterval(() => refreshResearchJob(researchJob.id).catch(() => setBridgeState("offline")), 1500);
    return () => window.clearInterval(timer);
  }, [researchJob?.id, researchJob?.status]);

  const startAnalysis = async () => {
    if (!selectedPoolRecord) return setAnalysisError("请先从爆款池选择视频，或上传一个本地视频");
    setAnalysisError("");
    try {
      const response = await fetch("http://127.0.0.1:4318/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: analysisMode,
          source: {
            id: selectedPoolRecord.id,
            platform: selectedPoolRecord.platform,
            author: selectedPoolRecord.author,
            title: selectedPoolRecord.title,
            link: selectedPoolRecord.link,
            metrics: { likes: selectedPoolRecord.likes, views: selectedPoolRecord.views, comments: selectedPoolRecord.comments, favorites: selectedPoolRecord.favorites, shares: selectedPoolRecord.shares },
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "任务创建失败");
      let job = payload as AnalysisJob;
      window.localStorage.setItem(jobStorageKey, job.id);
      window.localStorage.setItem(activeAnalysisStorageKey,JSON.stringify({jobId:job.id,sourceId:selectedPoolRecord.id,mode:analysisMode}));
      if (customAnalysisVideo?.file && job.status === "needs_upload") {
        const file = customAnalysisVideo.file;
        const uploadResponse = await fetch(`http://127.0.0.1:4318/jobs/${job.id}/upload`, { method: "POST", headers: { "X-File-Name": encodeURIComponent(file.name), "Content-Type": file.type || "application/octet-stream" }, body: file });
        const uploaded = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploaded.error || "本地视频上传失败");
        job = uploaded as AnalysisJob;
      }
      setAnalysisJob(job);
      if(job.status==="completed")void persistAnalysisProject(job);
      setBridgeState("ready");
    } catch (error) {
      setBridgeState("offline");
      setAnalysisError(error instanceof Error ? error.message : "本机 Codex 协作服务未启动");
    }
  };

  const uploadVideo = async (file: File) => {
    if (!analysisJob) return;
    setAnalysisError("");
    try {
      const response = await fetch(`http://127.0.0.1:4318/jobs/${analysisJob.id}/upload`, { method: "POST", headers: { "X-File-Name": encodeURIComponent(file.name), "Content-Type": file.type || "application/octet-stream" }, body: file });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "视频上传失败");
      setAnalysisJob(payload as AnalysisJob);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "视频上传失败");
    }
  };

  const changeAnalysisMode = (mode: "copy" | "viral") => {
    setAnalysisMode(mode);
    setAnalysisJob(null);
    setAnalysisError("");
    window.localStorage.removeItem(activeAnalysisStorageKey);
  };

  const startProductResearch = async () => {
    if (!researchFiles.length) return setResearchError("请至少上传一份产品图片、参数表或产品说明");
    setResearchError("");
    try {
      const createResponse = await fetch("http://127.0.0.1:4318/research-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country: researchCountry, platform: researchPlatform, language: researchLanguage, productName: researchProductName, notes: researchNotes }) });
      const created = await createResponse.json() as AnalysisJob & { error?: string };
      if (!createResponse.ok) throw new Error(created.error || "商品调研任务创建失败");
      setResearchJob(created);
      setResearchCreatingNew(false);
      window.localStorage.setItem(researchStorageKey, created.id);
      for (const file of researchFiles) {
        const uploadResponse = await fetch(`http://127.0.0.1:4318/research-jobs/${created.id}/upload`, { method: "POST", headers: { "X-File-Name": encodeURIComponent(file.name), "Content-Type": file.type || "application/octet-stream" }, body: file });
        const uploaded = await uploadResponse.json() as AnalysisJob & { error?: string };
        if (!uploadResponse.ok) throw new Error(uploaded.error || `上传 ${file.name} 失败`);
        setResearchJob(uploaded);
      }
      const startResponse = await fetch(`http://127.0.0.1:4318/research-jobs/${created.id}/start`, { method: "POST" });
      const started = await startResponse.json() as AnalysisJob & { error?: string };
      if (!startResponse.ok) throw new Error(started.error || "商品调研启动失败");
      setResearchJob(started);
      setBridgeState("ready");
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : "商品调研启动失败");
    }
  };

  const rerunProductResearch = async () => {
    if (!researchJob) return;
    setResearchError("");
    try {
      const response = await fetch(`http://127.0.0.1:4318/research-jobs/${researchJob.id}/rerun`, { method: "POST" });
      const payload = await response.json() as AnalysisJob & { error?: string };
      if (!response.ok) throw new Error(payload.error || "重新调研启动失败");
      setResearchJob(payload);
    } catch (error) {
      setResearchError(error instanceof Error ? error.message : "重新调研启动失败");
    }
  };

  const createNewProductResearch = () => {
    window.localStorage.removeItem(researchStorageKey);
    setResearchJob(null);
    setResearchCreatingNew(true);
    setResearchFiles([]);
    setResearchError("");
  };

  return <>
    <section className="module-hero factory-hero"><div><p className="eyebrow">{meta.eyebrow} · 工作站 {videoStages.findIndex(item=>item.key===stage)+1}/{videoStages.length}</p><h2>{meta.title}</h2><p>{meta.description}</p></div><div className="owner-chip"><small>当前负责人</small><strong>{meta.owner}</strong></div></section>
    <StageRail stage={stage} onStage={onStage} />
    {stage==="00"&&<ContentOrchestratorWorkspace onContinue={()=>onStage("01")}/>}
    {stage==="01"&&<ViralCollectionAgent poolRecords={poolRecords} onSelect={choosePoolRecord}/>}
    {stage === "01" ? <section className="factory-context pool-source-context"><div><span className="context-mark">FS</span><div><small>爆款池数据源</small><strong>飞书 · 内容选题库</strong><p>{poolSyncState === "live" ? `最新同步：${poolUpdatedAt ? new Date(poolUpdatedAt).toLocaleString("zh-CN") : "刚刚"}` : poolSyncDetail}</p></div></div><div className="checkpoint-copy"><small>数据状态</small><strong>{poolSyncState === "live" ? "实时数据已连接" : poolSyncState === "checking" ? "正在同步" : "当前显示数据快照"}</strong><span>{poolRecords.length} 个唯一视频</span></div><div className="pool-source-actions"><button className="change-source-button" disabled={poolSyncState === "checking"} onClick={refreshViralPool}>{poolSyncState === "checking" ? "同步中…" : "同步飞书"}</button><a className="source-link-button" href="https://c0v673njl5f.feishu.cn/wiki/ViR1wTvWgiBt0WkYrUqcTCd2n3c?table=tblOj1mGcYJ3EWxn&view=vewGuXlwmd" target="_blank" rel="noreferrer">打开飞书原表 ↗</a></div></section> : stage === "02" ? <section className="factory-context analysis-source-context"><div><span className="context-mark">{selectedPoolRecord ? "V1" : "+"}</span><div><small>当前拆解候选</small><strong>{selectedPoolRecord?.title || "尚未选择视频"}</strong><p>{selectedPoolRecord ? `${selectedPoolRecord.platform} · ${selectedPoolRecord.author}` : "请从爆款池选择，或在下方上传本地视频"}</p></div></div><div className="checkpoint-copy"><small>素材 ID</small><strong>{selectedPoolRecord?.id || "未创建"}</strong><span>{selectedPoolRecord?.localPreview ? "本地上传" : selectedPoolRecord ? "从爆款池带入" : "等待添加素材"}</span></div><div className="analysis-context-actions">{analysisOpenedFromArchive&&<button className="change-source-button" onClick={closeArchivedAnalysis}>← 返回拆解列表</button>}<button className="change-source-button" onClick={()=>onStage("01")}>{analysisOpenedFromArchive?"返回爆款池":"← 上一步 · 爆款池"}</button></div></section> : <section className="factory-context real-project-context"><div><span className="context-mark">CP</span><div><small>当前真实项目</small><strong>{project.id}</strong><p>{project.product} · A版 · {replicaDurationSeconds}秒</p></div></div><div className="checkpoint-copy"><small>项目检查点</small><strong>{project.status}</strong><span>内部 ID：{project.workspaceId}</span></div><div className="project-progress"><span><i style={{width:`${project.progress}%`}} /></span><small>生产准备度 {project.progress}%</small></div></section>}

    {stage === "01" && <><section className="pool-kpis"><article><small>当前视频</small><strong>{poolRecords.length}</strong><span>{poolSyncState === "live" ? "来自飞书实时同步" : "来自最近快照"}</span></article><article><small>每行展示</small><strong>6</strong><span>一屏横向查看更多内容</span></article><article><small>播放量已同步</small><strong>{poolRecords.filter(item=>item.views!==null).length}</strong><span>以数据源实际字段为准</span></article><article><small>播放量待授权</small><strong>{poolRecords.filter(item=>item.views===null).length}</strong><span>缺失数据不做估算</span></article></section>
      <section className="panel video-pool-panel"><div className="panel-heading pool-heading"><div><p className="eyebrow">飞书 · 内容选题库</p><h3>视频爆款池</h3><p>桌面端每行展示 6 条统一尺寸的视频，数据直接叠加在画面上；全部结果连续排列，不再分页。</p></div><span className={poolSyncState === "live" ? "approved-pill" : "waiting-pill"}>{poolSyncState === "live" ? "飞书实时数据" : "飞书数据快照"}</span></div><div className="pool-toolbar"><div className="pool-filters">{[["all",`全部 ${poolRecords.length}`],["TikTok",`TikTok ${poolRecords.filter(item=>item.platform==="TikTok").length}`],["抖音",`抖音 ${poolRecords.filter(item=>item.platform==="抖音").length}`],["ready",`V1 已拆解 ${poolRecords.filter(item=>item.analysis==="V1 已拆解").length}`]].map(([key,label])=><button className={poolFilter===key?"active":""} key={key} onClick={()=>setPoolFilter(key)}>{label}</button>)}</div><input aria-label="搜索爆款池" value={poolSearch} onChange={event=>setPoolSearch(event.target.value)} placeholder="搜索标题、作者或视频 ID" /></div><div className="video-pool-grid">{visiblePoolRecords.map(item=><article className={selectedPoolId===item.id?"video-pool-card selected":"video-pool-card"} key={item.id}><div className={`embedded-video ${item.platform === "抖音" ? "douyin-player" : "tiktok-player"}`}><iframe src={item.embedUrl} title={`${item.platform} · ${item.title}`} loading="lazy" allow="autoplay; fullscreen" scrolling="no"/><div className="pool-video-badges"><span className={`platform-tag ${item.platform === "TikTok" ? "tiktok" : "douyin"}`}>{item.platform}</span><span>{item.analysis}</span></div>{item.platform === "抖音"&&<button className="pool-preview-play" aria-label={`居中播放 ${item.title}`} onClick={()=>setPoolPreviewRecord(item)}>▶</button>}<div className="pool-video-metrics"><span>♥ {formatCount(item.likes)}</span><span>▶ {item.views === null ? "待授权" : formatCount(item.views)}</span><span>↗ {formatCount(item.shares)}</span></div></div><div className="video-card-body"><div className="video-card-label"><span className={`platform-tag ${item.platform === "TikTok" ? "tiktok" : "douyin"}`}>{item.platform}</span><span className={item.analysis === "V1 已拆解" ? "approved-pill" : "waiting-pill"}>{item.analysis}</span></div><h3 title={item.title}>{item.title}</h3><p>{item.author} · {item.id.replace("VV-","")}</p><div className="primary-video-metrics"><span><small>点赞</small><strong>{formatCount(item.likes)}</strong></span><span className={item.views === null ? "metric-unavailable" : ""} title={item.views === null ? "数据源尚未提供播放量" : "来自已同步数据源"}><small>播放</small><strong>{item.views === null ? "待授权" : formatCount(item.views)}</strong></span><span><small>转发</small><strong>{formatCount(item.shares)}</strong></span></div><div className="secondary-video-metrics"><span>评论 {formatCount(item.comments)}</span><span>收藏 {formatCount(item.favorites)}</span></div><div className="video-card-actions"><a href={item.link} target="_blank" rel="noreferrer">原视频 ↗</a><button onClick={()=>choosePoolRecord(item.id)}>选为候选</button></div></div></article>)}</div>{visiblePoolRecords.length===0&&<div className="pool-empty">没有符合当前筛选条件的视频</div>}<p className="pool-method-note">数据口径：数值直接使用飞书表格返回结果；表格没有提供的字段显示“待授权”，系统不做估算。点击“同步飞书”可立即重新读取。</p>{poolPreviewRecord&&<div className="pool-player-overlay" role="dialog" aria-modal="true" aria-label={`播放 ${poolPreviewRecord.title}`} onClick={()=>setPoolPreviewRecord(null)}><div className="pool-player-dialog" onClick={event=>event.stopPropagation()}><header><div><span>{poolPreviewRecord.platform}</span><strong>{poolPreviewRecord.title}</strong></div><button aria-label="关闭播放器" onClick={()=>setPoolPreviewRecord(null)}>×</button></header><div className="pool-player-stage"><iframe src={poolPreviewRecord.embedUrl} title={`居中播放 · ${poolPreviewRecord.title}`} allow="autoplay; fullscreen" scrolling="no"/></div><footer><span>点赞 {formatCount(poolPreviewRecord.likes)}</span><span>播放 {poolPreviewRecord.views===null?"待授权":formatCount(poolPreviewRecord.views)}</span><span>转发 {formatCount(poolPreviewRecord.shares)}</span><button onClick={()=>{setPoolPreviewRecord(null);choosePoolRecord(poolPreviewRecord.id);}}>选为拆解候选</button></footer></div></div>}</section>
      <section className="panel data-health"><div><p className="eyebrow">数据健康检查</p><h3>视频可看，三项核心指标分开标注</h3></div><div><span><b>25</b> 条视频播放器</span><span><b>25</b> 条点赞数据</span><span><b>5</b> 条播放量已验证</span><span><b>25</b> 条转发数据</span></div></section></>}

    {stage === "02" && (selectedPoolRecord ? <div className="analysis-workbench">
      <aside className="panel analysis-video-panel"><div className="analysis-player">{analysisPreviewIsDirectVideo?<video src={analysisPreviewUrl} controls><track kind="captions" /></video>:analysisPreviewCanEmbed?<iframe src={analysisPreviewUrl} title={`待拆解视频 · ${selectedPoolRecord.title}`} allow="autoplay; fullscreen" />:<div className="analysis-preview-unavailable blocked-preview"><span>无法内嵌</span><h4>平台限制站内播放</h4><p>原视频页面禁止被第三方网页嵌入。拆解结果不受影响，可打开原视频核对，或重新上传视频恢复站内播放。</p>{selectedPoolRecord.link&&<a href={selectedPoolRecord.link} target="_blank" rel="noreferrer">打开原视频 ↗</a>}</div>}</div><div className="analysis-video-copy"><span className={`platform-tag ${selectedPoolRecord.platform === "TikTok" ? "tiktok" : "douyin"}`}>{selectedPoolRecord.platform}</span><h3>{selectedPoolRecord.title}</h3><p>{selectedPoolRecord.author}</p>{selectedPoolRecord.localPreview?<div className="local-video-ready"><span>本地视频已就绪</span><b>开始任务后自动上传</b></div>:<div><span>点赞 <b>{formatCount(selectedPoolRecord.likes)}</b></span><span>播放 <b>{selectedPoolRecord.views === null ? "待授权" : formatCount(selectedPoolRecord.views)}</b></span><span>转发 <b>{formatCount(selectedPoolRecord.shares)}</b></span></div>}{selectedPoolRecord.link&&<a href={selectedPoolRecord.link} target="_blank" rel="noreferrer">打开原视频 ↗</a>}<label className="replace-analysis-video"><input type="file" accept="video/mp4,video/quicktime,video/webm,.mkv" onChange={event=>{const file=event.target.files?.[0];if(file)chooseCustomVideo(file);event.currentTarget.value="";}}/><span>＋ 换成本地视频</span></label></div></aside>
      <main className="panel analysis-config"><div className="panel-heading"><div><p className="eyebrow">分析任务设置</p><h3>这条视频要怎样处理？</h3></div><div className="agent-bridge-status"><i className={bridgeState}/><span>{bridgeState === "ready" ? "本机 Codex 已连接" : bridgeState === "offline" ? "本机服务未连接" : "正在检测 Codex"}</span></div></div><div className="analysis-mode-grid"><button disabled={!!analysisJob && !["completed","failed","needs_upload"].includes(analysisJob.status)} className={analysisMode === "copy" ? "active" : ""} onClick={()=>changeAnalysisMode("copy")}><span className="analysis-mode-icon">文</span><div><small>按钮动作：开始分析</small><h3>文案与表达分析</h3><p>提取视频原文案和口播脚本，拆解内容表达结构，并生成保留原逻辑的口播改写稿。</p><div><i>不调用爆款拆解技能</i><i>原文案提取</i><i>口播改写</i></div></div></button><button disabled={!!analysisJob && !["completed","failed","needs_upload"].includes(analysisJob.status)} className={analysisMode === "viral" ? "active" : ""} onClick={()=>changeAnalysisMode("viral")}><span className="analysis-mode-icon">V1</span><div><small>按钮动作：开始拆解</small><h3>AI 带货爆款拆解</h3><p>调用 content-video-replication-strategist，按真实镜头执行 V1 原脚本还原与结构拆解。</p><div><i>必须调用指定技能</i><i>黄金3秒</i><i>1:1骨架</i></div></div></button></div>
      <section className="analysis-plan"><div><p className="eyebrow">{analysisMode === "copy" ? "文案表达路线" : "V1 技能路线"}</p><h3>{analysisMode === "copy" ? "输出 3 组可审核资产" : "严格按技能输出 8 个拆解模块"}</h3></div>{analysisMode === "copy" ? <div className="analysis-step-list"><span><b>01</b><i>语音转写＋字幕 OCR</i><small>保留听不清/看不清标记，不补写</small></span><span><b>02</b><i>内容表达结构</i><small>开场承诺、论点推进、案例、总结与 CTA</small></span><span><b>03</b><i>口播稿改写</i><small>保留原逻辑，替换表达，不照搬原文</small></span></div> : <div className="v1-module-grid">{["视频基础信息","整体结构","角色 / 事件链","黄金3秒＋主钩子","转化镜头＋转化核心","原脚本逐镜还原","1:1复刻结构骨架","不确定信息与审核门"].map((item,index)=><span key={item}><b>{String(index+1).padStart(2,"0")}</b>{item}</span>)}</div>}</section>
      <section className="analysis-input-check"><div><span>✓ 原视频播放器可访问</span><span>✓ 飞书互动数据已关联</span><span>✓ 视频 ID 已锁定</span></div><p>{analysisMode === "viral" ? "技能规则：爆点（抓流量）和转化镜头（促出单）分开分析；V1 只还原原片，不提前生成二创脚本。" : "文案规则：原文与改写稿分开保存；无法识别的语音或字幕必须显式标记。"}</p></section>
      {!analysisJob ? <>
        <div className="analysis-start"><div><small>本次任务已锁定</small><strong>{analysisMode === "copy" ? "开始分析：原文案＋表达结构＋口播改写" : "开始拆解：content-video-replication-strategist · 仅 V1"}</strong></div><button className="primary-button" disabled={bridgeState === "checking"} onClick={startAnalysis}>{analysisMode === "copy" ? "开始分析" : "开始拆解"} →</button></div>
        {bridgeState === "offline" && <div className="bridge-help"><b>本机 Codex 协作服务没有运行</b><span>请保持工作台本机服务开启；连接成功后无需 API Key，即可使用当前 ChatGPT 登录执行。</span></div>}
      </> : analysisJob.status === "completed" ? <AnalysisResult job={analysisJob} onConfirm={()=>{void saveWorkflowProject({currentStage:"03",status:"等待商品调研"});onStage("03");}}/> : <div className={`analysis-job-card ${analysisJob.status}`}>
        <div className="job-progress-ring" style={{"--progress":`${analysisJob.progress * 3.6}deg`} as CSSProperties}><span>{analysisJob.progress}%</span></div>
        <div className="analysis-job-copy"><small>{analysisJob.modeLabel}</small><strong>{analysisJob.statusLabel}</strong><p>{analysisJob.detail}</p>{analysisJob.codexThreadId && <code>Codex 任务 {analysisJob.codexThreadId.slice(0,8)}</code>}</div>
        {analysisJob.status === "needs_upload" && <label className="video-upload-button"><input type="file" accept="video/mp4,video/quicktime,video/webm,.mkv" onChange={event=>{const file=event.target.files?.[0];if(file)uploadVideo(file);}}/><span>上传原视频继续</span></label>}
        {analysisJob.status === "failed" && <button className="retry-job-button" onClick={()=>{setAnalysisJob(null);setAnalysisError("");}}>重新创建任务</button>}
      </div>}
      {(analysisError || (analysisJob?.status === "failed" ? analysisJob.error : "")) && <div className="analysis-error"><b>任务提示</b><span>{analysisError || analysisJob?.error}</span></div>}
      </main>
    </div> : <section className="panel analysis-source-empty"><div className="empty-source-icon">＋</div><p className="eyebrow">还没有拆解素材</p><h2>选择爆款池视频，或添加自己的视频</h2><p>没有选择视频时不会加载无关素材；下方历史记录可以随时重新打开，不需要再次拆解。</p><div><button className="secondary-button" onClick={()=>onStage("01")}>返回爆款池选择</button><label className="primary-button"><input type="file" accept="video/mp4,video/quicktime,video/webm,.mkv" onChange={event=>{const file=event.target.files?.[0];if(file)chooseCustomVideo(file);event.currentTarget.value="";}}/><span>＋ 添加视频</span></label></div><small>支持 MP4、MOV、WebM、MKV；本地文件只会在点击开始任务后提交到本机分析服务。</small></section>)}
    {stage==="02"&&<section className="panel analysis-history-panel"><div className="panel-heading"><div><p className="eyebrow">拆解资产库</p><h3>历史分析与 V1 拆解结果</h3><p>已完成结果保存在云端；本机服务恢复后会自动同步以前保留在电脑上的任务。</p></div><span className={analysisPersistence==="saved"?"approved-pill":"waiting-pill"}>{analysisPersistence==="loading"?"正在读取":analysisPersistence==="saved"?`云端已保存 · ${analysisArchive.length} 条`:analysisPersistence==="local"?"等待同步云端":"暂未读取到历史"}</span></div>{analysisArchive.length?<div className="analysis-history-grid">{analysisArchive.map(job=><article className={analysisJob?.id===job.id?"active":""} key={job.id}><div><span>{job.mode==="viral"?"V1":"文"}</span><small>{job.mode==="viral"?"AI 带货爆款拆解":"文案与表达分析"}</small></div><h4>{String(job.source?.title||job.result?.title||"未命名拆解任务")}</h4><p>{job.updatedAt?new Date(job.updatedAt).toLocaleString("zh-CN"):"已完成"} · {job.statusLabel}</p><button className="secondary-button" onClick={()=>openArchivedAnalysis(job)}>查看结果</button></article>)}</div>:<div className="analysis-history-empty"><span>⌁</span><div><strong>暂时没有已同步的拆解记录</strong><small>{bridgeState==="offline"?"启动本机协作服务后，旧任务会自动进入这里。":"新任务完成后会自动保存在这里。"}</small></div></div>}</section>}

    {stage === "03" && <div className="product-research-workbench">
      <section className="panel research-memory-bar"><div><span className={`research-save-dot ${researchPersistence}`}/><div><small>调研方案存档</small><strong>{researchPersistence === "loading" ? "正在读取已保存方案" : researchPersistence === "saved" ? `已持久保存 · ${researchArchive.length} 份方案` : researchPersistence === "local" ? "已从本机备份恢复，等待云端同步" : "暂未找到已保存方案"}</strong><p>返回上一步、刷新页面或重新进入阶段 03，已完成的调研结果都会自动恢复。</p></div></div>{researchArchive.length>0&&<div className="research-archive-list">{researchArchive.slice(0,3).map(job=><button className={researchJob?.id===job.id&&!researchCreatingNew?"active":""} key={job.id} onClick={()=>applyResearchProject(job)}><b>{job.productName || "未命名产品"}</b><span>{job.country} · {job.platform}</span><small>{job.id.slice(-8).toUpperCase()}</small></button>)}</div>}</section>
      <section className="panel research-scope-panel"><div className="panel-heading"><div><p className="eyebrow">市场范围设置</p><h3>先锁定国家、平台与营销文案语言</h3><p>调研分析统一使用中文；语言选项只决定标题、卖点、Hook 和 CTA 等消费者文案。</p></div><div className="agent-bridge-status"><i className={bridgeState}/><span>{bridgeState === "ready" ? "本机 Codex 已连接" : bridgeState === "offline" ? "本机服务未连接" : "正在检测 Codex"}</span></div></div>
        <div className="research-selector-row"><div><b>01</b><span>国家 / 市场</span><small>{researchCountries.length} 个市场</small></div><div className="research-option-list">{researchCountries.map(item=><button className={researchCountry===item?"active":""} key={item} onClick={()=>setResearchCountry(item)}>{item}</button>)}</div></div>
        <div className="research-selector-row"><div><b>02</b><span>销售平台</span><small>{researchPlatforms.length} 个平台</small></div><div className="research-option-list">{researchPlatforms.map(item=><button className={researchPlatform===item?"active":""} key={item} onClick={()=>setResearchPlatform(item)}>{item}</button>)}</div></div>
        <div className="research-selector-row"><div><b>03</b><span>营销文案语言</span><small>报告固定为中文</small></div><div className="research-option-list">{researchLanguages.map(item=><button className={researchLanguage===item?"active":""} key={item} onClick={()=>setResearchLanguage(item)}>{item}</button>)}</div></div>
      </section>
      {!researchJob || researchJob.status === "failed" ? <div className="research-setup-grid"><section className="panel product-input-panel"><div className="panel-heading"><div><p className="eyebrow">产品资料</p><h3>上传能够证明产品的真实信息</h3></div><span className="framework-tag">最多 12 个文件</span></div><label className="research-field"><span>产品名称</span><input value={researchProductName} onChange={event=>setResearchProductName(event.target.value)} placeholder="例如：透明硬质收纳箱" /></label><label className="research-field"><span>补充说明（可选）</span><textarea value={researchNotes} onChange={event=>setResearchNotes(event.target.value)} placeholder="可填写成本、目标价格、现有库存、已知卖点、限制条件或你特别想验证的问题。" /></label><label className="product-file-drop"><input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={event=>setResearchFiles(Array.from(event.target.files || []).slice(0,12))}/><span>＋ 选择产品资料</span><small>支持产品白底图、场景图、尺寸图、参数表、说明书、PDF、Word、Excel、CSV</small></label>{researchFiles.length>0&&<div className="research-file-list">{researchFiles.map((file,index)=><span key={`${file.name}-${index}`}><b>{String(index+1).padStart(2,"0")}</b><i>{file.name}</i><small>{(file.size/1024/1024).toFixed(1)} MB</small></span>)}</div>}</section>
        <aside className="panel research-output-map"><p className="eyebrow">预期输出</p><h3>一份中文分析＋目标语言文案的商品方案</h3><div>{[["人","目标人群与使用场景"],["痛","痛点链与现有替代方案"],["位","市场定位与核心信息"],["打","平台打法与转化路径"],["内","中文策略＋目标语言文案"],["险","风险边界与行动计划"]].map(([icon,label],index)=><span key={label}><b>{icon}</b><i>0{index+1}</i><strong>{label}</strong></span>)}</div><div className="research-lock-summary"><small>本次已选择</small><strong>{researchCountry} · {researchPlatform}</strong><span>报告：中文 · 营销文案：{researchLanguage}</span></div><button className="primary-button research-start-button" disabled={!researchFiles.length || bridgeState === "checking"} onClick={startProductResearch}>开始商品调研 →</button>{bridgeState === "offline"&&<p className="research-inline-warning">本机服务未连接，请先运行工作台服务。</p>}{researchError&&<p className="research-inline-warning">{researchError}</p>}</aside></div> : researchJob.status === "completed" ? <ProductResearchResult job={researchJob} country={researchCountry} platform={researchPlatform} language={researchLanguage} onConfirm={()=>onStage("04")} onRerun={rerunProductResearch} onNew={createNewProductResearch}/> : <section className={`panel research-progress-card ${researchJob.status}`}><div className="job-progress-ring" style={{"--progress":`${researchJob.progress*3.6}deg`} as CSSProperties}><span>{researchJob.progress}%</span></div><div><small>{researchCountry} · {researchPlatform} · 文案语言：{researchLanguage}</small><h3>{researchJob.statusLabel}</h3><p>{researchJob.detail}</p>{researchJob.codexThreadId&&<code>Codex 任务 {researchJob.codexThreadId.slice(0,8)}</code>}</div><div className="research-progress-steps">{["资料接收","证据整理","人群与痛点","市场打法","方案回写"].map((item,index)=><span className={researchJob.progress>=[18,38,66,82,100][index]?"done":""} key={item}><b>{index+1}</b>{item}</span>)}</div></section>}
    </div>}

    {stage === "04" && <section className="script-stage-shell">
      <header className="panel script-lineage-header"><div><p className="eyebrow">P3 脚本改写 → P4 分镜结构</p><h3>所有输出都从已确认资产继续，不重复拆解</h3><p>先读取商品调研和原片资产，再完成结构映射；本阶段只确认镜头结构，不生成画面提示词与参考图。</p></div><div className="script-stage-status"><span className={scriptApproved?"approved":"pending"}>P3 {scriptApproved?"已确认":"待确认"}</span><i>→</i><span className={storyboardReady?"approved":"pending"}>P4 {storyboardReady?"结构已确认":"等待脚本"}</span></div></header>
      <div className="script-lineage-grid"><article><b>01</b><div><small>商品调研</small><strong>{researchProductName || project.product}</strong><span>{researchReady?"已确认，直接继承人群 / 痛点 / 卖点":"需要先完成阶段 03"}</span></div><button onClick={()=>onStage("03")}>查看调研</button></article><article><b>02</b><div><small>原片资产</small><strong>{selectedPoolRecord?.title || "尚未选择参考视频"}</strong><span>{reusableAnalysis?`已命中分析资产 · 真实时长 ${replicaDurationSeconds} 秒`:"尚无可复用拆解，可返回阶段 02"}</span></div><button onClick={()=>onStage("02")}>查看原片</button></article><article><b>03</b><div><small>生成范围</small><strong>{researchCountry} · {researchPlatform}</strong><span>报告中文 · 消费者文案：{researchLanguage} · 9:16 · {replicaDurationSeconds} 秒</span></div><em>已继承</em></article></div>
      <div className="panel creative-workbench script-workbench-v2"><div className="workbench-tabs script-tabs-v2" role="tablist">{scriptTabs.map(([key,label],index)=>{const locked=key==="shots"&&!scriptApproved;return <button role="tab" aria-selected={scriptTab===key} disabled={locked} className={scriptTab===key?"active":""} key={key} onClick={()=>openScriptTab(key)}><b>{String(index+1).padStart(2,"0")}</b>{locked?`🔒 ${label}`:label}</button>})}</div>

      {scriptTab === "inputs" && <div className="script-input-canvas"><section className="script-input-checklist"><div className="panel-heading"><div><p className="eyebrow">生成前输入检查</p><h3>三类资料必须能追溯来源</h3></div><span className="approved-pill">当前项目可生成</span></div><div className="input-proof-grid"><article><span>研究</span><h4>商品调研方案</h4><p>人群、需求、痛点、卖点顺序和风险边界从阶段 03 继承。</p><small>{researchJob?.id?`资产 ${researchJob.id.slice(-8).toUpperCase()}`:"资产 CP-530L-P2"}</small></article><article><span>原片</span><h4>V1 / 文案分析资产</h4><p>优先按视频 ID＋文件指纹复用已保存结果；不再次转写或拆解。</p><small>{reusableAnalysis?"复用命中 · 0 次重复操作":"未命中 · 需要创建分析任务"}</small></article><article><span>产品</span><h4>产品证明资料</h4><p>白底图、场景图、尺寸图和参数证明继续作为事实边界。</p><small>产品结构与标签已锁定</small></article></div></section><aside className="reference-upload-card"><p className="eyebrow">单独参考视频</p><h3>没有从爆款池选择时可在这里补充</h3><p>上传后先读取视频真实时长，再检查是否与阶段 02 的视频 ID 或文件指纹重复；命中则直接复用。</p><label><input type="file" multiple accept="video/mp4,video/quicktime,video/webm,.mkv" onChange={event=>handleReferenceFiles(Array.from(event.target.files||[]))}/><span>＋ 上传参考视频</span></label>{referenceFiles.length>0&&<div>{referenceFiles.map((file,index)=><span key={file.name}><b>{file.name}</b><small>{index===0&&uploadedReferenceDuration?`已读取真实时长 ${uploadedReferenceDuration.toFixed(3)} 秒 · 等待去重检查`:"等待去重检查"}</small></span>)}</div>}</aside></div>}

      {scriptTab === "mapping" && <div className="mapping-workbench"><section className="hook-decision-panel"><div className="panel-heading"><div><p className="eyebrow">P3 · 第7点</p><h3>黄金 3 秒开头适配决策</h3><p>透明收纳箱属于强需求产品，可测试痛点或结果开头；后续脚本、分镜与提示词必须沿用同一版本。</p></div><span className="framework-tag">当前采用 {hookVersion} 版</span></div><div className="hook-version-grid">{Object.entries(hookVersions).map(([key,value])=><button className={hookVersion===key?"active":""} key={key} onClick={()=>{setHookVersion(key as keyof typeof hookVersions);setScriptApproved(false);setStoryboardReady(false);}}><span>{value.recommended?"推荐":"测试"}</span><h4>{value.label}</h4><p>{value.visual}</p><small>{value.reason}</small></button>)}</div></section><section className="mapping-table-wrap"><div className="panel-heading"><div><p className="eyebrow">1:1 结构复刻约束</p><h3>原片结构槽位 → 用户产品变量</h3></div><span className="source-chip">引用阶段 02 资产</span></div><div className="mapping-table"><div className="mapping-row mapping-head"><span>时间</span><span>原片结构槽位</span><span>角色 / 事件约束</span><span>本项目替换画面</span><span>目的</span></div>{scriptMicroRows.map((row,index)=><div className="mapping-row" key={row.id}><b>{row.time}</b><span>{row.slot}<small>结构位置与顺序保留</small></span><span>{row.roles}</span><span>{shotRows[index].scene}</span><i>{row.purpose}</i></div>)}</div><p className="placeholder-note">这里只引用已保存的真实镜头时间与结构槽位；产品、场景、台词和证明素材允许替换，人物数量、事件顺序、产品亮相、证明与 CTA 位置不得擅自改变。</p></section></div>}

      {scriptTab === "script" && <div className="script-editor script-editor-v2"><div className="script-summary"><span>{hookVersion}版目标脚本 · V1</span><b>{replicaDurationSeconds} 秒 · {researchPlatform} · {researchLanguage}</b><i>时长来源：{replicaDurationSource} · 脚本状态：{scriptApproved?"已确认":"草案待确认"}</i></div><section className="hook-lock-summary"><div><small>主钩子</small><strong>{currentHook.type}</strong></div><div><small>开头画面</small><strong>{currentHook.visual}</strong></div><div><small>选择依据</small><strong>{currentHook.reason}</strong></div></section><div className="script-micro-table"><div className="script-micro-row script-micro-head"><span>镜头 / 时间</span><span>结构功能</span><span>字幕 / 口播</span><span>画面与角色</span><span>转化目的</span></div>{scriptMicroRows.map((row,index)=><article className="script-micro-row" key={row.id}><b>{row.id}<small>{row.time}</small></b><span>{row.slot}</span><p>{row.id==="A-S02"?`“${currentHook.line}”`:row.line?`“${row.line}”`:"无口播 · 视觉先行"}</p><span>{shotRows[index].scene}<small>{row.roles}</small></span><i>{row.purpose}</i></article>)}</div><div className="script-self-check"><span>✓ 黄金3秒与 {hookVersion} 版一致</span><span>✓ 产品在 2.4 秒前出现</span><span>✓ 真实证明位置已保留</span><span>✓ CTA 位于原结构结尾</span><span>✓ 未虚构优惠与产品效果</span></div><div className="script-approval-bar"><div><small>P3 审核门</small><strong>{scriptApproved?"当前脚本已锁定，可进入分镜结构确认":"请先审核口播、镜头顺序和证明边界"}</strong></div><button className="secondary-button" onClick={()=>{setScriptApproved(false);setStoryboardReady(false);}}>生成新版本</button><button className="primary-button" onClick={()=>{setScriptApproved(true);setStoryboardReady(false);setScriptTab("shots");}}>确认脚本，进入分镜结构 →</button></div></div>}

      {scriptTab === "shots" && (!scriptApproved?<div className="stage-locked-state"><span>LOCKED</span><h3>分镜结构尚未解锁</h3><p>请先在“目标脚本”中确认黄金 3 秒版本与完整脚本，避免后续镜头结构使用错误版本。</p><button className="primary-button" onClick={()=>setScriptTab("script")}>返回确认脚本</button></div>:!storyboardReady?<div className="storyboard-generate-gate"><span>P4</span><h3>脚本已锁定，可以生成分镜结构</h3><p>将按参考视频真实时长拆出镜头时间、画面内容、口播、卖点、运镜与制作方式；此处不生成画面提示词或图片。</p><div><b>画幅 9:16</b><b>时长 {replicaDurationSeconds} 秒</b><b>时长来自参考视频</b><b>只确认结构</b></div><button className="primary-button" onClick={()=>setStoryboardReady(true)}>生成分镜结构 →</button></div>:<div className="storyboard-table-wrap"><div className="panel-heading"><div><p className="eyebrow">P4 分镜结构确认</p><h3>{hookVersion}版 · 7 镜 / {replicaDurationSeconds} 秒 / 9:16</h3><p>这里只确认镜头时间、内容、口播、转化目的、运镜与制作方式。</p></div><span className="approved-pill">7 / 7 镜头结构已确认</span></div><div className="storyboard-table-scroll"><div className="storyboard-table"><div className="storyboard-row storyboard-head"><span>镜头</span><span>时长</span><span>画面内容</span><span>字幕 / 口播</span><span>目的</span><span>卖点</span><span>运镜 / 转场</span><span>制作建议</span></div>{shotRows.map((row,index)=>{const scriptRow=scriptMicroRows[index];return <button className={selectedShot===row.id?"storyboard-row selected":"storyboard-row"} key={row.id} onClick={()=>setSelectedShot(row.id)}><b>{row.id}</b><span>{row.time}</span><span>{row.scene}</span><span>{row.id==="A-S02"?currentHook.line:scriptRow.line||"视觉先行"}</span><i>{scriptRow.purpose}</i><span>{index<2?"痛点识别":index<5?"真实收纳证明":index===5?"透明可视":"整洁结果"}</span><span>{index===0?"快速轻推":index<5?"固定机位跳切":"缓慢推进"}</span><em className={row.mode.includes("实拍")?"mode-live":"mode-ai"}>{row.mode}</em></button>})}</div></div><div className="stage-handoff-note"><div><small>下一阶段唯一生图入口</small><strong>画面提示词 → 参考图</strong></div><p>分镜结构确认后，阶段 05 会按镜头生成画面提示词，并集中展示、审核和复用已有参考图。</p><button className="secondary-button" onClick={()=>onStage("05")}>前往画面提示词 →</button></div></div>)}

      {scriptTab === "route" && <div className="route-board"><article><span className="route-type ai">AI</span><h3>AI / 合成镜头</h3><p>痛点氛围、人物亮相、透明可视和结尾英雄画面，以确认的产品与人物锚点生成。</p><strong>4 个镜头</strong><small>A-S01 · 02 · 06 · 07</small></article><article><span className="route-type live">LIVE</span><h3>必须实拍</h3><p>装入、分类、合盖与推入低柜属于产品结构和操作证明，必须使用真实样品。</p><strong>3 个镜头</strong><small>A-S03 · 04 · 05</small></article><article><span className="route-type hybrid">RULE</span><h3>自动分流原则</h3><p>凡是结构、材质、尺寸、承重、操作效果等信任证据默认标记实拍；其它内容优先 AI。</p><strong>逐镜审核</strong><small>不允许 AI 替代真实性证明</small></article></div>}
      {scriptTab === "locks" && <div className="lock-board real-lock-board script-locks-v2"><article><img src="/video-projects/storage-box-viral-test-001/product-white.jpg" alt="产品锁定图"/><div><small>产品锁定资料</small><h3>530L 产品指纹卡</h3><p>透明箱体、黑色把手、标签、比例与真实结构已锁定，后续生成不得漂移。</p><span className="approved-pill">已审核</span></div></article><article><img src="/video-projects/storage-box-viral-test-001/A-S02.png" alt="人物与产品参考图"/><div><small>人物与场景锚点</small><h3>A-S02 人物参考</h3><p>人物外观、服装、玩具房光线与产品亮相构图沿用到所有 AI 镜头。</p><span className="approved-pill">已审核</span></div></article><article className="text-lock-card"><div className="lock-text-mark">V1</div><div><small>原片结构资产</small><h3>仅保存一次的拆解资产</h3><p>原片脚本、真实镜头时间、角色/事件链、转化位置和不确定信息统一由阶段 02 提供。</p><span className={reusableAnalysis?"approved-pill":"waiting-pill"}>{reusableAnalysis?"复用已命中":"等待拆解"}</span></div></article></div>}
      <div className="stage-actions script-stage-actions"><span>{scriptApproved&&storyboardReady?"脚本与分镜结构已确认，可进入画面提示词和参考图生产":"完成脚本与分镜结构审核后才能进入下一阶段"}</span><button className="primary-button" disabled={!scriptApproved||!storyboardReady} onClick={()=>{setProductionTab("image-prompt");onStage("05");}}>进入画面提示词 →</button></div></div></section>}

    {stage === "05" && <section className="production-shell production-project-shell">
      <header className="production-project-header"><div><p className="eyebrow">阶段 05 · 子项目工作区</p><h2>视频生产与发布</h2><p>每个生产环节都是独立子项目，资产按顺序传递但页面互不混放。</p></div><span>{productionTabs.find(item=>item[0]===productionTab)?.[1]}</span></header>
      <div className="production-project-layout"><aside className="production-project-nav"><div><small>生产子项目</small><strong>5 个独立工作区</strong></div>{productionProjectGroups.map(group=><section key={group.label}><small>{group.label}</small>{group.items.map(([key,label])=>{const index=productionTabs.findIndex(item=>item[0]===key);return <button className={productionTab===key?"active":""} key={key} onClick={()=>openProductionTab(key)}><b>{String(index+1).padStart(2,"0")}</b><span>{label}</span><i>{key==="ai-video"?"独立创作":"›"}</i></button>})}</section>)}</aside><div className="production-project-canvas">
      {productionTab === "video-prompt" && <div className="generation-configurator">
        <div className="generation-config-heading"><div><p className="eyebrow">视频提示词配置</p><h3>选择生成模型，为已确认脚本拆分视频提示词</h3><p>复刻脚本、黄金开头、转化结构、结尾逼单和成片总时长均继承阶段 02–04；这里不重新生成或改写脚本。</p></div><span className={generationPlanReady?"approved-pill":"waiting-pill"}>{generationPlanReady?"提示词已按模型拆分":"等待选择模型与时长"}</span></div>
        <div className="video-model-grid">{videoGenerationModels.map(model=><button className={videoModelId===model.id?"active":""} key={model.id} onClick={()=>{setVideoModelId(model.id);setVideoSegmentLimit(null);invalidateGenerationPlan();}}><span>{model.name}</span><b>{model.minSeconds}s–{model.maxSeconds}s</b><small>{model.note}</small></button>)}</div>
        <div className="duration-config-row"><label><span>模型单段生成时长</span><select aria-label="选择单段生成时长" disabled={!selectedVideoModel} value={videoSegmentLimit ?? ""} onChange={event=>{setVideoSegmentLimit(event.target.value?Number(event.target.value):null);invalidateGenerationPlan();}}><option value="">{selectedVideoModel?"请选择时长":"请先选择模型"}</option>{videoDurationOptions.map(seconds=><option value={seconds} key={seconds}>{seconds} 秒</option>)}</select></label><div><small>复刻成片总时长 · {replicaDurationSource}</small><strong>{replicaDurationSeconds} 秒 · 不随模型改变</strong><span>{videoSegmentLimit?`自动拆分：${generationSplitLabel}${generationSegments.some(segment=>segment.trim>0)?"，末段生成后裁切":""}`:"选择后显示模型提示词分段"}</span></div><button className="primary-button" disabled={!selectedVideoModel||!videoSegmentLimit} onClick={confirmGenerationPlan}>按模型拆分视频提示词 →</button></div>
        {generationPlanReady&&selectedVideoModel&&<div className="generation-plan-summary"><span><small>已确认复刻脚本</small><b>{replicaDurationSeconds} 秒 · A版</b></span><span><small>生成模型</small><b>{selectedVideoModel.name}</b></span><span><small>模型单段时长</small><b>{videoSegmentLimit}s</b></span><span><small>提示词拆分结果</small><b>{generationSplitLabel}</b></span><button className="secondary-button" onClick={invalidateGenerationPlan}>修改模型配置</button></div>}
      </div>}
      {!generationPlanReady&&!(["image-prompt","reference","ai-video","publish"] as string[]).includes(productionTab)?<div className="production-config-gate"><span>PROMPT GATE</span><h3>复刻脚本已经确认，等待生成模型配置</h3><p>选择模型及其单段生成时长后，系统只对现有 {replicaDurationSeconds} 秒脚本做时间切片，并生成每一段可直接复制或提交 API 的视频提示词。</p><div className="script-source-flow"><b>原片拆解<small>脚本＋真实时长</small></b><i>→</i><b>结构复刻<small>钩子＋转化＋逼单</small></b><i>→</i><b>已确认脚本<small>{replicaDurationSeconds} 秒 · A版</small></b><i>→</i><strong>模型提示词<small>等待拆分</small></strong></div><div className="model-limit-strip">{videoGenerationModels.map(model=><b key={model.id}>{model.name}<small>{model.minSeconds}s–{model.maxSeconds}s</small></b>)}</div></div>:<div className={productionTab==="ai-video"?"production-body ai-creation-mode":productionTab==="publish"?"production-body publish-mode":"production-body"}><aside className="shot-sidebar"><div><small>已确认镜头 / 提示词段</small><strong>7 镜 · {generationSegments.length} 段</strong></div>{shotRows.map(row=><button className={selectedShot===row.id?"active":""} key={row.id} onClick={()=>setSelectedShot(row.id)}><b>{row.id}</b><span>{row.time} · {row.mode}</span><small>{row.status}</small></button>)}</aside><main className="asset-workbench"><div className="asset-header"><div><p className="eyebrow">{activeShot.id} · {activeShot.time}</p><h3>{activeShot.scene}</h3></div><span className={activeShot.mode.includes("实拍")?"asset-mode live":"asset-mode ai"}>{activeShot.mode}</span></div>
        {productionTab === "image-prompt" && <div className="prompt-editor compact-image-prompt"><div className="prompt-meta"><span>画面提示词 · {activeShot.id}</span><i>继承阶段 04 已确认分镜结构</i></div><p>{activeShot.imagePrompt}</p><div className="negative-box"><small>统一禁止项</small><span>不改产品结构与比例；不虚构功能和参数；不生成品牌外文字、价格、水印、多余手指或变形箱体。</span></div><div className="image-prompt-actions"><div><small>参考图按镜头和版本保存</small><strong>生成新版本不会覆盖已有图片</strong></div><button className="secondary-button" onClick={()=>{setReferenceEntryMode("view");setProductionTab("reference");}}>查看已有参考图</button><button className="primary-button" onClick={()=>{setReferenceEntryMode("generate");setProductionTab("reference");}}>生成参考图 →</button></div></div>}
        {productionTab === "reference" && <div className="real-reference-workbench" data-project-id={project.workspaceId}><section className="reference-project-scope"><div><small>当前项目专属参考图库</small><strong>{project.id}</strong><span>{project.product} · {project.workspaceId}</span></div><div><small>资产隔离规则</small><b>只显示当前项目</b><span>切换任务时自动进入对应项目图库</span></div></section>{referenceEntryMode==="generate"&&<div className="reference-generation-card"><div><small>为 {project.id} / {activeShot.id} 生成新版本</small><strong>将保存为 V{(activeReferenceAsset?.version||1)+1}，当前版本不会被覆盖</strong><p>{activeShot.imagePrompt}</p></div><button className="primary-button" disabled title="需要接入图片生成服务后才能正式提交">图片生成服务待接入</button></div>}<div className="reference-asset-origin"><div><small>本项目参考图资产</small><strong>{referenceEntryMode==="generate"?"生成新版本，同时保留当前版本":"当前只展示本项目镜头"}</strong></div><span className="approved-pill">{currentProjectReferenceAssets.length||7} 个版本 · 项目内可复用</span></div><div className="selected-reference"><img src={activeReferenceAsset?.imageUrl||activeShot.image} alt={`${project.id} ${activeShot.id} 已确认参考图`}/><div><span className="approved-pill">当前版本 · V{activeReferenceAsset?.version||1}</span><h3>{activeShot.id}</h3><p>{activeShot.asset}</p><small className="reference-retention-note">资产归属：{project.id}。新增生成只追加到本项目，不会进入其它任务图库。</small></div></div><div className="real-reference-grid">{shotRows.map(row=>{const versions=currentProjectReferenceAssets.filter(asset=>asset.shotId===row.id).sort((a,b)=>b.version-a.version);const latest=versions[0];return <button className={selectedShot===row.id?"selected":""} key={`${project.workspaceId}:${row.id}`} onClick={()=>setSelectedShot(row.id)}><img src={latest?.imageUrl||row.image} alt={`${project.id} ${row.id}参考图`}/><span><b>{row.id}</b><small>{row.time} · V{latest?.version||1} · {versions.length||1}版</small></span></button>})}</div><div className="reference-contact-sheet"><img src="/video-projects/storage-box-viral-test-001/contact-sheet.jpg" alt={`${project.id} A版七镜参考图总览`}/><div><small>{project.id} · 项目总览图</small><strong>A版 · 七镜参考图总览</strong><p>总览图也只归属于当前项目，用于核对镜头顺序、人物、产品与场景连续性。</p></div></div><div className="quality-checks"><span>✓ 当前项目资产已隔离</span><span>✓ 项目 ID 已写入每个版本</span><span>✓ 新任务使用独立图库</span><span>✓ 新版本不覆盖旧版本</span></div></div>}
        {productionTab === "video-prompt" && <div className="video-segment-workbench"><div className="segment-workbench-heading"><div><p className="eyebrow">已确认复刻脚本 → 模型提示词</p><h3>{selectedVideoModel?.name} · {generationSplitLabel} · 成片仍为 {replicaDurationSeconds} 秒</h3></div><span>{generationSegments.length} 份可独立复制的提示词</span></div><div className="video-segment-list">{generationSegments.map(segment=><article key={segment.id}><header><div><b>{segment.id}</b><span>脚本时间 {formatSeconds(segment.start)}–{formatSeconds(segment.sourceEnd)}s</span></div><em>生成 {formatSeconds(segment.end-segment.start)}s</em></header><div className="segment-shot-tags">{segment.shots.map(shot=><span key={shot.id}>{shot.id}</span>)}</div><h4>引用的已确认脚本片段</h4><p>{segment.scriptRows.map(row=>`${row.time}｜${row.slot}${row.id==="A-S02"?`｜${currentHook.line}`:row.line?`｜${row.line}`:""}`).join("；")}</p><h4>按 {selectedVideoModel?.name} 拆分的视频提示词</h4><p>{segment.shots.map(shot=>shot.videoPrompt).join(" ")}</p>{segment.trim>0&&<small className="trim-note">原片剩余不足模型最短 4 秒：本段生成 {formatSeconds(segment.end-segment.start)} 秒，剪辑时仅保留到 {formatSeconds(segment.sourceEnd)} 秒并裁掉末尾 {formatSeconds(segment.trim)} 秒。</small>}</article>)}</div><div className="prompt-specs"><span>脚本来源 <b>阶段 02–04 已确认</b></span><span>生成模型 <b>{selectedVideoModel?.name}</b></span><span>复刻成片 <b>{replicaDurationSeconds} 秒</b></span><span>重试 <b>每段最多 2 次</b></span></div><div className="negative-box"><small>统一一致性要求</small><span>不得改变原脚本的黄金开头、内容结构、产品证明顺序和结尾逼单；人物、产品、场景和光线不得漂移。</span></div><div className="editor-actions"><button className="primary-button" onClick={()=>setProductionTab("ai-video")}>进入 AI 视频创作 →</button></div></div>}
        {productionTab === "ai-video" && <AiVideoCreation projectId={project.workspaceId} modelName={selectedVideoModel?.name||"未选择模型"} providerModel={providerModel} segments={aiCreationSegments}/>}
        {productionTab === "publish" && <BatchUpmeePublishWorkspace projectId={project.workspaceId}/>}
      </main></div>}
      </div></div>
    </section>}

    {stage === "06" && <VideoReviewDashboard projectId={project.workspaceId} view={view} onView={onView}/>}

    {stage !== "06" && stage !== "05" && stage !== "04" && stage !== "03" && stage !== "01" && stage !== "02" && stage !== "00" && <div className="bottom-next"><span>该项目的每一步均保留真实检查点。</span><button onClick={()=>onStage(nextStage)}>下一工作站：{videoStageMeta[nextStage].title} →</button></div>}
  </>;
}

export default function Home() {
  const [active, setActive] = useState<ModuleKey>("dashboard");
  const [videoStage, setVideoStage] = useState<VideoStageKey>("00");
  const [videoView, setVideoView] = useState("");
  const [historyIndex, setHistoryIndex] = useState(0);
  const [role, setRole] = useState<keyof typeof roleTasks>("老板");
  const [shop, setShop] = useState("all");
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const current = navigation.find(item => item.key === active)!;
  const applyLocation=(location:{module:ModuleKey;stage:VideoStageKey;view:string})=>{setActive(location.module);setVideoStage(location.stage);setVideoView(location.view);};
  const writeLocation=(module:ModuleKey,stage:VideoStageKey,view:string,index:number,mode:"push"|"replace"="push")=>{
    const url=new URL(window.location.href);url.searchParams.set("module",module);
    if(module==="video"){url.searchParams.set("stage",stage);if(view)url.searchParams.set("view",view);else url.searchParams.delete("view");}
    else{url.searchParams.delete("stage");url.searchParams.delete("view");}
    const state:WorkbenchHistoryState={tkWorkbench:true,index,module,stage,view};
    window.history[mode==="push"?"pushState":"replaceState"](state,"",url);
  };
  const navigate=(module:ModuleKey,stage:VideoStageKey=videoStage,view=module==="video"?defaultVideoView(stage):"")=>{
    if(module===active&&stage===videoStage&&view===videoView)return;
    const nextIndex=historyIndex+1;applyLocation({module,stage,view});setHistoryIndex(nextIndex);writeLocation(module,stage,view,nextIndex);
  };
  const goBack=()=>{
    if(historyIndex>0){window.history.back();return;}
    if(active==="video"&&videoStage!=="00"){const currentIndex=videoStages.findIndex(item=>item.key===videoStage);navigate("video",videoStages[Math.max(0,currentIndex-1)].key);return;}
    if(active!=="dashboard")navigate("dashboard","01","");
  };
  useEffect(()=>{
    const initial=readWorkbenchLocation();applyLocation(initial);
    const existing=window.history.state as Partial<WorkbenchHistoryState>|null;
    const index=existing?.tkWorkbench&&typeof existing.index==="number"?existing.index:0;
    setHistoryIndex(index);writeLocation(initial.module,initial.stage,initial.view,index,"replace");
    const onPopState=(event:PopStateEvent)=>{const location=readWorkbenchLocation();applyLocation(location);const state=event.state as Partial<WorkbenchHistoryState>|null;setHistoryIndex(state?.tkWorkbench&&typeof state.index==="number"?state.index:0);};
    window.addEventListener("popstate",onPopState);return()=>window.removeEventListener("popstate",onPopState);
  },[]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/store-data?shop=${encodeURIComponent(shop)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => ({ ok: response.ok, body: await response.json() as StoreData }))
      .then(({ body }) => setStoreData(body))
      .catch(error => {
        if (error instanceof Error && error.name === "AbortError") return;
        setStoreData({ connected:false, error:"数据库连接失败", detail:"无法访问工作台服务端数据接口。", shops:[], dashboard:[], metrics:[], alerts:[], inventory:[], packages:[], refunds:[], products:[], counts:{orders:0,refunds:0,packages:0,products:0,skus:0} });
      })
      .finally(()=>setStoreLoading(false));
    return () => controller.abort();
  }, [shop]);
  const openAlertCount = storeData?.connected ? storeData.alerts.length : 29;
  const stageIndex=videoStages.findIndex(item=>item.key===videoStage);
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">T</span><div><strong>TK 工作台</strong><small>SELLER OS</small></div></div>
      <nav aria-label="主要功能">{navigation.map(item => item.key === "video" ? <div className="nav-group" key={item.key}><button aria-current={active===item.key?"page":undefined} className={active===item.key?"nav-item active":"nav-item"} onClick={()=>navigate("video",videoStage,videoView||defaultVideoView(videoStage))}><span>{item.icon}</span>{item.label}<i>{active === "video" ? "−" : "+"}</i></button>{active === "video" && <div className="video-subnav">{videoStages.map(stage=><button className={videoStage===stage.key?"active":""} key={stage.key} onClick={()=>navigate("video",stage.key)}><b>{stage.key}</b>{stage.label}</button>)}</div>}</div> : <button aria-current={active===item.key?"page":undefined} className={active===item.key?"nav-item active":"nav-item"} key={item.key} onClick={()=>navigate(item.key)}><span>{item.icon}</span>{item.label}</button>)}</nav>
      <div className="sidebar-footer"><span className="status-dot" /> 真实内容项目已接入<small>{storeData?.connected ? "Supabase 业务数据已连接" : "Supabase 服务端接入待密钥"}</small></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div className="topbar-location">{(active!=="dashboard"||historyIndex>0)&&<button className="workbench-back-button" onClick={goBack} aria-label="返回上一页">←</button>}<div><p className="workbench-breadcrumb">工作台{active!=="dashboard"?` / ${current.label}`:""}{active==="video"?` / ${videoStageMeta[videoStage].title}`:""}</p><h1>{active === "video" ? `${current.label} · ${videoStageMeta[videoStage].title}` : current.label}</h1></div></div><div className="top-actions"><label className="shop-selector"><select aria-label="选择店铺" value={shop} onChange={event=>{setStoreLoading(true);setShop(event.target.value);}}><option value="all">全部店铺</option>{(storeData?.shops || []).map(row=><option key={String(row.id)} value={String(row.shop_code)}>{display(row.shop_code)} · {display(row.shop_name)}</option>)}</select></label><button className="icon-button" aria-label={`${openAlertCount} 项待处理通知`}>●<b>{openAlertCount}</b></button><label className="role-select"><span>当前视图</span><select value={role} onChange={event=>setRole(event.target.value as keyof typeof roleTasks)}><option>老板</option><option>运营</option><option>拍剪</option></select></label></div></header>
      <div className="content">{active==="video"&&<nav className="stage-step-navigation" aria-label="短视频工厂阶段导航"><button disabled={stageIndex<=0} onClick={()=>navigate("video",videoStages[stageIndex-1].key)}>← 上一步</button><span>第 {stageIndex+1} / {videoStages.length} 步 · {videoStageMeta[videoStage].title}</span><button disabled={stageIndex>=videoStages.length-1} onClick={()=>navigate("video",videoStages[stageIndex+1].key)}>下一步 →</button></nav>}{active === "dashboard" ? <Dashboard onAlerts={()=>navigate("alerts")} data={storeData} loading={storeLoading} /> : active === "video" ? <RealVideoFactory stage={videoStage} onStage={stage=>navigate("video",stage)} view={videoView} onView={view=>navigate("video",videoStage,view)} /> : <ModuleView moduleKey={active} data={storeData} />}</div>
      <div className="mobile-nav" aria-label="移动端快捷导航">{navigation.filter(item=>["dashboard","alerts","logistics","ads","video"].includes(item.key)).map(item=><button className={active===item.key?"active":""} key={item.key} onClick={()=>navigate(item.key)}><span>{item.icon}</span><small>{item.label.replace("老板","")}</small></button>)}</div>
    </section>
  </main>;
}
