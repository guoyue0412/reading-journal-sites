import assert from "node:assert/strict";
import test from "node:test";
import {
  derivePostRelations,
  extractLocalAssetIds,
  extractWikiRelations,
  normalizeMarkdownSection,
} from "../lib/blog/markdown-sections.ts";
import { READING_SUMMARY } from "../lib/blog/section-constants.ts";

const base = {
  id: "section-1",
  title: "模块",
  kind: "long_text",
  content: "",
  items: [],
  relationSlugs: [],
  position: 10,
  templateId: null,
  standardKey: null,
};

test("normalizes legacy text, checklist, and relation sections into markdown", () => {
  const checklist = normalizeMarkdownSection({ ...base, kind: "checklist", content: "开场", items: ["读论文", "写总结"] });
  assert.equal(checklist.kind, "markdown");
  assert.equal(checklist.content, "开场\n\n- [ ] 读论文\n- [ ] 写总结");
  assert.deepEqual(checklist.items, []);

  const relation = normalizeMarkdownSection({ ...base, kind: "relation", content: "延伸", relationSlugs: ["paper-a"] });
  assert.equal(relation.content, "延伸\n\n[[paper-a]]");
  assert.deepEqual(relation.relationSlugs, ["paper-a"]);
});

test("preserves reading-summary identity while converting its kind", () => {
  const result = normalizeMarkdownSection({ ...base, title: "阅读总结", kind: "long_text", standardKey: "readingSummary" });
  assert.equal(result.kind, "markdown");
  assert.equal(result.standardKey, READING_SUMMARY);
});

test("extracts unique wiki relations outside fenced code", () => {
  assert.deepEqual(extractWikiRelations("[[paper-a]] 和 [[paper-b|另一篇]]\n\n\`\`\`md\n[[ignored]]\n\`\`\`"), [
    { slug: "paper-a", label: null },
    { slug: "paper-b", label: "另一篇" },
  ]);
});

test("derives post relations and local media ids from markdown", () => {
  const post = {
    sections: [
      { ...base, kind: "markdown", content: "[[paper-a]] ![图](/media/11111111-1111-4111-8111-111111111111/figure.png)" },
      { ...base, id: "section-2", kind: "markdown", content: "[[paper-a]] [[paper-b]]" },
    ],
  };
  assert.deepEqual(derivePostRelations(post), ["paper-a", "paper-b"]);
  assert.deepEqual(extractLocalAssetIds(post.sections.map((section) => section.content).join("\n")), ["11111111-1111-4111-8111-111111111111"]);
});
