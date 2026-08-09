import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import {
  getEntriesByType,
  getRecentEntries,
  getRelatedEntries,
  searchEntries,
} from "../lib/content/query.ts";

const execFileAsync = promisify(execFile);
function markdown(fields, body) {
  const resolvedBody = body ?? (fields.type === "papers"
    ? "## 细读记录\n\nDetailed reading notes."
    : "Body");
  return `---\n${Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}\n---\n\n${resolvedBody}\n`;
}

const validCommon = {
  title: "Fixture",
  slug: "fixture",
  type: "jobs",
  date: "2026-07-20",
  summary: "Fixture summary",
  tags: "[test]",
  related: "[]",
  status: "published",
  company: "Example Robotics",
  role: "具身智能算法工程师",
  application_stage: "interview",
};

const validPaper = {
  ...validCommon,
  title: "Paper fixture",
  slug: "paper-fixture",
  type: "papers",
  read_at: "2026-05-10",
  authors: "[Research Team]",
  venue: "arXiv",
  year: "2026",
  paper_url: "https://arxiv.org/",
  reading_methods: "[deep]",
  reading_status: "in_progress",
  topics: "[robotics]",
};

async function runIsolatedGenerator(files) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "guoyue-content-"));
  const contentRoot = path.join(temporaryRoot, "content");
  const outputPath = path.join(temporaryRoot, "generated.ts");
  const legacyOutputPath = path.join(temporaryRoot, "legacy-generated.ts");

  for (const moduleName of ["jobs", "internship", "papers", "reflections"]) {
    await mkdir(path.join(contentRoot, moduleName), { recursive: true });
  }
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(contentRoot, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source, "utf8");
  }

  try {
    const result = await execFileAsync(
      process.execPath,
      [
        "scripts/generate-content-index.mjs",
        "--content-root",
        contentRoot,
        "--output",
        outputPath,
        "--legacy-output",
        legacyOutputPath,
      ],
      { cwd: new URL("../", import.meta.url) },
    );
    const generated = await readFile(outputPath, "utf8");
    const serialized = generated.match(/CONTENT_ENTRIES: ContentEntry\[\] = ([\s\S]*);\n$/)?.[1];
    assert.ok(serialized, "generated entries must be serializable in isolated tests");
    return { entries: JSON.parse(serialized), stderr: result.stderr };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function generatorFailure(files) {
  try {
    await runIsolatedGenerator(files);
  } catch (error) {
    return `${error.stderr ?? ""}${error.message ?? ""}`;
  }
  throw new Error("Expected generator to fail");
}

async function loadGeneratedEntries() {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "guoyue-live-content-"));
  const outputPath = path.join(temporaryRoot, "generated.ts");
  const legacyOutputPath = path.join(temporaryRoot, "legacy-generated.ts");

  try {
    await execFileAsync(
      process.execPath,
      [
        "scripts/generate-content-index.mjs",
        "--output",
        outputPath,
        "--legacy-output",
        legacyOutputPath,
      ],
      { cwd: new URL("../", import.meta.url) },
    );
    const generated = await readFile(outputPath, "utf8");
    const serialized = generated.match(/CONTENT_ENTRIES: ContentEntry\[\] = ([\s\S]*);\n$/)?.[1];
    assert.ok(serialized, "generated entries must be serializable without rewriting tracked files");
    return JSON.parse(serialized);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

test("loads real content without rewriting tracked generated modules", async () => {
  const generatedPaths = [
    new URL("../lib/content/generated.ts", import.meta.url),
    new URL("../lib/content/legacy-generated.ts", import.meta.url),
  ];
  const before = await Promise.all(generatedPaths.map((file) => readFile(file, "utf8")));

  await loadGeneratedEntries();

  const after = await Promise.all(generatedPaths.map((file) => readFile(file, "utf8")));
  assert.deepEqual(after, before);
});

test("generates four isolated modules with cross references and newest-first reflections", async () => {
  const entries = await loadGeneratedEntries();

  assert.equal(entries.length, 5);
  assert.ok(entries.every((entry) => entry.status === "published"));
  assert.deepEqual(
    new Set(entries.map((entry) => entry.type)),
    new Set(["jobs", "internship", "papers", "reflections"]),
  );
  assert.deepEqual(
    entries.filter((entry) => entry.type === "reflections").map((entry) => entry.slug),
    ["2026-07-22", "2026-07-21"],
  );
  assert.ok(
    entries.some((entry) => entry.related.includes("unitacvla-reading")),
  );
});

test("accepts shuffled same-day reflections and orders later version suffixes first", async () => {
  const fields = {
    ...validCommon,
    type: "reflections",
    date: "2026-07-20",
  };
  const { entries } = await runIsolatedGenerator({
    "reflections/2026-07-20-2.md": markdown({ ...fields, slug: "2026-07-20-2" }),
    "reflections/2026-07-20.md": markdown({ ...fields, slug: "2026-07-20" }),
    "reflections/2026-07-20-3.md": markdown({ ...fields, slug: "2026-07-20-3" }),
  });

  assert.deepEqual(entries.map((entry) => entry.slug), ["2026-07-20-3", "2026-07-20-2", "2026-07-20"]);
});

test("rejects malformed same-day reflection suffixes", async () => {
  for (const slug of ["2026-07-20-1", "2026-07-20-02", "2026-07-20-2-2"]) {
    const failure = await generatorFailure({
      "reflections/invalid.md": markdown({
        ...validCommon,
        slug,
        type: "reflections",
        date: "2026-07-20",
      }),
    });
    assert.match(failure, /invalid\.md.*slug/i, slug);
  }
});

test("web validation and static generation import the same reflection slug rule", async () => {
  const [validation, generator] = await Promise.all([
    readFile(new URL("../lib/blog/validation.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/generate-content-index.mjs", import.meta.url), "utf8"),
  ]);

  assert.match(validation, /from ["']\.\.\/content\/reflection-slug\.mjs["']/);
  assert.match(generator, /from ["']\.\.\/lib\/content\/reflection-slug\.mjs["']/);
  assert.match(validation, /isReflectionSlugForDate/);
  assert.match(generator, /isReflectionSlugForDate/);
});

test("normalizes documented snake_case paper frontmatter for runtime consumers", async () => {
  const { entries } = await runIsolatedGenerator({
    "papers/paper.md": markdown(validPaper),
  });
  const paper = entries[0];

  assert.equal(paper.readAt, "2026-05-10");
  assert.equal(paper.paperUrl, "https://arxiv.org/");
  assert.deepEqual(paper.readingMethods, ["deep"]);
  assert.equal(paper.readingStatus, "in_progress");
  assert.equal("read_at" in paper, false);
  assert.equal("paper_url" in paper, false);
  assert.equal("reading_status" in paper, false);
  assert.equal("reading_methods" in paper, false);
});

test("maps an explicit static update date without fabricating one when absent", async () => {
  const { entries } = await runIsolatedGenerator({
    "internship/updated.md": markdown({
      ...validCommon,
      slug: "updated-entry",
      type: "internship",
      updated_at: "2026-07-22",
    }),
    "internship/original.md": markdown({
      ...validCommon,
      slug: "original-entry",
      type: "internship",
    }),
  });
  const updated = entries.find((entry) => entry.slug === "updated-entry");
  const original = entries.find((entry) => entry.slug === "original-entry");

  assert.equal(updated.updatedAt, "2026-07-22");
  assert.equal("updatedAt" in original, false);
});

test("models paper reading methods independently from its single execution status", async () => {
  const { entries } = await runIsolatedGenerator({
    "papers/paper.md": markdown(
      {
        ...validPaper,
        reading_methods: "[skim, synthesis]",
        reading_status: "completed",
      },
      "## 粗读记录\n\nFast notes.\n\n## 阅读总结\n\nReusable conclusion.",
    ),
  });

  assert.deepEqual(entries[0].readingMethods, ["skim", "synthesis"]);
  assert.equal(entries[0].readingStatus, "completed");
});

test("allows no reading method only while a paper is queued", async () => {
  const { entries } = await runIsolatedGenerator({
    "papers/queued.md": markdown({
      ...validPaper,
      reading_methods: "[]",
      reading_status: "queued",
    }, "Reading has not started."),
  });
  assert.deepEqual(entries[0].readingMethods, []);

  const failure = await generatorFailure({
    "papers/active.md": markdown({
      ...validPaper,
      reading_methods: "[]",
      reading_status: "in_progress",
    }, "Reading started."),
  });
  assert.match(failure, /active\.md.*reading_methods.*at least one/i);
});

test("rejects duplicate methods and mismatches between methods and paper sections", async () => {
  const duplicate = await generatorFailure({
    "papers/duplicate.md": markdown({
      ...validPaper,
      reading_methods: "[deep, deep]",
    }),
  });
  assert.match(duplicate, /duplicate\.md.*reading_methods.*duplicate/i);

  const missingSection = await generatorFailure({
    "papers/missing-section.md": markdown({
      ...validPaper,
      reading_methods: "[deep, synthesis]",
    }),
  });
  assert.match(missingSection, /missing-section\.md.*阅读总结/i);

  const undeclaredSection = await generatorFailure({
    "papers/undeclared-section.md": markdown(
      validPaper,
      "## 细读记录\n\nDeep.\n\n## 粗读记录\n\nSkim.",
    ),
  });
  assert.match(undeclaredSection, /undeclared-section\.md.*粗读记录/i);
});

test("does not treat a paper heading inside fenced code as a real reading section", async () => {
  const failure = await generatorFailure({
    "papers/fenced.md": markdown(
      { ...validPaper, reading_methods: "[deep, synthesis]" },
      "## 细读记录\n\nDeep notes.\n\n```markdown\n## 阅读总结\n```",
    ),
  });
  assert.match(failure, /fenced\.md.*阅读总结/i);
});

test("normalizes required recruiting archive metadata", async () => {
  const { entries } = await runIsolatedGenerator({
    "jobs/job.md": markdown({
      ...validCommon,
      location: "北京",
      applied_at: "2026-07-19",
      next_action: "准备二面项目复盘",
    }),
  });

  assert.equal(entries[0].company, "Example Robotics");
  assert.equal(entries[0].role, "具身智能算法工程师");
  assert.equal(entries[0].applicationStage, "interview");
  assert.equal(entries[0].appliedAt, "2026-07-19");
  assert.equal(entries[0].nextAction, "准备二面项目复盘");
});

test("rejects incomplete recruiting archives and invalid stages", async () => {
  for (const [field, override] of [
    ["company", { company: "" }],
    ["role", { role: "" }],
    ["application_stage", { application_stage: "screening" }],
    ["applied_at", { applied_at: "2026-02-30" }],
  ]) {
    const failure = await generatorFailure({
      "jobs/invalid.md": markdown({ ...validCommon, ...override }),
    });
    assert.match(failure, new RegExp(`invalid\\.md.*${field}`, "i"));
  }
});

test("validates drafts but excludes them and drops published relations to drafts with a file warning", async () => {
  const published = markdown({
    ...validCommon,
    related: "[private-draft]",
  });
  const draft = markdown({
    ...validCommon,
    slug: "private-draft",
    status: "draft",
  });

  const { entries, stderr } = await runIsolatedGenerator({
    "jobs/published.md": published,
    "jobs/private-draft.md": draft,
  });

  assert.deepEqual(entries.map((entry) => entry.slug), ["fixture"]);
  assert.deepEqual(entries[0].related, []);
  assert.match(stderr, /published\.md.*related.*private-draft.*draft/i);
});

test("rejects a malformed draft before exclusion", async () => {
  const failure = await generatorFailure({
    "jobs/malformed-draft.md": markdown({
      ...validCommon,
      tags: "[draft, 2]",
      status: "draft",
    }),
  });

  assert.match(failure, /malformed-draft\.md.*tags/i);
});

test("fails duplicate slugs with the conflicting source path and slug field", async () => {
  const failure = await generatorFailure({
    "jobs/first.md": markdown(validCommon),
    "internship/second.md": markdown({
      ...validCommon,
      type: "internship",
    }),
  });

  assert.match(failure, /second\.md.*slug.*duplicate/i);
});

test("fails impossible reflection dates with the source path and date field", async () => {
  const failure = await generatorFailure({
    "reflections/2026-02-30.md": markdown({
      ...validCommon,
      slug: "2026-02-30",
      type: "reflections",
      date: "2026-02-30",
    }),
  });

  assert.match(failure, /2026-02-30\.md.*date/i);
});

test("fails malformed common and paper schema fields with file-specific diagnostics", async () => {
  const cases = [
    ["title", { title: "42" }],
    ["slug", { slug: "42" }],
    ["summary", { summary: "42" }],
    ["date", { date: "2026/07/20" }],
    ["read_at", { read_at: "2026-02-30" }],
    ["type", { type: "notes" }],
    ["status", { status: "private" }],
    ["tags", { tags: "[robotics, 2]" }],
    ["related", { related: "[false]" }],
    ["authors", { authors: "[Research Team, 2]" }],
    ["venue", { venue: "2026" }],
    ["year", { year: "2026.5" }],
    ["paper_url", { paper_url: "ftp://example.com/paper" }],
    ["reading_status", { reading_status: "finished" }],
    ["reading_methods", { reading_methods: "[unknown]" }],
    ["topics", { topics: "[robotics, true]" }],
  ];

  for (const [field, override] of cases) {
    const fixture = field === "title" ? validCommon : validPaper;
    const moduleName = field === "title" ? "jobs" : "papers";
    const failure = await generatorFailure({
      [`${moduleName}/malformed.md`]: markdown({ ...fixture, ...override }),
    });
    assert.match(failure, new RegExp(`malformed\\.md.*${field}`, "i"), field);
  }
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

test("reflection navigation separates chronological neighbors from same-day entries", async () => {
  const { getReflectionNavigation } = await import("../lib/content/query.ts");
  const reflections = [
    { ...validCommon, slug: "2026-07-19", type: "reflections", date: "2026-07-19", tags: [], related: [], body: "" },
    { ...validCommon, slug: "2026-07-20", type: "reflections", date: "2026-07-20", tags: [], related: [], body: "" },
    { ...validCommon, slug: "2026-07-20-2", type: "reflections", date: "2026-07-20", tags: [], related: [], body: "" },
    { ...validCommon, slug: "2026-07-21", type: "reflections", date: "2026-07-21", tags: [], related: [], body: "" },
  ];

  const navigation = getReflectionNavigation("2026-07-20", reflections);
  assert.equal(navigation.previous?.slug, "2026-07-19");
  assert.equal(navigation.next?.slug, "2026-07-21");
  assert.deepEqual(navigation.sameDay.map((entry) => entry.slug), ["2026-07-20-2"]);
});

test("summarizes every paper status and recruiting stage without omitting zero counts", async () => {
  const query = await import("../lib/content/query.ts");

  assert.equal(typeof query.getPaperStatusCounts, "function");
  assert.equal(typeof query.getRecruitingStageCounts, "function");
  assert.deepEqual(query.getPaperStatusCounts(), {
    queued: 0,
    in_progress: 0,
    synthesizing: 0,
    completed: 1,
    archived: 0,
  });
  assert.deepEqual(query.getRecruitingStageCounts(), {
    applied: 0,
    written_test: 0,
    interview: 1,
    offer: 0,
    closed: 0,
  });
});

test("sorts recruiting and paper entries newest first before limiting", async () => {
  const query = await import("../lib/content/query.ts");
  assert.equal(typeof query.sortEntriesByRecency, "function");
  const entries = [
    { slug: "older", date: "2026-07-01" },
    { slug: "newer", date: "2026-07-23" },
    { slug: "middle", date: "2026-07-12" },
  ];
  assert.deepEqual(query.sortEntriesByRecency(entries).map((entry) => entry.slug), ["newer", "middle", "older"]);
  assert.deepEqual(query.getRecentEntriesByType("jobs", 1).map((entry) => entry.slug), ["autumn-recruiting-journey"]);
});

test("sorts same-day reflections by legal slug sequence without changing readAt recency", async () => {
  const query = await import("../lib/content/query.ts");
  const reflections = [
    { slug: "2026-07-20", type: "reflections", date: "2026-07-20" },
    { slug: "2026-07-20-3", type: "reflections", date: "2026-07-20" },
    { slug: "2026-07-20-2", type: "reflections", date: "2026-07-20" },
  ];
  const papers = [
    { slug: "new-read", type: "papers", date: "2026-07-24", readAt: "2026-07-26" },
    { slug: "old-read", type: "papers", date: "2026-07-25", readAt: "2026-07-20" },
  ];

  assert.deepEqual(
    query.sortEntriesByRecency(reflections).map((entry) => entry.slug),
    ["2026-07-20-3", "2026-07-20-2", "2026-07-20"],
  );
  assert.deepEqual(
    query.sortEntriesByRecency(papers).map((entry) => entry.slug),
    ["new-read", "old-read"],
  );
});
