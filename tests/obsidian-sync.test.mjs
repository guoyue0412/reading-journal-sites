import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { syncObsidianBlog } from "../scripts/sync-obsidian-blog.mjs";

const execFileAsync = promisify(execFile);

const note = (frontmatter, body) => `---\n${frontmatter}\n---\n\n${body}\n`;

test("syncs isolated Obsidian categories, wikilinks and attachments without deleting unmanaged content", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "obsidian-blog-"));
  const vaultRoot = path.join(root, "vault");
  const sourceRoot = path.join(vaultRoot, "博客");
  const contentRoot = path.join(root, "content");
  const publicRoot = path.join(root, "public");
  t.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));

  for (const folder of ["秋招", "论文", "90_Attachments"]) {
    await mkdir(path.join(folder === "90_Attachments" ? vaultRoot : sourceRoot, folder), { recursive: true });
  }
  for (const moduleName of ["jobs", "internship", "papers", "reflections"]) {
    await mkdir(path.join(contentRoot, moduleName), { recursive: true });
  }
  const unmanaged = note(
    "title: Existing\nslug: existing\ntype: jobs\ndate: 2026-07-01\nsummary: Existing content\ntags: [test]\nrelated: []\nstatus: published\ncompany: Existing Co\nrole: Existing Role\napplication_stage: applied",
    "Existing body.",
  );
  await writeFile(path.join(contentRoot, "jobs", "keep.md"), unmanaged, "utf8");
  await writeFile(path.join(vaultRoot, "90_Attachments", "figure.png"), "image-bytes");
  await writeFile(path.join(sourceRoot, "论文", "论文 A.md"), note(
    "title: 论文 A\nslug: paper-a\ndate: 2026-07-23\nsummary: 摘要\ntags: [VLA]\nrelated: []\nstatus: published\nauthors: [郭跃]\nvenue: arXiv\nyear: 2026\npaper_url: https://arxiv.org/\nreading_methods: [deep]\nreading_status: in_progress\ntopics: [robotics]",
    "## 细读记录\n\n公式 $x^2$。\n\n![[figure.png]]",
  ));
  await writeFile(path.join(sourceRoot, "秋招", "记录.md"), note(
    "title: 秋招记录\nslug: job-log\ndate: 2026-07-23\nsummary: 今日记录\ntags: [秋招]\nrelated: [paper-a]\nstatus: draft\ncompany: Example Co\nrole: Robot Engineer\napplication_stage: interview",
    "关联 [[论文 A|这篇论文]]。",
  ));

  const result = await syncObsidianBlog({ sourceRoot, vaultRoot, contentRoot, publicRoot });

  assert.equal(result.synced, 2);
  assert.equal(await readFile(path.join(contentRoot, "jobs", "keep.md"), "utf8"), unmanaged);
  assert.match(await readFile(path.join(contentRoot, "jobs", "job-log.md"), "utf8"), /type: jobs/);
  assert.match(await readFile(path.join(contentRoot, "jobs", "job-log.md"), "utf8"), /\[这篇论文\]\(\/post\/paper-a\)/);
  assert.match(await readFile(path.join(contentRoot, "papers", "paper-a.md"), "utf8"), /!\[figure\]\(\/obsidian-assets\/paper-a-figure\.png\)/);
  assert.equal(await readFile(path.join(publicRoot, "obsidian-assets", "paper-a-figure.png"), "utf8"), "image-bytes");

  const generatedPath = path.join(root, "generated.ts");
  const legacyGeneratedPath = path.join(root, "legacy-generated.ts");
  const repositoryLegacyPath = new URL("../lib/content/legacy-generated.ts", import.meta.url);
  const repositoryLegacyBefore = await readFile(repositoryLegacyPath);
  await execFileAsync(process.execPath, [
    "scripts/generate-content-index.mjs", "--content-root", contentRoot,
    "--output", generatedPath, "--legacy-output", legacyGeneratedPath,
  ], { cwd: new URL("../", import.meta.url) });
  const generated = await readFile(generatedPath, "utf8");
  assert.deepEqual(await readFile(repositoryLegacyPath), repositoryLegacyBefore);
  let legacyGenerated;
  await assert.doesNotReject(async () => {
    legacyGenerated = await readFile(legacyGeneratedPath, "utf8");
  }, "writes legacy output to the temporary fixture path");
  assert.match(generated, /"readingMethods": \[\s*"deep"/);
  assert.doesNotMatch(generated, /"slug": "job-log"/);
  assert.match(legacyGenerated, /"slug": "job-log"/);
});

test("fails clearly when a note has no frontmatter or an attachment is missing", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "obsidian-blog-invalid-"));
  const sourceRoot = path.join(root, "vault", "博客");
  await mkdir(path.join(sourceRoot, "感悟"), { recursive: true });
  t.after(() => import("node:fs/promises").then(({ rm }) => rm(root, { recursive: true, force: true })));
  await writeFile(path.join(sourceRoot, "感悟", "bad.md"), "no frontmatter ![[missing.png]]", "utf8");

  await assert.rejects(
    syncObsidianBlog({
      sourceRoot,
      vaultRoot: path.dirname(sourceRoot),
      contentRoot: path.join(root, "content"),
      publicRoot: path.join(root, "public"),
    }),
    /bad\.md.*frontmatter/i,
  );
});
