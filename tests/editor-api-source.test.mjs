import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createEmptyDraft } from "../lib/blog/default-templates.ts";
import { createBlogService } from "../lib/blog/service.ts";
import { MemoryBlogStore } from "../lib/blog/store.ts";
import {
  readJsonRecord,
  requireDraftRecord,
  requireExpectedVersion,
  requireSectionTemplateRecord,
  requireBlogSectionRecord,
  requirePostType,
  requireScopedTemplatePostType,
  requireStringField,
  readOptionalBooleanField,
  withOwnerJson,
} from "../lib/blog/http.ts";
import { VersionConflictError } from "../lib/blog/store.ts";

const routes = [
  "../app/api/editor/posts/route.ts",
  "../app/api/editor/posts/[id]/route.ts",
  "../app/api/editor/posts/[id]/copy/route.ts",
  "../app/api/editor/posts/[id]/publish/route.ts",
  "../app/api/editor/posts/[id]/export/route.ts",
  "../app/api/editor/import/route.ts",
  "../app/api/editor/templates/route.ts",
  "../app/api/editor/templates/[id]/route.ts",
];

test("every editor API performs server-side owner authorization", async () => {
  for (const route of routes) {
    const source = await readFile(new URL(route, import.meta.url), "utf8");
    assert.match(source, /assertBlogOwner\(\)/, route);
  }
});

test("publish is a separate explicit endpoint", async () => {
  const save = await readFile(new URL("../app/api/editor/posts/[id]/route.ts", import.meta.url), "utf8");
  const publish = await readFile(new URL("../app/api/editor/posts/[id]/publish/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(save, /publishPost/);
  assert.match(publish, /publishPost/);
});

test("editor routes defer the D1 binding until an API request runs", async () => {
  const http = await readFile(new URL("../lib/blog/http.ts", import.meta.url), "utf8");
  assert.match(http, /await import\("\.\/d1-store\.ts"\)/);

  for (const route of routes) {
    const source = await readFile(new URL(route, import.meta.url), "utf8");
    assert.doesNotMatch(source, /from "@\/lib\/blog\/d1-store\.ts"/, route);
  }
});

const authorized = async () => {};

async function validationResponse(operation) {
  const response = await withOwnerJson(operation, authorized);
  assert.equal(response.status, 400);
  assert.deepEqual((await response.json()).error, "内容校验失败");
}

test("JSON request guards map malformed, null, array, and missing object fields to 400", async () => {
  for (const body of ["{", "null", "[]", "{}"]) {
    await validationResponse(async () => {
      const payload = await readJsonRecord(new Request("https://editor.test", { method: "POST", body }));
      requireStringField(payload, "type", "文章类型不能为空");
      return { ok: true };
    });
  }

  await validationResponse(async () => {
    await readJsonRecord(new Request("https://editor.test", { method: "POST" }));
    return { ok: true };
  });

  await validationResponse(async () => {
    requirePostType(null);
    return { ok: true };
  });
});

test("expectedVersion accepts only non-negative integers and validation responses expose fields", async () => {
  for (const value of [undefined, -1, 1.5, "1"]) {
    await validationResponse(async () => {
      requireExpectedVersion({ expectedVersion: value });
      return { ok: true };
    });
  }
});

test("optional import commit flags accept only booleans", async () => {
  assert.equal(readOptionalBooleanField({}, "create", "导入创建标记必须是布尔值"), false);
  assert.equal(readOptionalBooleanField({ create: true }, "create", "导入创建标记必须是布尔值"), true);
  for (const create of [null, 1, "true", []]) {
    await validationResponse(async () => {
      readOptionalBooleanField({ create }, "create", "导入创建标记必须是布尔值");
      return { ok: true };
    });
  }
});

test("import route separates preview from atomic creation", async () => {
  const source = await readFile(new URL("../app/api/editor/import/route.ts", import.meta.url), "utf8");
  assert.match(source, /readOptionalBooleanField\(payload,\s*"create"/);
  assert.match(source, /create\s*\?\s*service\.createImportedPost\(markdown\)\s*:\s*service\.previewImport\(markdown\)/);
});

test("copy route validates a version and delegates one complete server-side creation", async () => {
  const source = await readFile(new URL("../app/api/editor/posts/[id]/copy/route.ts", import.meta.url), "utf8");
  assert.match(source, /assertBlogOwner\(\)/);
  assert.match(source, /requireExpectedVersion\(payload\)/);
  assert.match(source, /service\.createPostCopy\(id,\s*expectedVersion\)/);
  assert.doesNotMatch(source, /createPost\(|saveDraft\(/);

  const conflict = await withOwnerJson(async () => { throw new VersionConflictError(); }, authorized);
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { error: "草稿已在其他设备更新", code: "VERSION_CONFLICT" });
});

test("draft guards reject partial records before they can reach persistence", async () => {
  await validationResponse(async () => {
    requireDraftRecord({ id: "post-1" });
    return { ok: true };
  });
});

test("draft guards reject malformed nested payloads with 400 before persistence", async () => {
  const paper = createEmptyDraft("papers", "paper-guard", "2026-07-24", []);
  const job = createEmptyDraft("jobs", "job-guard", "2026-07-24", []);
  const malformed = [
    ["tag elements", { ...paper, tags: [{ label: "unsafe" }] }],
    ["related elements", { ...paper, related: [7] }],
    ["paper authors", { ...paper, metadata: { ...paper.metadata, authors: "Guo Yue" } }],
    ["paper year", { ...paper, metadata: { ...paper.metadata, year: "2026" } }],
    ["paper reading methods", { ...paper, metadata: { ...paper.metadata, readingMethods: ["deep", 1] } }],
    ["paper reading status", { ...paper, metadata: { ...paper.metadata, readingStatus: "finished" } }],
    ["job stage", { ...job, metadata: { ...job.metadata, applicationStage: "waiting" } }],
    ["section items", { ...paper, sections: paper.sections.map((section, index) => index === 0 ? { ...section, items: [{}] } : section) }],
    ["section relations", { ...paper, sections: paper.sections.map((section, index) => index === 0 ? { ...section, relationSlugs: [3] } : section) }],
    ["status", { ...paper, status: 1 }],
    ["draft version", { ...paper, draftVersion: "0" }],
    ["published revision", { ...paper, publishedRevisionId: 9 }],
    ["timestamps", { ...paper, updatedAt: null }],
  ];

  for (const [label, draft] of malformed) {
    let persistenceCalls = 0;
    const response = await withOwnerJson(async () => {
      const guarded = requireDraftRecord(draft);
      persistenceCalls += 1;
      return { post: guarded };
    }, authorized);
    assert.equal(response.status, 400, label);
    assert.equal(persistenceCalls, 0, label);
    const body = await response.json();
    assert.equal(body.error, "内容校验失败", label);
    assert.ok(body.fields.length > 0, label);
  }

  assert.doesNotThrow(() => requireDraftRecord(paper));
  assert.doesNotThrow(() => requireDraftRecord(job));
});

test("HTTP save rejects a valid forged paper payload for an authoritative reflection", async () => {
  let id = 0;
  const store = new MemoryBlogStore();
  const service = createBlogService(
    store,
    () => "2026-07-24T12:00:00.000Z",
    () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
  );
  const reflection = await service.createPost({ type: "reflections", date: "2026-07-24" });
  const forgedPaper = {
    ...reflection,
    type: "papers",
    metadata: {
      authors: ["Guo Yue"],
      venue: "arXiv",
      year: 2026,
      paperUrl: "https://arxiv.org/abs/2607.00001",
      readAt: "2026-07-24",
      readingMethods: ["deep"],
      readingStatus: "in_progress",
      topics: ["robotics"],
    },
  };

  const response = await withOwnerJson(async () => {
    const draft = requireDraftRecord(forgedPaper);
    return { post: await service.saveDraft(draft, reflection.draftVersion) };
  }, authorized);

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, "内容校验失败");
  assert.ok(body.fields.some((message) => message.includes("文章类型")));
  const unchanged = await store.getDraft(reflection.id);
  assert.equal(unchanged?.type, "reflections");
  assert.deepEqual(unchanged?.metadata, {});
  assert.equal(unchanged?.draftVersion, reflection.draftVersion);
});

test("template updates reject a postType that differs from the queried scope", async () => {
  await validationResponse(async () => {
    requireScopedTemplatePostType("papers", "jobs");
    return { ok: true };
  });
});

test("template and reusable-section guards reject incomplete and malformed payloads", async () => {
  const invalidTemplates = [
    {},
    { id: "template-1", postType: "papers", title: "模板", kind: "markdown", position: 0, standardKey: null, enabled: "true" },
    { id: "template-1", postType: "papers", title: "模板", kind: "markdown", position: 1.5, standardKey: null, enabled: true },
  ];
  for (const payload of invalidTemplates) {
    await validationResponse(async () => {
      requireSectionTemplateRecord(payload);
      return { ok: true };
    });
  }

  for (const section of [
    {},
    { id: "section-1", title: "模块", kind: "markdown", content: "", items: "not-an-array", relationSlugs: [], position: 0, templateId: null, standardKey: null },
    { id: "section-1", title: "模块", kind: "markdown", content: "", items: [1], relationSlugs: [], position: 0, templateId: null, standardKey: null },
  ]) {
    await validationResponse(async () => {
      requireBlogSectionRecord(section);
      return { ok: true };
    });
  }
});

test("template route guards execute before lazy D1 service construction", async () => {
  const [collection, item] = await Promise.all([
    readFile(new URL("../app/api/editor/templates/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/editor/templates/[id]/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(collection, /requireBlogSectionRecord\(payload\.section\)[\s\S]*?const service = await getService\(\);/);
  assert.match(collection, /requireSectionTemplateRecord\(payload\)[\s\S]*?const service = await getService\(\);/);
  assert.match(item, /requireSectionTemplateRecord\(payload\)[\s\S]*?const service = await getService\(\);/);
});
