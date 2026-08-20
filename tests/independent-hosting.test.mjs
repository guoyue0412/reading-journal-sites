import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("uses an independent Wrangler configuration with the existing D1 and R2 bindings", async () => {
  const path = new URL("wrangler.jsonc", root);
  assert.equal(existsSync(path), true, "root wrangler.jsonc must exist");
  const source = await readFile(path, "utf8");
  assert.match(source, /"binding"\s*:\s*"DB"/);
  assert.match(source, /"binding"\s*:\s*"BLOG_ASSETS"/);
  assert.match(source, /"migrations_dir"\s*:\s*"drizzle"/);
  assert.match(source, /"staging"/);
  assert.match(source, /"production"/);
  assert.doesNotMatch(source, /00000000-0000-4000-8000-000000000000|site-creator-/);
});

test("retires every ChatGPT Sites build and login hook", async () => {
  assert.equal(existsSync(new URL(".openai/hosting.json", root)), false);
  assert.equal(existsSync(new URL("build/sites-vite-plugin.ts", root)), false);
  assert.equal(existsSync(new URL("app/chatgpt-auth.ts", root)), false);
  const files = ["vite.config.ts", "worker/index.ts", "README.md", "db/index.ts"];
  const combined = (await Promise.all(files.map((file) => readFile(new URL(file, root), "utf8")))).join("\n");
  assert.doesNotMatch(combined, /signin-with-chatgpt|oai-authenticated|ChatGPT Sites|site-creator-|sites-vite-plugin|handleImageOptimization|env\.IMAGES/);
  assert.match(combined, /wrangler\.jsonc/);
});

test("provides explicit independent migration and deployment commands", async () => {
  const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.match(pkg.scripts["db:migrate:local"], /wrangler d1 migrations apply DB --local/);
  assert.match(pkg.scripts["db:migrate:staging"], /wrangler d1 migrations apply DB --remote --env staging/);
  assert.match(pkg.scripts.deploy, /wrangler deploy --env production/);
});
