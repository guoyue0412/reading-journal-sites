import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("loads self-hosted archive fonts and late isolated style layers", async () => {
  const [layout, packageJson] = await Promise.all([
    read("app/layout.tsx"),
    read("package.json"),
  ]);
  const dependencies = JSON.parse(packageJson).dependencies;

  assert.equal(dependencies["@fontsource-variable/newsreader"], "5.3.0");
  assert.equal(dependencies["@fontsource-variable/ibm-plex-sans"], "5.3.0");
  assert.equal(dependencies["@fontsource/ibm-plex-mono"], "5.3.0");
  assert.match(layout, /@fontsource-variable\/newsreader\/wght\.css/);
  assert.match(layout, /@fontsource-variable\/ibm-plex-sans\/wght\.css/);
  assert.match(layout, /@fontsource\/ibm-plex-mono\/400\.css/);
  assert.ok(layout.indexOf("./globals.css") < layout.indexOf("./research-archive.css"));
  assert.ok(layout.indexOf("./research-archive.css") < layout.indexOf("./editor-archive.css"));
});

test("defines the approved OKLCH palette and excludes decorative effects", async () => {
  const css = await read("app/research-archive.css");

  for (const token of ["--archive-paper", "--archive-ink", "--archive-muted", "--archive-rule", "--archive-accent", "--archive-focus"]) {
    assert.match(css, new RegExp(`${token}:\\s*oklch\\(`));
  }
  assert.match(css, /overflow-x:\s*clip/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|backdrop-filter|filter:\s*blur/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test("research archive data exposes questions, contributions, and verifiable internal evidence", async () => {
  const { researchProfile, researchProjects, researchTopics } = await import("../lib/research/archive.ts");

  assert.match(researchProfile.field, /具身智能/);
  assert.ok(researchProfile.currentQuestion.length > 20);
  assert.equal(researchProjects.length, 3);
  for (const project of researchProjects) {
    assert.ok(project.id && project.title && project.question && project.contribution);
    assert.ok(project.evidence.length > 0);
    assert.ok(project.evidence.every((item) => item.href.startsWith("/")));
  }
  assert.deepEqual(researchTopics.map((topic) => topic.label), ["VLA", "世界模型", "动作与状态表征", "灵巧操作", "仿真与泛化"]);
});

test("masthead has desktop and native mobile navigation without glass chrome", async () => {
  const [shell, css] = await Promise.all([read("components/research-shell.tsx"), read("app/research-archive.css")]);
  assert.match(shell, /<details className="archive-mobile-nav"/);
  assert.match(shell, /href="\/editor"/);
  assert.match(css, /\.archive-masthead/);
  assert.doesNotMatch(css, /backdrop-filter|border-radius:\s*999px/);
});

test("keeps all archive navigation and entry links as explicit 44px targets", async () => {
  const css = await read("app/research-archive.css");

  for (const selector of [
    ".archive-masthead__identity a",
    ".archive-section > header a",
    ".archive-topics li a",
    ".archive-reading-list h3 a",
    ".archive-record-list a",
  ]) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rule = css.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`))?.[0] ?? "";
    assert.match(
      rule,
      /display:\s*(?:inline-)?flex/,
      selector,
    );
    assert.match(rule, /align-items:\s*center/, selector);
    assert.match(rule, /min-height:\s*44px/, selector);
  }
});

test("homepage derives non-paper records through the shared recency query", async () => {
  const page = await read("app/page.tsx");

  assert.match(page, /import\s*{[^}]*getRecentEntries[^}]*}\s*from\s*["']@\/lib\/content\/query["']/);
  assert.match(page, /getRecentEntries\(4,\s*entries\.filter\(\(entry\)\s*=>\s*entry\.type\s*!==\s*["']papers["']\)\)/);
});
