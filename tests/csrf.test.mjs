import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const moduleUrl = new URL("../lib/blog/csrf.ts", import.meta.url);
const csrf = existsSync(moduleUrl) ? await import(moduleUrl) : {};
const assertGuardExists = () => assert.equal(typeof csrf.assertSameOrigin, "function");

test("accepts a matching Origin", () => {
  assertGuardExists();
  assert.doesNotThrow(() => csrf.assertSameOrigin(new Request("https://edit.example/api/editor/posts", { method: "POST", headers: { origin: "https://edit.example" } })));
});

test("rejects a cross-site Origin", () => {
  assertGuardExists();
  assert.throws(
    () => csrf.assertSameOrigin(new Request("https://edit.example/api/editor/posts", { method: "POST", headers: { origin: "https://evil.example" } })),
    (error) => error?.status === 403,
  );
});

test("accepts browser same-origin and none fetch metadata when Origin is absent", () => {
  assertGuardExists();
  for (const site of ["same-origin", "none"]) {
    assert.doesNotThrow(() => csrf.assertSameOrigin(new Request("https://edit.example/api/editor/posts", { method: "POST", headers: { "sec-fetch-site": site } })));
  }
});

test("fails closed when Origin and trustworthy fetch metadata are absent", () => {
  assertGuardExists();
  for (const headers of [{}, { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }]) {
    assert.throws(
      () => csrf.assertSameOrigin(new Request("https://edit.example/api/editor/posts", { method: "POST", headers })),
      (error) => error?.status === 403,
    );
  }
});
