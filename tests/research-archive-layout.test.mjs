import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function cssRules(css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: match[1].split(",").map((selector) => selector.trim()),
    declarations: match[2],
  }));
}

function declarationsFor(css, selector) {
  const rule = cssRules(css).find((candidate) => candidate.selectors.includes(selector));
  assert.ok(rule, `missing CSS selector: ${selector}`);
  return rule.declarations;
}

function oklchToken(css, token) {
  const match = new RegExp(`${token}:\\s*oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\)`).exec(css);
  assert.ok(match, `missing OKLCH token: ${token}`);
  return [Number(match[1]) / 100, Number(match[2]), Number(match[3])];
}

function relativeLuminance([lightness, chroma, hue]) {
  const radians = hue * Math.PI / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const lBase = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mBase = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sBase = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lBase ** 3;
  const m = mBase ** 3;
  const s = sBase ** 3;
  const clamp = (value) => Math.min(1, Math.max(0, value));
  const red = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const green = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const blue = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

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

test("research archive data exposes truthful profile links and evidence states", async () => {
  const { researchProfile, researchProjects, researchTopics } = await import("../lib/research/archive.ts");
  const { CONTENT_ENTRIES } = await import("../lib/content/generated.ts");

  assert.match(researchProfile.field, /具身智能/);
  assert.ok(researchProfile.currentQuestion.length > 20);
  assert.deepEqual(researchProfile.links, [
    { label: "GitHub", href: "https://github.com/guoyue0412" },
    { label: "简历", href: "/about#resume" },
    { label: "联系", href: "/about#contact" },
  ]);
  assert.equal(researchProjects.length, 3);
  for (const project of researchProjects) {
    assert.ok(project.id && project.title && project.question && project.contribution);
    assert.ok(project.evidence.length > 0);
  }
  const linkedEvidence = researchProjects.flatMap((project) => project.evidence).filter((item) => "href" in item);
  const pendingEvidence = researchProjects.flatMap((project) => project.evidence).filter((item) => "note" in item);
  assert.deepEqual(linkedEvidence.map((item) => item.href), ["/post/unitacvla-reading"]);
  assert.ok(linkedEvidence.every((item) => CONTENT_ENTRIES.some((entry) => item.href === `/post/${entry.slug}`)));
  assert.equal(pendingEvidence.length, 2);
  assert.ok(pendingEvidence.every((item) => /阶段档案/.test(item.label) && /暂无公开证据/.test(item.note)));
  assert.deepEqual(researchTopics.map((topic) => topic.label), ["VLA", "世界模型", "动作与状态表征", "灵巧操作", "仿真与泛化"]);
});

test("homepage and about page expose GitHub, resume, and contact without invented details", async () => {
  const [home, about] = await Promise.all([read("app/page.tsx"), read("app/about/page.tsx")]);

  assert.match(home, /researchProfile\.links\.map/);
  assert.match(about, /id="resume"/);
  assert.match(about, /id="contact"/);
  assert.match(about, /https:\/\/github\.com\/guoyue0412/);
  assert.doesNotMatch(about, /mailto:|@(?:gmail|outlook|qq|163)\./i);
});

test("project evidence statuses are grouped without pretending to be navigation", async () => {
  const projectList = await read("components/research-project-list.tsx");

  assert.match(projectList, /<div className="archive-projects__evidence"/);
  assert.doesNotMatch(projectList, /<nav aria-label=\{`\$\{project\.title\}研究证据`\}>/);
});

test("masthead has desktop and native mobile navigation without glass chrome", async () => {
  const [shell, navigation, css] = await Promise.all([read("components/research-shell.tsx"), read("components/research-navigation.tsx"), read("app/research-archive.css")]);
  assert.match(shell, /<details className="archive-mobile-nav"/);
  assert.match(shell, /href="\/editor"/);
  assert.match(navigation, /"use client"/);
  assert.match(navigation, /usePathname/);
  assert.match(navigation, /aria-current=\{current \? "page" : undefined\}/);
  assert.match(css, /\.archive-masthead/);
  assert.match(css, /a\[aria-current="page"\]/);
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

test("paper bibliography keeps desktop and mobile presentations mutually exclusive", async () => {
  const css = await read("app/research-archive.css");

  assert.match(css, /\.research-page \.paper-bibliography\s*\{[^}]*display:\s*block/s);
  assert.match(css, /\.research-page \.paper-mobile-list\s*\{[^}]*display:\s*none/s);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.research-page \.paper-bibliography\s*\{[^}]*display:\s*none[^}]*\}[\s\S]*?\.research-page \.paper-mobile-list\s*\{[^}]*display:\s*block/s);
});

test("paper mobile title links keep a 44px target across the full mobile-list breakpoint", async () => {
  const css = await read("app/research-archive.css");
  const rule = css.match(/\.research-page \.paper-mobile-list h2 a\s*\{[^}]*\}/s)?.[0] ?? "";

  assert.match(rule, /display:\s*inline-flex/);
  assert.match(rule, /align-items:\s*center/);
  assert.match(rule, /min-height:\s*44px/);
});

test("paper connection links retain a 44px target in the archive layer", async () => {
  const css = await read("app/research-archive.css");

  assert.match(css, /\.research-page \.paper-index-connections a\s*\{[^}]*min-height:\s*44px/s);
});

test("paper methods are touch-sized multi-select controls while status stays single-select", async () => {
  const [source, css] = await Promise.all([read("components/paper-index.tsx"), read("app/research-archive.css")]);

  assert.match(source, /<fieldset className="paper-method-filter"/);
  assert.match(source, /type="checkbox"/);
  assert.match(source, /checked=\{readingMethods\.includes\(value\)\}/);
  assert.match(source, /<select value=\{readingStatus\}/);
  assert.match(css, /\.paper-method-filter label\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.paper-method-filter input\s*\{[^}]*width:\s*18px[^}]*height:\s*18px/s);
});

test("article presentation exposes real update metadata and reflection navigation", async () => {
  const article = await read("components/markdown-article.tsx");

  assert.match(article, /entry\.updatedAt/);
  assert.match(article, /<dt>更新时间<\/dt>/);
  assert.match(article, /className="reflection-article-navigation"/);
  assert.match(article, /上一篇/);
  assert.match(article, /下一篇/);
  assert.match(article, /同日关联/);
  assert.match(article, /href=\{`\/post\/\$\{related\.slug\}`\}/);
  assert.doesNotMatch(article, /href=\{`\/blog\/\$\{related\.slug\}`\}/);
});

test("new presentation files do not reintroduce the retired visual language", async () => {
  const presentationPaths = [
    "app/page.tsx",
    "components/research-shell.tsx",
    "components/research-project-list.tsx",
    "components/research-topic-index.tsx",
    "components/paper-index.tsx",
    "components/content-index.tsx",
    "components/recruiting-index.tsx",
    "components/markdown-article.tsx",
    "components/editor/structured-editor.tsx",
    "components/editor/editor-mobile-bar.tsx",
    "components/editor/editor-sidebar.tsx",
    "components/editor/section-editor.tsx",
    "components/editor/markdown-section-editor.tsx",
    "components/editor/add-section-drawer.tsx",
    "components/editor/article-preview.tsx",
    "components/editor/post-fields.tsx",
  ];
  const [publicCss, editorCss, ...presentationSources] = await Promise.all([
    read("app/research-archive.css"),
    read("app/editor-archive.css"),
    ...presentationPaths.map(read),
  ]);
  const combined = `${publicCss}\n${editorCss}\n${presentationSources.join("\n")}`;

  assert.doesNotMatch(combined, /ambient|glass|linear-gradient|radial-gradient|translateY\(-/i);
  assert.doesNotMatch(combined, /border-radius:\s*999px/i);
  assert.doesNotMatch(combined, /panel-controls/);

  const backdropValues = [...combined.matchAll(/(?:^|[;{]\s*)(?:-webkit-)?backdrop-filter:\s*([^;}]+)/gm)]
    .map((match) => match[1].trim());
  const filterValues = [...combined.matchAll(/(?:^|[;{]\s*)filter:\s*([^;}]+)/gm)]
    .map((match) => match[1].trim());

  assert.ok(backdropValues.every((value) => value === "none"), `unsafe backdrop-filter: ${backdropValues.join(", ")}`);
  assert.ok(filterValues.every((value) => value === "none"), `unsafe filter: ${filterValues.join(", ")}`);

  const hoverRules = cssRules(`${publicCss}\n${editorCss}`)
    .filter((rule) => rule.selectors.some((selector) => selector.includes(":hover")));
  assert.ok(hoverRules.length > 0);
  for (const rule of hoverRules) {
    assert.doesNotMatch(rule.declarations, /(?:^|;)\s*transform\s*:/, rule.selectors.join(", "));
    const shadows = [...rule.declarations.matchAll(/(?:^|;)\s*box-shadow:\s*([^;]+)/g)].map((match) => match[1].trim());
    assert.ok(shadows.every((value) => value === "none"), `${rule.selectors.join(", ")}: ${shadows.join(", ")}`);
  }
});

test("late archive layers neutralize mounted legacy gradient and material hooks", async () => {
  const [legacyCss, publicCss, editorCss, article] = await Promise.all([
    read("app/globals.css"),
    read("app/research-archive.css"),
    read("app/editor-archive.css"),
    read("components/markdown-article.tsx"),
  ]);

  assert.match(article, /className="markdown-body reading-body"/);
  assert.match(legacyCss, /\.reading-body::before\s*\{[^}]*content:\s*""[^}]*background:\s*linear-gradient/s);
  assert.match(publicCss, /\.research-page \.reading-body::before\s*\{[^}]*content:\s*none[^}]*background:\s*none/s);

  assert.match(legacyCss, /\.admin-header\s*\{[^}]*backdrop-filter:\s*blur/s);
  assert.match(editorCss, /\.admin-page \.admin-header\s*\{[^}]*backdrop-filter:\s*none[^}]*-webkit-backdrop-filter:\s*none[^}]*box-shadow:\s*none/s);
  assert.match(legacyCss, /\.studio-section:hover\s*\{[^}]*box-shadow:\s*0\s+10px\s+24px/s);
  assert.match(editorCss, /\.studio-section:hover\s*\{[^}]*box-shadow:\s*none/s);
});

test("mounted archive controls have specific interaction and status treatments", async () => {
  const [publicCss, editorCss, structuredEditor, mobileBar, markdownEditor, paperIndex, shell] = await Promise.all([
    read("app/research-archive.css"),
    read("app/editor-archive.css"),
    read("components/editor/structured-editor.tsx"),
    read("components/editor/editor-mobile-bar.tsx"),
    read("components/editor/markdown-section-editor.tsx"),
    read("components/paper-index.tsx"),
    read("components/research-shell.tsx"),
  ]);

  assert.match(structuredEditor, /studio-save-state save-state--\$\{saveState\}/);
  assert.match(structuredEditor, /disabled=\{!current \|\| saveState === "saving"\}/);
  assert.match(mobileBar, /save-state--\$\{saveState\}/);
  assert.match(mobileBar, /disabled=\{disabled \|\| saveState === "saving"\}/);
  assert.match(markdownEditor, /disabled=\{uploading\}/);
  assert.match(markdownEditor, /className="markdown-editor__error" role="alert"/);
  assert.match(paperIndex, /className="paper-filters"/);
  assert.match(paperIndex, /type="search"/);
  assert.match(shell, /<details className="archive-mobile-nav"/);
  assert.match(shell, /<summary>菜单<\/summary>/);
  assert.doesNotMatch(shell, /usePathname|aria-current/);

  assert.match(declarationsFor(publicCss, ".research-page :focus-visible"), /outline:\s*2px solid var\(--archive-focus\)/);
  assert.match(declarationsFor(publicCss, ".research-page a:hover"), /color:\s*var\(--archive-accent\)/);
  assert.match(declarationsFor(publicCss, ".research-page button:not(:disabled):hover"), /border-color:\s*var\(--archive-accent\)/);
  assert.match(declarationsFor(publicCss, ".research-page a:active"), /opacity:\s*\.7/);
  assert.match(declarationsFor(publicCss, ".research-page button:disabled"), /cursor:\s*not-allowed/);
  assert.match(publicCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration:\s*1ms !important/);

  assert.match(declarationsFor(editorCss, ".admin-page :focus-visible"), /outline:\s*2px solid var\(--archive-focus\)/);
  for (const selector of [
    ".admin-page button:not(:disabled):hover",
    ".admin-page input:not(:disabled):hover",
    ".admin-page select:not(:disabled):hover",
    ".admin-page textarea:not(:disabled):hover",
  ]) {
    assert.match(declarationsFor(editorCss, selector), /border-color:\s*var\(--archive-accent\)/);
  }
  assert.match(declarationsFor(editorCss, ".structured-editor button:not(:disabled):active"), /opacity:\s*\.7/);
  assert.match(declarationsFor(editorCss, ".structured-editor button:disabled"), /cursor:\s*not-allowed[^]*opacity:\s*\.52/);
  assert.match(declarationsFor(editorCss, ".save-state--saving"), /color:\s*var\(--archive-muted\)/);
  assert.match(declarationsFor(editorCss, ".save-state--saved"), /color:\s*var\(--archive-success\)/);
  assert.match(declarationsFor(editorCss, ".save-state--failed"), /color:\s*var\(--archive-accent\)/);
  assert.match(declarationsFor(editorCss, ".save-state--conflict"), /color:\s*var\(--archive-accent\)/);
  assert.match(declarationsFor(editorCss, ".markdown-editor__error"), /color:\s*var\(--archive-accent\)/);
  assert.match(editorCss, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.studio-sidebar\s*\{[^}]*transition-duration:\s*1ms/s);
});

test("archive status tokens retain readable computed contrast", async () => {
  const [publicCss, editorCss] = await Promise.all([
    read("app/research-archive.css"),
    read("app/editor-archive.css"),
  ]);

  assert.match(declarationsFor(editorCss, ".save-state--saving"), /color:\s*var\(--archive-muted\)/);
  assert.match(declarationsFor(editorCss, ".save-state--saved"), /color:\s*var\(--archive-success\)/);
  assert.match(declarationsFor(editorCss, ".save-state--failed"), /color:\s*var\(--archive-accent\)/);
  assert.match(declarationsFor(editorCss, ".save-state--conflict"), /color:\s*var\(--archive-accent\)/);
  const paper = oklchToken(publicCss, "--archive-paper");
  for (const token of ["--archive-muted", "--archive-accent", "--archive-success"]) {
    assert.ok(contrastRatio(paper, oklchToken(publicCss, token)) >= 4.5, `${token} contrast`);
  }
  assert.ok(contrastRatio(paper, oklchToken(publicCss, "--archive-focus")) >= 3, "--archive-focus contrast");
});
