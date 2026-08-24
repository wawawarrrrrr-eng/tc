import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const videoProjects = sqliteTable("video_projects", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  productName: text("product_name").notNull().default("待补充产品"),
  sourceId: text("source_id").notNull(),
  sourceJson: text("source_json").notNull(),
  analysisId: text("analysis_id"),
  researchId: text("research_id"),
  currentStage: text("current_stage").notNull().default("02"),
  status: text("status").notNull().default("已创建"),
  workflowJson: text("workflow_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_video_projects_code").on(table.code),
  index("idx_video_projects_source").on(table.sourceId),
  index("idx_video_projects_updated").on(table.updatedAt),
]);

export const researchProjects = sqliteTable("research_projects", {
  id: text("id").primaryKey(),
  productName: text("product_name").notNull(),
  country: text("country").notNull(),
  platform: text("platform").notNull(),
  language: text("language").notNull(),
  status: text("status").notNull(),
  statusLabel: text("status_label").notNull(),
  progress: integer("progress").notNull().default(100),
  detail: text("detail").notNull().default(""),
  modeLabel: text("mode_label").notNull().default("商品调研"),
  codexThreadId: text("codex_thread_id"),
  assetCount: integer("asset_count").notNull().default(0),
  resultJson: text("result_json").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_research_projects_updated_at").on(table.updatedAt)]);

export const analysisProjects = sqliteTable("analysis_projects", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  sourceJson: text("source_json").notNull(),
  mode: text("mode").notNull(),
  modeLabel: text("mode_label").notNull(),
  status: text("status").notNull(),
  statusLabel: text("status_label").notNull(),
  progress: integer("progress").notNull().default(100),
  detail: text("detail").notNull().default(""),
  codexThreadId: text("codex_thread_id"),
  resultJson: text("result_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_analysis_projects_updated_at").on(table.updatedAt),
  index("idx_analysis_projects_source_mode").on(table.sourceId,table.mode),
]);

export const aiVideoJobs = sqliteTable("ai_video_jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().default("legacy"),
  segmentId: text("segment_id").notNull(),
  modelId: text("model_id").notNull(),
  modelName: text("model_name").notNull(),
  providerModel: text("provider_model"),
  duration: integer("duration").notNull(),
  ratio: text("ratio").notNull(),
  referenceMode: text("reference_mode").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull(),
  progress: integer("progress").notNull().default(0),
  error: text("error"),
  videoUrl: text("video_url"),
  groupName: text("group_name").notNull().default("未分组"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_ai_video_jobs_created_at").on(table.createdAt),
  index("idx_ai_video_jobs_project_created").on(table.projectId,table.createdAt),
  index("idx_ai_video_jobs_group_created").on(table.groupName,table.createdAt),
]);

export const aiVideoGroups = sqliteTable("ai_video_groups", {
  name: text("name").primaryKey(),
  createdAt: text("created_at").notNull(),
});

export const referenceImageAssets = sqliteTable("reference_image_assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  projectCode: text("project_code").notNull(),
  productName: text("product_name").notNull(),
  shotId: text("shot_id").notNull(),
  version: integer("version").notNull().default(1),
  prompt: text("prompt").notNull(),
  imageUrl: text("image_url").notNull(),
  status: text("status").notNull().default("confirmed"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_reference_images_project_created").on(table.projectId,table.createdAt),
  uniqueIndex("idx_reference_images_project_shot_version").on(table.projectId,table.shotId,table.version),
]);

export const videoMetricSnapshots = sqliteTable("video_metric_snapshots", {
  id: text("id").primaryKey(), itemId: text("item_id").notNull(), mediaId: text("media_id").notNull(), taskId: text("task_id").notNull(),
  title: text("title").notNull().default(""), mediaName: text("media_name").notNull().default(""), videoUrl: text("video_url").notNull().default(""), coverUrl: text("cover_url").notNull().default(""),
  publishedAt: integer("published_at").notNull().default(0), metricsJson: text("metrics_json").notNull(), trendJson: text("trend_json").notNull(), capturedAt: text("captured_at").notNull(),
}, (table) => [index("idx_video_snapshots_item_captured").on(table.itemId,table.capturedAt),index("idx_video_snapshots_published").on(table.publishedAt)]);

export const publishProjectLinks = sqliteTable("publish_project_links", {
  taskId:text("task_id").primaryKey(),projectId:text("project_id").notNull(),createdAt:text("created_at").notNull(),
},(table)=>[index("idx_publish_project_links_project").on(table.projectId,table.createdAt)]);

export const videoWeeklyReports = sqliteTable("video_weekly_reports", {
  id: text("id").primaryKey(), rangeStart: integer("range_start").notNull(), rangeEnd: integer("range_end").notNull(), reportJson: text("report_json").notNull(), createdAt: text("created_at").notNull(),
}, (table) => [index("idx_video_reports_created").on(table.createdAt)]);

export const contentPlans = sqliteTable("content_plans", {
  id: text("id").primaryKey(),
  planDate: text("plan_date").notNull(),
  targetCount: integer("target_count").notNull(),
  status: text("status").notNull().default("draft"),
  inputJson: text("input_json").notNull(),
  resultJson: text("result_json").notNull(),
  codexThreadId: text("codex_thread_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_content_plans_date_updated").on(table.planDate,table.updatedAt),
  index("idx_content_plans_status_updated").on(table.status,table.updatedAt),
]);

export const contentTasks = sqliteTable("content_tasks", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull(),
  orderIndex: integer("order_index").notNull(),
  productName: text("product_name").notNull(),
  platform: text("platform").notNull(),
  targetAccount: text("target_account").notNull(),
  videoType: text("video_type").notNull(),
  scriptDirection: text("script_direction").notNull(),
  publishTime: text("publish_time").notNull(),
  successMetric: text("success_metric").notNull(),
  nextAgent: text("next_agent").notNull(),
  dependencyJson: text("dependency_json").notNull().default("[]"),
  status: text("status").notNull().default("waiting_confirmation"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_content_tasks_plan_order").on(table.planId,table.orderIndex),
  index("idx_content_tasks_status_updated").on(table.status,table.updatedAt),
]);

export const sourceAssets = sqliteTable("source_assets", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  planId: text("plan_id").notNull(),
  sourceId: text("source_id").notNull(),
  platform: text("platform").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  link: text("link").notNull().default(""),
  embedUrl: text("embed_url").notNull().default(""),
  metricsJson: text("metrics_json").notNull().default("{}"),
  classificationJson: text("classification_json").notNull().default("{}"),
  fitScore: integer("fit_score").notNull().default(0),
  decision: text("decision").notNull().default("observe"),
  status: text("status").notNull().default("classified"),
  agentJobId: text("agent_job_id").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_source_assets_task_source").on(table.taskId,table.sourceId),
  index("idx_source_assets_task_score").on(table.taskId,table.fitScore),
  index("idx_source_assets_status_updated").on(table.status,table.updatedAt),
]);

export const collectionStrategies = sqliteTable("collection_strategies", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  name: text("name").notNull(),
  keywords: text("keywords").notNull(),
  market: text("market").notNull(),
  platformsJson: text("platforms_json").notNull().default("[]"),
  signalsJson: text("signals_json").notNull().default("[]"),
  dataWindow: text("data_window").notNull().default("30d"),
  minViews: integer("min_views").notNull().default(0),
  minLikes: integer("min_likes").notNull().default(0),
  maxResults: integer("max_results").notNull().default(12),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_collection_strategies_task_updated").on(table.taskId,table.updatedAt),
  index("idx_collection_strategies_status_updated").on(table.status,table.updatedAt),
]);
