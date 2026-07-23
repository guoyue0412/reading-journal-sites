import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);

async function loadGeneratedEntries() {
  await execFileAsync(process.execPath, ["scripts/generate-content-index.mjs"]);
  const generatedUrl = pathToFileURL(
    new URL("../lib/content/generated.ts", import.meta.url).pathname,
  );
  generatedUrl.searchParams.set("cache", Date.now().toString());
  return (await import(generatedUrl.href)).CONTENT_ENTRIES;
}

test("generates four isolated modules with cross references", async () => {
  const entries = await loadGeneratedEntries();

  assert.equal(entries.length, 4);
  assert.ok(entries.every((entry) => entry.status === "published"));
  assert.deepEqual(
    new Set(entries.map((entry) => entry.type)),
    new Set(["jobs", "internship", "papers", "reflections"]),
  );
  assert.equal(
    entries.find((entry) => entry.type === "reflections").slug,
    "2026-07-22",
  );
  assert.ok(
    entries.some((entry) => entry.related.includes("unitacvla-reading")),
  );
});
