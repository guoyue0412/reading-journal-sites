import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  readJsonRecord,
  requireDraftRecord,
  requireExpectedVersion,
  requireSectionTemplateRecord,
  requireBlogSectionRecord,
  requirePostType,
  requireScopedTemplatePostType,
  requireStringField,
  withOwnerJson,
} from "../lib/blog/http.ts";

const routes = [
  "../app/api/editor/posts/route.ts",
  "../app/api/editor/posts/[id]/route.ts",
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

test("draft guards reject partial records before they can reach persistence", async () => {
  await validationResponse(async () => {
    requireDraftRecord({ id: "post-1" });
    return { ok: true };
  });
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
