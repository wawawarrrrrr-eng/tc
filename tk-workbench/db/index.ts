import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { legacyResearchProjects } from "./legacy-research-projects";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export async function ensureVideoProjectSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS video_projects (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL,
      product_name TEXT DEFAULT '待补充产品' NOT NULL,
      source_id TEXT NOT NULL,
      source_json TEXT NOT NULL,
      analysis_id TEXT,
      research_id TEXT,
      current_stage TEXT DEFAULT '02' NOT NULL,
      status TEXT DEFAULT '已创建' NOT NULL,
      workflow_json TEXT DEFAULT '{}' NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_video_projects_code ON video_projects(code)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_video_projects_source ON video_projects(source_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_video_projects_updated ON video_projects(updated_at)"),
  ]);
}

export async function ensureResearchSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS research_projects (
      id TEXT PRIMARY KEY NOT NULL,
      product_name TEXT NOT NULL,
      country TEXT NOT NULL,
      platform TEXT NOT NULL,
      language TEXT NOT NULL,
      status TEXT NOT NULL,
      status_label TEXT NOT NULL,
      progress INTEGER DEFAULT 100 NOT NULL,
      detail TEXT DEFAULT '' NOT NULL,
      mode_label TEXT DEFAULT '商品调研' NOT NULL,
      codex_thread_id TEXT,
      asset_count INTEGER DEFAULT 0 NOT NULL,
      result_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_research_projects_updated_at ON research_projects(updated_at)"),
  ]);
  await env.DB.batch(legacyResearchProjects.map((project) => env.DB.prepare(`INSERT OR IGNORE INTO research_projects (
    id, product_name, country, platform, language, status, status_label, progress, detail,
    mode_label, codex_thread_id, asset_count, result_json, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      project.id, project.productName, project.country, project.platform, project.language,
      project.status, project.statusLabel, project.progress, project.detail, project.modeLabel,
      project.codexThreadId, project.assetCount, project.resultJson, project.updatedAt,
    )));
}

export async function ensureAnalysisSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS analysis_projects (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL,
      source_json TEXT NOT NULL,
      mode TEXT NOT NULL,
      mode_label TEXT NOT NULL,
      status TEXT NOT NULL,
      status_label TEXT NOT NULL,
      progress INTEGER DEFAULT 100 NOT NULL,
      detail TEXT DEFAULT '' NOT NULL,
      codex_thread_id TEXT,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_analysis_projects_updated_at ON analysis_projects(updated_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_analysis_projects_source_mode ON analysis_projects(source_id, mode)"),
  ]);
}

export async function ensureAiVideoSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS ai_video_jobs (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT DEFAULT 'legacy' NOT NULL,
      segment_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      provider_model TEXT,
      duration INTEGER NOT NULL,
      ratio TEXT NOT NULL,
      reference_mode TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0 NOT NULL,
      error TEXT,
      video_url TEXT,
      group_name TEXT DEFAULT '未分组' NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_ai_video_jobs_created_at ON ai_video_jobs(created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_ai_video_jobs_project_created ON ai_video_jobs(project_id, created_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_ai_video_jobs_group_created ON ai_video_jobs(group_name, created_at)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS ai_video_groups (
      name TEXT PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare("INSERT OR IGNORE INTO ai_video_groups (name, created_at) VALUES ('未分组', '2026-08-20T00:00:00.000Z')"),
  ]);
}

export async function ensureReferenceImageSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS reference_image_assets (
      id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      project_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      shot_id TEXT NOT NULL,
      version INTEGER DEFAULT 1 NOT NULL,
      prompt TEXT NOT NULL,
      image_url TEXT NOT NULL,
      status TEXT DEFAULT 'confirmed' NOT NULL,
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_reference_images_project_created ON reference_image_assets(project_id, created_at)"),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_reference_images_project_shot_version ON reference_image_assets(project_id, shot_id, version)"),
  ]);
}

export async function ensureVideoReviewSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS publish_project_links (
      task_id TEXT PRIMARY KEY NOT NULL,
      project_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_publish_project_links_project ON publish_project_links(project_id, created_at)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS video_metric_snapshots (
      id TEXT PRIMARY KEY NOT NULL,
      item_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      title TEXT DEFAULT '' NOT NULL,
      media_name TEXT DEFAULT '' NOT NULL,
      video_url TEXT DEFAULT '' NOT NULL,
      cover_url TEXT DEFAULT '' NOT NULL,
      published_at INTEGER DEFAULT 0 NOT NULL,
      metrics_json TEXT NOT NULL,
      trend_json TEXT NOT NULL,
      captured_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_video_snapshots_item_captured ON video_metric_snapshots(item_id, captured_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_video_snapshots_published ON video_metric_snapshots(published_at)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS video_weekly_reports (
      id TEXT PRIMARY KEY NOT NULL,
      range_start INTEGER NOT NULL,
      range_end INTEGER NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_video_reports_created ON video_weekly_reports(created_at)"),
  ]);
}

export async function ensureContentPlanSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS content_plans (
      id TEXT PRIMARY KEY NOT NULL,
      plan_date TEXT NOT NULL,
      target_count INTEGER NOT NULL,
      status TEXT DEFAULT 'draft' NOT NULL,
      input_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      codex_thread_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_content_plans_date_updated ON content_plans(plan_date, updated_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_content_plans_status_updated ON content_plans(status, updated_at)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS content_tasks (
      id TEXT PRIMARY KEY NOT NULL,
      plan_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      target_account TEXT NOT NULL,
      video_type TEXT NOT NULL,
      script_direction TEXT NOT NULL,
      publish_time TEXT NOT NULL,
      success_metric TEXT NOT NULL,
      next_agent TEXT NOT NULL,
      dependency_json TEXT DEFAULT '[]' NOT NULL,
      status TEXT DEFAULT 'waiting_confirmation' NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_content_tasks_plan_order ON content_tasks(plan_id, order_index)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_content_tasks_status_updated ON content_tasks(status, updated_at)"),
  ]);
}

export async function ensureSourceAssetSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS source_assets (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      link TEXT DEFAULT '' NOT NULL,
      embed_url TEXT DEFAULT '' NOT NULL,
      metrics_json TEXT DEFAULT '{}' NOT NULL,
      classification_json TEXT DEFAULT '{}' NOT NULL,
      fit_score INTEGER DEFAULT 0 NOT NULL,
      decision TEXT DEFAULT 'observe' NOT NULL,
      status TEXT DEFAULT 'classified' NOT NULL,
      agent_job_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_source_assets_task_source ON source_assets(task_id, source_id)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_source_assets_task_score ON source_assets(task_id, fit_score)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_source_assets_status_updated ON source_assets(status, updated_at)"),
  ]);
}

export async function ensureCollectionStrategySchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS collection_strategies (
      id TEXT PRIMARY KEY NOT NULL,
      task_id TEXT NOT NULL,
      name TEXT NOT NULL,
      keywords TEXT NOT NULL,
      market TEXT NOT NULL,
      platforms_json TEXT DEFAULT '[]' NOT NULL,
      signals_json TEXT DEFAULT '[]' NOT NULL,
      data_window TEXT DEFAULT '30d' NOT NULL,
      min_views INTEGER DEFAULT 0 NOT NULL,
      min_likes INTEGER DEFAULT 0 NOT NULL,
      max_results INTEGER DEFAULT 12 NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_collection_strategies_task_updated ON collection_strategies(task_id, updated_at)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_collection_strategies_status_updated ON collection_strategies(status, updated_at)"),
  ]);
}
