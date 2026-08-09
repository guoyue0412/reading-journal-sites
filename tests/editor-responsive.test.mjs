import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("editor exposes desktop, tablet, and phone presentation controls", async () => {
  const [editor, sidebar, mobileBar, css] = await Promise.all([
    read("components/editor/structured-editor.tsx"), read("components/editor/editor-sidebar.tsx"),
    read("components/editor/editor-mobile-bar.tsx"), read("app/editor-archive.css"),
  ]);
  assert.match(editor, /sidebarOpen/);
  assert.match(editor, /studio-posts-toggle/);
  assert.match(sidebar, /isOpen/);
  assert.match(mobileBar, /添加模块/);
  assert.match(mobileBar, /预览/);
  assert.match(mobileBar, /发布/);
  assert.match(css, /grid-template-columns:\s*220px\s+minmax\(440px,\s*1fr\)\s+360px/);
  assert.match(css, /@media\s*\(max-width:\s*1060px\)/);
  assert.match(css, /@media\s*\(max-width:\s*1024px\)\s*and\s*\(orientation:\s*portrait\)/);
  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /padding-bottom:\s*calc\(88px\s*\+\s*env\(safe-area-inset-bottom\)\)/);
});

test("late editor archive rules explicitly neutralize legacy material chrome", async () => {
  const [legacy, css] = await Promise.all([read("app/globals.css"), read("app/editor-archive.css")]);
  assert.match(legacy, /\.admin-header\s*{[^}]*backdrop-filter:\s*blur/s);
  assert.match(legacy, /\.material-toolbar\s*{[^}]*backdrop-filter:\s*blur[^}]*-webkit-backdrop-filter:\s*blur/s);
  assert.match(legacy, /\.studio-save-state\s*{[^}]*border-radius:\s*999px/s);
  assert.match(legacy, /\.studio-drawer\s*{[^}]*box-shadow:\s*var\(--shadow-float\)[^}]*backdrop-filter:\s*blur/s);
  assert.match(legacy, /\.admin-page \.structured-editor\s*{[^}]*box-shadow:\s*var\(--shadow-soft\)/s);

  assert.match(css, /\.admin-page \.admin-header\s*{[^}]*backdrop-filter:\s*none[^}]*-webkit-backdrop-filter:\s*none[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.admin-page \.studio-toolbar\.material-toolbar\s*{[^}]*background:\s*var\(--archive-paper\)[^}]*backdrop-filter:\s*none[^}]*-webkit-backdrop-filter:\s*none[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.admin-page \.structured-editor\s*{[^}]*background:\s*var\(--archive-paper\)[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.admin-page \.studio-sidebar\s*{[^}]*background:\s*var\(--archive-paper-soft\)[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.admin-page \.studio-preview\s*{[^}]*background:\s*var\(--archive-paper\)[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.admin-page \.studio-drawer\s*{[^}]*border-radius:\s*6px[^}]*background:\s*var\(--archive-paper\)[^}]*box-shadow:\s*none[^}]*backdrop-filter:\s*none[^}]*-webkit-backdrop-filter:\s*none/s);
  assert.match(css, /\.admin-page \.studio-save-state\s*{[^}]*border-radius:\s*4px[^}]*background:\s*transparent/s);
  assert.match(css, /\.admin-page \.studio-toolbar \.material-action:hover\s*{[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.admin-page \.studio-toolbar \.material-action--primary:hover\s*{[^}]*border-color:\s*var\(--archive-ink\)[^}]*background:\s*var\(--archive-ink\)[^}]*color:\s*var\(--archive-paper\)[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.admin-page \.studio-sidebar button\.is-active\s*{[^}]*background:\s*var\(--archive-paper\)[^}]*box-shadow:\s*inset 3px 0 var\(--archive-accent\)/s);
  assert.match(css, /\.admin-page \.studio-(?:sidebar|section)[^\{]*button[^\{]*\{[^}]*border-radius:\s*4px[^}]*background:\s*var\(--archive-paper\)/s);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|translateY\(-/);
  const backdropValues = [...css.matchAll(/(?:^|[;\s])(?:-webkit-)?backdrop-filter:\s*([^;]+)/gm)].map((match) => match[1].trim());
  assert.ok(backdropValues.length >= 4);
  assert.deepEqual([...new Set(backdropValues)], ["none"]);
  assert.match(css, /min-height:\s*44px/);
});

test("archive module-title action overrides the legacy purple material treatment", async () => {
  const [legacy, css] = await Promise.all([read("app/globals.css"), read("app/editor-archive.css")]);
  assert.match(legacy, /\.studio-sections__title button\s*{[^}]*border-color:\s*color-mix[^}]*color:\s*#454f99/s);
  assert.match(legacy, /\.studio-sections__title button:hover\s*{[^}]*background:\s*var\(--accent-soft\)/s);
  assert.match(css, /\.admin-page \.studio-sections__title button\s*{[^}]*border-color:\s*var\(--archive-rule\)[^}]*background:\s*var\(--archive-paper\)[^}]*color:\s*var\(--archive-ink\)[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.admin-page \.studio-sections__title button:hover\s*{[^}]*border-color:\s*var\(--archive-accent\)[^}]*background:\s*var\(--archive-paper-soft\)[^}]*color:\s*var\(--archive-ink\)[^}]*box-shadow:\s*none/s);
});

test("tablet landscape keeps dual panes while portrait switches one pane", async () => {
  const css = await read("app/editor-archive.css");
  const compactStart = css.indexOf("@media (max-width: 1060px)");
  const portraitStart = css.indexOf("@media (max-width: 1024px) and (orientation: portrait)");
  const phoneStart = css.indexOf("@media (max-width: 640px)");
  assert.ok(compactStart >= 0 && portraitStart > compactStart && phoneStart > portraitStart);

  const landscape = css.slice(compactStart, portraitStart);
  assert.match(landscape, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(320px,\s*360px\)/);
  assert.match(landscape, /\.studio-form,\s*\.studio-preview\s*{[^}]*display:\s*block/s);
  assert.doesNotMatch(landscape, /data-mobile-pane=.*display:\s*none/s);
  assert.match(landscape, /\.studio-sidebar\s*{[^}]*visibility:\s*hidden[^}]*pointer-events:\s*none/s);
  assert.doesNotMatch(landscape, /transition:[^;]*visibility/);
  assert.match(landscape, /\.studio-sidebar\.is-open\s*{[^}]*visibility:\s*visible[^}]*pointer-events:\s*auto/s);

  const portrait = css.slice(portraitStart, phoneStart);
  assert.match(portrait, /\.studio-layout\s*{[^}]*display:\s*block/s);
  assert.match(portrait, /data-mobile-pane="edit"[^}]*\.studio-preview\s*{\s*display:\s*none/s);
  assert.match(portrait, /data-mobile-pane="preview"[^}]*\.studio-form\s*{\s*display:\s*none/s);
});

test("section actions are grouped in a native keyboard-accessible disclosure", async () => {
  const section = await read("components/editor/section-editor.tsx");
  assert.match(section, /<details className="studio-section-menu"/);
  assert.match(section, /<summary>模块操作<\/summary>/);
  for (const action of ["上移", "下移", "复制", "删除"]) assert.match(section, new RegExp(action));
  const css = await read("app/editor-archive.css");
  assert.match(css, /\.studio-section-menu\s*{[^}]*position:\s*relative/s);
  assert.match(css, /\.studio-section-menu\s*>\s*div\s*{[^}]*right:\s*0/s);
});
