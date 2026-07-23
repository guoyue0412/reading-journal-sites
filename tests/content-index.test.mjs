import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import {
  getEntriesByType,
  getRecentEntries,
  getRelatedEntries,
  searchEntries,
} from "../lib/content/query.ts";

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

test("queries entries by recency, type, and searchable metadata", () => {
  assert.equal(getRecentEntries(1)[0].slug, "2026-07-22");
  assert.deepEqual(
    getEntriesByType("papers").map((entry) => entry.slug),
    ["unitacvla-reading"],
  );
  assert.ok(
    searchEntries("触觉").some(
      (entry) => entry.slug === "unitacvla-reading",
    ),
  );
  assert.ok(
    searchEntries("TACTILE-SENSING").some(
      (entry) => entry.slug === "unitacvla-reading",
    ),
  );
  assert.ok(
    searchEntries("ARXIV").some(
      (entry) => entry.slug === "unitacvla-reading",
    ),
  );
});

test("prioritizes explicit relationships and returns isolated copies", () => {
  const related = getRelatedEntries("2026-07-22");

  assert.ok(
    related.some((entry) => entry.slug === "unitacvla-reading"),
  );
  assert.deepEqual(
    related.slice(0, 2).map((entry) => entry.slug),
    ["unitacvla-reading", "autumn-recruiting-journey"],
  );

  const recent = getRecentEntries(4);
  recent.reverse();
  recent[0].tags.push("mutated-outside-query");

  assert.equal(getRecentEntries(1)[0].slug, "2026-07-22");
  assert.ok(
    getRecentEntries(4).every(
      (entry) => !entry.tags.includes("mutated-outside-query"),
    ),
  );
});
