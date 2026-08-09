import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyDraft, defaultTemplatesFor } from "../lib/blog/default-templates.ts";
import { validateDraft, validateForPublish } from "../lib/blog/validation.ts";

test("paper drafts load standard modules and allow reusable custom modules", () => {
  const draft = createEmptyDraft("papers", "post-1", "2026-07-24", [
    { id: "tpl-innovation", postType: "papers", title: "创新点", kind: "long_text", position: 40, standardKey: null, enabled: true },
  ]);
  assert.deepEqual(draft.sections.map((section) => section.title), ["研究问题", "粗读记录", "细读记录", "阅读总结", "创新点"]);
  assert.equal(draft.status, "draft");
  assert.equal(draft.draftVersion, 0);
  assert.equal(draft.sections.find((section) => section.title === "阅读总结")?.standardKey, "reading-summary");
});

test("active paper methods must match standard sections", () => {
  const draft = createEmptyDraft("papers", "post-1", "2026-07-24", []);
  draft.title = "Paper";
  draft.summary = "Summary";
  draft.metadata = { authors: [], venue: "arXiv", year: 2026, paperUrl: "https://arxiv.org/abs/1", readAt: "2026-07-24", readingMethods: ["deep"], readingStatus: "in_progress", topics: [] };
  draft.sections = draft.sections.filter((section) => section.standardKey !== "deep");
  assert.match(validateForPublish(draft).join("\n"), /细读记录/);
});

test("reflection slug must be its date or a versioned same-day import", () => {
  const draft = createEmptyDraft("reflections", "post-2", "2026-07-24", []);
  for (const slug of ["2026-07-24", "2026-07-24-2", "2026-07-24-11"]) {
    draft.slug = slug;
    assert.doesNotMatch(validateDraft(draft).join("\n"), /每日感悟的 slug/, slug);
  }
  for (const slug of ["wrong", "2026-07-24-1", "2026-07-24-02", "2026-07-24-2-2"]) {
    draft.slug = slug;
    assert.match(validateDraft(draft).join("\n"), /slug/, slug);
  }
});

test("default templates cover all four post types", () => {
  assert.deepEqual(Object.keys(defaultTemplatesFor), ["jobs", "internship", "papers", "reflections"]);
});

test("validators report malformed type metadata without throwing", () => {
  const draft = createEmptyDraft("papers", "post-3", "2026-07-24", []);
  draft.metadata = {};
  assert.match(validateForPublish(draft).join("\n"), /阅读状态无效/);
});

test("date validation accepts leap days and rejects nonexistent calendar dates", () => {
  const leapDay = createEmptyDraft("internship", "post-4", "2024-02-29", []);
  const invalidLeapDay = createEmptyDraft("internship", "post-5", "2026-02-29", []);
  const invalidMonthDay = createEmptyDraft("internship", "post-6", "2026-04-31", []);

  assert.doesNotMatch(validateDraft(leapDay).join("\n"), /日期必须是有效/);
  assert.match(validateDraft(invalidLeapDay).join("\n"), /日期必须是有效/);
  assert.match(validateDraft(invalidMonthDay).join("\n"), /日期必须是有效/);
});

test("validators report null metadata without throwing", () => {
  const draft = createEmptyDraft("papers", "post-7", "2026-07-24", []);
  draft.metadata = null;
  assert.match(validateForPublish(draft).join("\n"), /阅读状态无效/);
});

test("legacy paper sections titled 阅读总结 are recognized as the structured component", () => {
  const draft = createEmptyDraft("papers", "post-legacy", "2026-07-24", []);
  draft.title = "Legacy paper";
  draft.summary = "Summary";
  draft.metadata = { authors: [], venue: "arXiv", year: 2026, paperUrl: "https://arxiv.org/abs/1", readAt: "2026-07-24", readingMethods: ["synthesis"], readingStatus: "completed", topics: [] };
  draft.sections = draft.sections.map((section) => section.title === "阅读总结" ? { ...section, standardKey: null, content: "已有的总结正文" } : section);

  assert.doesNotMatch(validateForPublish(draft).join("\n"), /缺少阅读总结组件/);
});
