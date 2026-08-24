import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the TK seller workbench", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /TK 工作台/);
  assert.match(html, /老板驾驶舱/);
  assert.match(html, /短视频工厂/);
  assert.match(html, /真实内容项目已接入/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("ships final metadata and social preview", async () => {
  const [layout, page] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /TK 卖家工作台/);
  assert.match(layout, /openGraph/);
  assert.match(page, /TikTok Shop API/);
  assert.match(page, /紫鸟 WebDriver \+ Selenium/);
  assert.match(page, /画面提示词/);
  assert.match(page, /视频提示词/);
  assert.match(page, /必须实拍/);
  assert.match(page, /爆款池/);
  assert.match(page, /飞书 · 内容选题库/);
  assert.match(page, /桌面端每行展示 6 条统一尺寸的视频/);
  assert.match(page, /同步飞书/);
  assert.match(page, /数据源实际字段为准/);
  assert.match(page, /表格没有提供的字段显示“待授权”/);
  assert.match(page, /添加自己的视频/);
  assert.match(page, /文案与表达分析/);
  assert.match(page, /AI 带货爆款拆解/);
  assert.match(page, /content-video-replication-strategist/);
  assert.match(page, /拆解资产库/);
  assert.match(page, /历史分析与 V1 拆解结果/);
  assert.match(page, /V1 只还原原片，不提前生成二创脚本/);
  assert.match(page, /爆点抓流量/);
  assert.match(page, /转化镜头促出单/);
  assert.match(page, /脚本与分镜/);
  assert.match(page, /视频生产与发布/);
  assert.match(page, /storage-box-viral-test-001/);
  assert.match(page, /参考图与提示词已确认/);
  assert.match(page, /系统不会填充演示数据/);
  assert.match(page, /视频数据监控与内容归因/);
  assert.match(page, /真实留存曲线与画面时间定位/);
  assert.match(page, /返回上一页/);
  assert.match(page, /pushState/);
  assert.match(page, /popstate/);
  assert.match(page, /stage-step-navigation/);
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/video-projects/storage-box-viral-test-001/A-S07.png", import.meta.url));
  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
});
