import assert from "node:assert/strict";
import test from "node:test";
import { exportPostMarkdown, importPostMarkdown } from "../lib/blog/markdown.ts";

const source = `---
title: UniTacVLA
slug: unitacvla
type: papers
date: 2026-07-24
summary: 触觉与视觉统一建模
tags: [VLA, 触觉]
related: []
status: draft
read_at: 2026-07-24
authors: [Research Team]
venue: arXiv
year: 2026
paper_url: https://arxiv.org/abs/1
reading_methods: [skim]
reading_status: in_progress
topics: [具身智能]
---

## 粗读记录

公式 $a_t = f(o_t)$。

## 创新点

- 统一表征
`;

test("imports known headings and custom headings as ordered sections", () => {
  const result = importPostMarkdown(source, { id: "post-1", now: "2026-07-24T12:00:00.000Z" });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.draft.sections.map((section) => [section.title, section.standardKey]), [["粗读记录", "skim"], ["创新点", null]]);
});

test("exports canonical snake_case frontmatter and preserves latex", () => {
  const imported = importPostMarkdown(source, { id: "post-1", now: "2026-07-24T12:00:00.000Z" });
  const exported = exportPostMarkdown(imported.draft);
  assert.match(exported, /reading_methods: \[skim\]/);
  assert.match(exported, /## 创新点/);
  assert.match(exported, /\$a_t = f\(o_t\)\$/);
});

test("Markdown import and export preserve the structured reading summary identity", () => {
  const withSummary = source
    .replace("reading_methods: [skim]", "reading_methods: [skim, synthesis]")
    .replace("## 创新点\n\n- 统一表征", "## 阅读总结\n\n可复用结论。\n\n## 创新点\n\n- 统一表征");
  const imported = importPostMarkdown(withSummary, { id: "post-summary", now: "2026-07-24T12:00:00.000Z" });
  const summary = imported.draft.sections.find((section) => section.title === "阅读总结");
  assert.equal(summary?.standardKey, "reading-summary");

  const roundTripped = importPostMarkdown(exportPostMarkdown(imported.draft), { id: "post-summary-2", now: "2026-07-24T12:00:00.000Z" });
  assert.equal(roundTripped.draft.sections.find((section) => section.title === "阅读总结")?.standardKey, "reading-summary");
  assert.doesNotMatch(roundTripped.errors.join("\n"), /缺少阅读总结组件/);
});

test("malformed imports report fields and never claim publication", () => {
  const result = importPostMarkdown("---\ntitle: Broken\n---\nBody", { id: "post-2", now: "2026-07-24T12:00:00.000Z" });
  assert.ok(result.errors.length > 0);
  assert.equal(result.draft.status, "draft");
});

test("keeps headings inside a shorter nested fence in their original section", () => {
  const fencedSource = `${source.replace("## 创新点\n\n- 统一表征", "````markdown\n```\n## not-a-heading\n```\n````\n\n## 创新点\n\n- 统一表征")}`;
  const result = importPostMarkdown(fencedSource, { id: "post-fence", now: "2026-07-24T12:00:00.000Z" });

  assert.deepEqual(result.draft.sections.map((section) => section.title), ["粗读记录", "创新点"]);
  assert.match(result.draft.sections[0].content, /## not-a-heading/);
});

test("quotes numeric and boolean-looking strings while retaining numeric metadata", () => {
  const imported = importPostMarkdown(source, { id: "post-scalar", now: "2026-07-24T12:00:00.000Z" });
  imported.draft.title = "123";
  imported.draft.summary = "-1.5";
  imported.draft.tags = ["true", "false"];
  imported.draft.metadata.authors = ["123", "true", "false", "-1.5"];

  const exported = exportPostMarkdown(imported.draft);
  const roundTripped = importPostMarkdown(exported, { id: "post-scalar", now: "2026-07-24T12:00:00.000Z" });

  assert.match(exported, /title: "123"/);
  assert.match(exported, /summary: "-1\.5"/);
  assert.match(exported, /tags: \["true", "false"\]/);
  assert.match(exported, /authors: \["123", "true", "false", "-1\.5"\]/);
  assert.match(exported, /year: 2026/);
  assert.equal(roundTripped.draft.title, "123");
  assert.equal(roundTripped.draft.summary, "-1.5");
  assert.deepEqual(roundTripped.draft.tags, ["true", "false"]);
  assert.deepEqual(roundTripped.draft.metadata.authors, ["123", "true", "false", "-1.5"]);
});

test("imports jobs and reflections with their standard headings", () => {
  const job = importPostMarkdown(`---
title: Job
slug: robot-job
type: jobs
date: 2026-07-24
summary: 面试记录
tags: [秋招]
related: []
status: published
company: Example Robotics
role: Robot Engineer
location: 北京
application_stage: interview
applied_at: 2026-07-20
next_action: 准备复盘
---

## 面试

系统设计。`, { id: "post-job", now: "2026-07-24T12:00:00.000Z" });
  const reflection = importPostMarkdown(`---
title: Daily
slug: 2026-07-24
type: reflections
date: 2026-07-24
summary: 今日总结
tags: [日记]
related: []
status: published
---

## 反思

保持节奏。`, { id: "post-reflection", now: "2026-07-24T12:00:00.000Z" });

  assert.deepEqual(job.errors, []);
  assert.deepEqual(job.draft.sections.map((section) => [section.title, section.standardKey]), [["面试", "interview"]]);
  assert.equal(job.draft.status, "draft");
  assert.deepEqual(reflection.errors, []);
  assert.deepEqual(reflection.draft.sections.map((section) => [section.title, section.standardKey]), [["反思", "reflection"]]);
  assert.equal(reflection.draft.status, "draft");
});

test("exports checklist and relation sections as visible Markdown", () => {
  const imported = importPostMarkdown(source, { id: "post-sections", now: "2026-07-24T12:00:00.000Z" });
  imported.draft.sections = [
    { id: "post-sections-1", title: "待办", kind: "checklist", content: "", items: ["验证导入", "同步笔记"], relationSlugs: [], position: 10, templateId: null, standardKey: null },
    { id: "post-sections-2", title: "关联", kind: "relation", content: "", items: [], relationSlugs: ["unitacvla-reading", "daily-note"], position: 20, templateId: null, standardKey: null },
  ];

  const exported = exportPostMarkdown(imported.draft);

  assert.match(exported, /## 待办\n\n- \[ \] 验证导入\n- \[ \] 同步笔记/);
  assert.match(exported, /## 关联\n\n- \[\[unitacvla-reading\]\]\n- \[\[daily-note\]\]/);
});
