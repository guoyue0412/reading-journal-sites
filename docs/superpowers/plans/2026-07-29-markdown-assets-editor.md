# 全模块 Markdown 与图片上传 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将所有内容模块统一为 Markdown 编辑，增加可粘贴/选择的 R2 图片上传，并保证 LaTeX、关联索引、旧文章迁移、自动保存与发布快照完整可靠。

**Architecture:** D1 继续保存文章结构与图片元数据，R2 的 `BLOG_ASSETS` 绑定保存图片字节。领域层负责旧模块 Markdown 规范化、关联与图片引用解析；上传和媒体读取由独立 API 处理；发布由 D1 事务同时写快照并提升已引用图片可见性。编辑器使用单一 Markdown 模块组件，图片上传成功后才向当前文章的当前模块插入稳定 URL。

**Tech Stack:** Next.js 16、React 19、TypeScript、Cloudflare D1/R2、Drizzle ORM、react-markdown、remark-gfm、remark-math、rehype-katex、Node test。

## Global Constraints

- 文章级字段继续使用结构化表单；只有内容模块统一为 Markdown。
- 新模块的规范 `kind` 必须是 `markdown`；旧 `kind` 读取兼容、保存规范化。
- `reading-summary` 继续使用共享常量与 `standardKey` 校验，不能依赖标题猜测。
- 图片只允许 PNG、JPEG、WebP、GIF，单张最大 10MB；拒绝 SVG 和伪造 MIME。
- 草稿图片仅所有者可见，已发布图片公开且 URL 稳定。
- 不允许把 `blob:`、`data:` 或 `uploading:` URL 写入 D1、恢复副本或发布快照。
- 保留 800ms 单飞/排队自动保存、`draftVersion` 链、`editRevision` 和 `activePostId` 防串文机制。
- 保留 GFM、LaTeX、表格、代码块、任务清单、Markdown 导入导出和 44px 触摸目标。
- 不自动删除 R2 对象；只识别 30 天未发布且未引用的孤儿资源。
- 桌面、平板和手机均需验证粘贴、文件选择、预览、刷新与发布。

## File Structure

- `lib/blog/markdown-sections.ts`：旧模块转 Markdown、wiki 关联和本站图片引用解析。
- `lib/blog/assets.ts`：图片类型、文件头、大小、文件名和 Markdown URL 规则。
- `lib/blog/asset-store.ts`：图片元数据存储接口和内存测试实现。
- `lib/blog/d1-asset-store.ts`：D1 元数据与 R2 字节的生产实现。
- `components/editor/markdown-section-editor.tsx`：统一 Markdown 输入、工具栏、粘贴和文件选择。
- `components/editor/markdown-editing.ts`：光标插入、选区包裹和图片 Markdown 生成纯函数。
- `app/api/editor/assets/route.ts`：所有者图片上传。
- `app/media/[id]/[name]/route.ts`：草稿/公开图片读取。
- `db/schema.ts` 与 Drizzle migration：`blog_assets` 元数据表。
- 现有 `service.ts`、`store.ts`、`d1-store.ts`：保存规范化和发布图片可见性事务。
- 现有编辑器组件：接入上传状态，不改变自动保存并发协议。

---

### Task 1: 规范化所有模块为 Markdown

**Files:**
- Create: `lib/blog/markdown-sections.ts`
- Modify: `lib/blog/section-constants.ts`
- Modify: `lib/blog/default-templates.ts`
- Modify: `lib/blog/service.ts`
- Test: `tests/markdown-sections.test.mjs`
- Test: `tests/blog-domain.test.mjs`

**Interfaces:**
- Produces: `normalizeMarkdownSection(section: BlogSection): BlogSection`
- Produces: `normalizeMarkdownPost(post: BlogPostDraft): BlogPostDraft`
- Consumes: existing `normalizeSection()` and `READING_SUMMARY`.

- [ ] **Step 1: Write failing migration tests**

```js
test("normalizes legacy text, checklist, and relation sections into markdown", () => {
  const checklist = normalizeMarkdownSection({ ...base, kind: "checklist", content: "开场", items: ["读论文", "写总结"] });
  assert.equal(checklist.kind, "markdown");
  assert.equal(checklist.content, "开场\n\n- [ ] 读论文\n- [ ] 写总结");
  assert.deepEqual(checklist.items, []);

  const relation = normalizeMarkdownSection({ ...base, kind: "relation", content: "延伸", relationSlugs: ["paper-a"] });
  assert.equal(relation.content, "延伸\n\n[[paper-a]]");
  assert.deepEqual(relation.relationSlugs, ["paper-a"]);
});

test("preserves reading-summary identity while converting its kind", () => {
  const result = normalizeMarkdownSection({ ...base, title: "阅读总结", kind: "long_text", standardKey: "readingSummary" });
  assert.equal(result.kind, "markdown");
  assert.equal(result.standardKey, READING_SUMMARY);
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `node --test tests/markdown-sections.test.mjs tests/blog-domain.test.mjs`

Expected: FAIL because `lib/blog/markdown-sections.ts` and the new exports do not exist.

- [ ] **Step 3: Implement canonical conversion**

```ts
import type { BlogPostDraft, BlogSection } from "./types.ts";
import { normalizeSection } from "./section-constants.ts";

function joinParts(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join("\n\n");
}

export function normalizeMarkdownSection(input: BlogSection): BlogSection {
  const section = normalizeSection(input);
  const checklist = section.kind === "checklist"
    ? section.items.map((item) => `- [ ] ${item}`).join("\n")
    : "";
  const relations = section.kind === "relation"
    ? section.relationSlugs.map((slug) => `[[${slug}]]`).join("\n")
    : "";
  return {
    ...section,
    kind: "markdown",
    content: joinParts([section.content, checklist, relations]),
    items: [],
  };
}

export function normalizeMarkdownPost(post: BlogPostDraft): BlogPostDraft {
  return { ...post, sections: post.sections.map(normalizeMarkdownSection) };
}
```

Update every default template definition to `kind: "markdown"`. In `createBlogService`, normalize posts in `createPost`, `listPosts`, `loadPost`, `saveDraft`, `previewImport`, and `publishPost`.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test tests/markdown-sections.test.mjs tests/blog-domain.test.mjs tests/blog-service.test.mjs`

Expected: PASS, including legacy reading-summary publication.

- [ ] **Step 5: Commit**

```bash
git add lib/blog/markdown-sections.ts lib/blog/section-constants.ts lib/blog/default-templates.ts lib/blog/service.ts tests/markdown-sections.test.mjs tests/blog-domain.test.mjs
git commit -m "feat: normalize content sections to markdown"
```

---

### Task 2: Parse Markdown relations and validate links

**Files:**
- Modify: `lib/blog/markdown-sections.ts`
- Modify: `lib/blog/service.ts`
- Modify: `lib/blog/validation.ts`
- Modify: `lib/blog/markdown.ts`
- Test: `tests/markdown-sections.test.mjs`
- Test: `tests/markdown-roundtrip.test.mjs`
- Test: `tests/blog-service.test.mjs`

**Interfaces:**
- Produces: `extractWikiRelations(markdown: string): Array<{ slug: string; label: string | null }>`
- Produces: `derivePostRelations(post: BlogPostDraft): string[]`
- Consumes: `BlogStore.listDrafts()` for publish-time slug existence.

- [ ] **Step 1: Write failing parser and publish tests**

```js
test("extracts unique wiki relations outside fenced code", () => {
  assert.deepEqual(extractWikiRelations("[[paper-a]] 和 [[paper-b|另一篇]]\n\`\`\`md\n[[ignored]]\n\`\`\`"), [
    { slug: "paper-a", label: null },
    { slug: "paper-b", label: "另一篇" },
  ]);
});

test("allows unknown relations during save but rejects them during publish", async () => {
  const saved = await service.saveDraft(postWith("[[missing-post]]"), 0);
  assert.equal(saved.relationSlugs[0], "missing-post");
  await assert.rejects(() => service.publishPost(saved.id, saved.draftVersion), /关联文章不存在：missing-post/);
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --test tests/markdown-sections.test.mjs tests/markdown-roundtrip.test.mjs tests/blog-service.test.mjs`

Expected: FAIL because wiki parsing and publish validation are absent.

- [ ] **Step 3: Implement a fence-aware relation parser**

Implement `extractWikiRelations()` using the same fenced-code state rules already used by `splitH2Sections()`. Accept only slugs matching `^[a-z0-9][a-z0-9-]*$`, deduplicate in source order, and ignore malformed/empty tokens. Set `post.related` and each section’s `relationSlugs` from parsed Markdown during normalization.

Add to `publishPost`:

```ts
const knownSlugs = new Set((await store.listDrafts()).map((post) => post.slug));
const missing = derivePostRelations(draft).filter((slug) => !knownSlugs.has(slug));
if (missing.length) throw new BlogValidationError(missing.map((slug) => `关联文章不存在：${slug}`));
```

- [ ] **Step 4: Verify round-trip and validation**

Run: `node --test tests/markdown-sections.test.mjs tests/markdown-roundtrip.test.mjs tests/blog-service.test.mjs`

Expected: PASS; `[[slug|label]]` survives export/import and code fences do not create relations.

- [ ] **Step 5: Commit**

```bash
git add lib/blog/markdown-sections.ts lib/blog/service.ts lib/blog/validation.ts lib/blog/markdown.ts tests/markdown-sections.test.mjs tests/markdown-roundtrip.test.mjs tests/blog-service.test.mjs
git commit -m "feat: derive article relations from markdown"
```

---

### Task 3: Add R2 binding and durable asset metadata

**Files:**
- Modify: `.openai/hosting.json`
- Modify: `worker/index.ts`
- Modify: `db/schema.ts`
- Create: `lib/blog/asset-store.ts`
- Create: `lib/blog/d1-asset-store.ts`
- Create: generated `drizzle/0001_*.sql`
- Modify: `drizzle/meta/_journal.json`
- Create: generated `drizzle/meta/0001_snapshot.json`
- Test: `tests/asset-store-contract.test.mjs`
- Test: `tests/blog-store-contract.test.mjs`

**Interfaces:**
- Produces: `BlogAsset`, `BlogAssetStore`, `MemoryBlogAssetStore`, `D1BlogAssetStore`.
- Produces methods: `findByPostAndHash`, `createDraftAsset`, `getById`, `listByPost`, `listOrphansBefore`.
- Adds optional `assetIds: string[]` to `BlogStore.publish(...)`.

- [ ] **Step 1: Write the store contract test**

```js
test("deduplicates assets per post and lists only old draft orphans", async () => {
  const first = await store.createDraftAsset(asset({ id: "a1", postId: "p1", sha256: "same" }));
  assert.equal((await store.findByPostAndHash("p1", "same")).id, first.id);
  await assert.rejects(() => store.createDraftAsset(asset({ id: "a2", postId: "p1", sha256: "same" })));
  assert.deepEqual((await store.listOrphansBefore("2026-06-29T00:00:00.000Z")).map((item) => item.id), ["a1"]);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/asset-store-contract.test.mjs`

Expected: FAIL because the asset store modules do not exist.

- [ ] **Step 3: Add schema and interfaces**

Add `blogAssets` to `db/schema.ts` with the exact columns from the approved design and indexes:

```ts
export const blogAssets = sqliteTable("blog_assets", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  objectKey: text("object_key").notNull(),
  originalName: text("original_name").notNull(),
  safeName: text("safe_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(),
  visibility: text("visibility").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("blog_assets_object_key_uq").on(table.objectKey),
  uniqueIndex("blog_assets_post_hash_uq").on(table.postId, table.sha256),
  index("blog_assets_visibility_created_idx").on(table.visibility, table.createdAt),
]);
```

Set `"r2": "BLOG_ASSETS"` in hosting metadata and add `BLOG_ASSETS: R2Bucket` to the worker environment.

- [ ] **Step 4: Generate and inspect the migration**

Run: `npm run db:generate`

Expected: one new migration containing `CREATE TABLE blog_assets` and all three indexes; no destructive statement affecting existing post tables.

- [ ] **Step 5: Implement memory and D1 stores**

`D1BlogAssetStore` must import `env` from `cloudflare:workers`, keep D1 access in a private helper, and never store bytes in D1. `listOrphansBefore(cutoff)` returns only `visibility='draft'` rows older than cutoff whose `/media/<id>/` reference is absent from current post sections.

- [ ] **Step 6: Run contract and migration tests**

Run: `node --test tests/asset-store-contract.test.mjs tests/blog-store-contract.test.mjs`

Expected: PASS for memory and D1 source contracts.

- [ ] **Step 7: Commit**

```bash
git add .openai/hosting.json worker/index.ts db/schema.ts drizzle lib/blog/asset-store.ts lib/blog/d1-asset-store.ts tests/asset-store-contract.test.mjs tests/blog-store-contract.test.mjs
git commit -m "feat: add durable blog asset storage"
```

---

### Task 4: Validate images and implement owner upload

**Files:**
- Create: `lib/blog/assets.ts`
- Create: `app/api/editor/assets/route.ts`
- Modify: `lib/blog/http.ts`
- Test: `tests/blog-assets.test.mjs`
- Test: `tests/editor-api-source.test.mjs`

**Interfaces:**
- Produces: `validateImageFile(bytes, claimedType, originalName): ValidatedImage`.
- Produces: `safeAssetName(name, contentType): string`.
- Produces: `assetMarkdownUrl(asset): string`.
- Route response: `{ assetId: string; url: string; safeName: string; contentType: string; sizeBytes: number }`.

- [ ] **Step 1: Write failing validation and route tests**

```js
test("accepts real png bytes and rejects svg or spoofed jpeg", () => {
  assert.equal(validateImageFile(pngBytes, "image/png", "figure.png").contentType, "image/png");
  assert.throws(() => validateImageFile(svgBytes, "image/svg+xml", "x.svg"), /不支持/);
  assert.throws(() => validateImageFile(svgBytes, "image/jpeg", "x.jpg"), /文件内容与格式不一致/);
});

test("asset upload route requires owner auth and multipart postId/file", async () => {
  assert.match(routeSource, /assertBlogOwner/);
  assert.match(routeSource, /formData\(\)/);
  assert.match(routeSource, /postId/);
  assert.match(routeSource, /file/);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/blog-assets.test.mjs tests/editor-api-source.test.mjs`

Expected: FAIL because validation and upload route are absent.

- [ ] **Step 3: Implement exact validation**

Use byte signatures:

- PNG: `89 50 4e 47 0d 0a 1a 0a`
- JPEG: starts `ff d8 ff`
- GIF: ASCII `GIF87a` or `GIF89a`
- WebP: ASCII `RIFF` at 0 and `WEBP` at 8

Reject zero bytes and payloads above `10 * 1024 * 1024`. Generate SHA-256 with `crypto.subtle.digest("SHA-256", bytes)`. Normalize the filename to lowercase ASCII letters, digits and hyphens, append the validated extension, and fall back to `image.<ext>`.

- [ ] **Step 4: Implement upload orchestration**

The route must:

1. call `assertBlogOwner()`;
2. parse `formData()`;
3. verify `postId` references an existing draft;
4. validate bytes before storage;
5. return an existing per-post SHA match when present;
6. write `blog/<postId>/<yyyy-mm>/<uuid>.<ext>` to R2;
7. insert D1 metadata;
8. delete the R2 object if metadata insertion throws;
9. map validation errors through the existing JSON error shape.

- [ ] **Step 5: Run route and unit tests**

Run: `node --test tests/blog-assets.test.mjs tests/editor-api-source.test.mjs`

Expected: PASS for formats, 10MB boundary, dedupe, owner auth, rollback and response shape.

- [ ] **Step 6: Commit**

```bash
git add lib/blog/assets.ts lib/blog/http.ts app/api/editor/assets/route.ts tests/blog-assets.test.mjs tests/editor-api-source.test.mjs
git commit -m "feat: upload validated markdown images"
```

---

### Task 5: Serve draft-private and published images

**Files:**
- Create: `app/media/[id]/[name]/route.ts`
- Modify: `lib/blog/d1-asset-store.ts`
- Test: `tests/media-route.test.mjs`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `BlogAssetStore.getById(id)` and R2 `get(objectKey)`.
- Produces: public media route with draft authorization and cache headers.

- [ ] **Step 1: Write failing route behavior tests**

```js
test("draft media requires owner while published media is public", async () => {
  assert.equal((await handle(draftAsset, null)).status, 401);
  assert.equal((await handle(draftAsset, owner)).status, 200);
  const published = await handle(publishedAsset, null);
  assert.equal(published.status, 200);
  assert.match(published.headers.get("cache-control"), /public/);
  assert.equal(published.headers.get("x-content-type-options"), "nosniff");
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/media-route.test.mjs`

Expected: FAIL because the media route does not exist.

- [ ] **Step 3: Implement the media response**

Ignore the supplied filename for lookup; load by asset id, return 404 for an unknown id or missing R2 object, enforce owner auth only for `draft`, and return:

```ts
return new Response(object.body, {
  headers: {
    "content-type": asset.contentType,
    "content-length": String(asset.sizeBytes),
    "cache-control": asset.visibility === "published"
      ? "public, max-age=31536000, immutable"
      : "private, no-store",
    "etag": object.httpEtag,
    "x-content-type-options": "nosniff",
  },
});
```

- [ ] **Step 4: Verify route and article rendering**

Run: `node --test tests/media-route.test.mjs tests/rendered-html.test.mjs`

Expected: PASS, and a published Markdown image renders an `<img src="/media/...">`.

- [ ] **Step 5: Commit**

```bash
git add app/media/[id]/[name]/route.ts lib/blog/d1-asset-store.ts tests/media-route.test.mjs tests/rendered-html.test.mjs
git commit -m "feat: serve private and published blog media"
```

---

### Task 6: Make asset publication part of the publish transaction

**Files:**
- Modify: `lib/blog/markdown-sections.ts`
- Modify: `lib/blog/store.ts`
- Modify: `lib/blog/d1-store.ts`
- Modify: `lib/blog/service.ts`
- Modify: `app/api/editor/posts/[id]/publish/route.ts`
- Test: `tests/blog-assets.test.mjs`
- Test: `tests/blog-service.test.mjs`
- Test: `tests/blog-store-contract.test.mjs`

**Interfaces:**
- Produces: `extractLocalAssetIds(markdown: string): string[]`.
- Changes: `BlogStore.publish(draft, expectedVersion, revisionId, publishedAt, assetIds)`.
- Consumes: asset metadata ownership check before calling store publish.

- [ ] **Step 1: Write failing publication tests**

```js
test("publishing atomically snapshots the post and exposes only referenced owned assets", async () => {
  const published = await service.publishPost("post-1", 2);
  assert.equal(published.revisionId, "revision-1");
  assert.equal((await assets.getById("owned-ref")).visibility, "published");
  assert.equal((await assets.getById("owned-unused")).visibility, "draft");
});

test("rejects foreign or missing local asset ids before creating a revision", async () => {
  await assert.rejects(() => service.publishPost("post-1", 2), /图片不存在或不属于当前文章/);
  assert.equal((await store.listPublished()).length, 0);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/blog-assets.test.mjs tests/blog-service.test.mjs tests/blog-store-contract.test.mjs`

Expected: FAIL because publish does not parse or promote assets.

- [ ] **Step 3: Implement asset extraction and ownership validation**

Recognize only `/media/<uuid>/<name>` URLs outside fenced code and deduplicate ids. Before publishing, load every asset and require `asset.postId === draft.id`.

- [ ] **Step 4: Extend memory and D1 publication**

The D1 `publish` batch must keep existing revision insert, post update and conflict query, and add one prepared update per referenced asset:

```sql
UPDATE blog_assets
SET visibility='published', updated_at=?1
WHERE id=?2 AND post_id=?3
```

After the batch, require each update result to report one changed row. The in-memory store updates the same asset visibility state in its test double. Do not demote assets when a later draft removes a reference.

- [ ] **Step 5: Verify race and rollback behavior**

Run: `node --test tests/blog-assets.test.mjs tests/blog-service.test.mjs tests/blog-store-contract.test.mjs`

Expected: PASS; stale publish, foreign asset and slug conflict leave both the revision set and asset visibility unchanged.

- [ ] **Step 6: Commit**

```bash
git add lib/blog/markdown-sections.ts lib/blog/store.ts lib/blog/d1-store.ts lib/blog/service.ts app/api/editor/posts/[id]/publish/route.ts tests/blog-assets.test.mjs tests/blog-service.test.mjs tests/blog-store-contract.test.mjs
git commit -m "feat: publish markdown assets atomically"
```

---

### Task 7: Build the unified Markdown module editor

**Files:**
- Create: `components/editor/markdown-editing.ts`
- Create: `components/editor/markdown-section-editor.tsx`
- Modify: `components/editor/section-editor.tsx`
- Modify: `components/editor/add-section-drawer.tsx`
- Modify: `components/editor/editor-types.ts`
- Modify: `components/editor/structured-editor.tsx`
- Modify: `app/globals.css`
- Test: `tests/markdown-editing.test.mjs`
- Test: `tests/editor-source.test.mjs`
- Test: `tests/editor-responsive.test.mjs`

**Interfaces:**
- Produces: `insertAtSelection(source, start, end, insertion): EditResult`.
- Produces: `wrapSelection(source, start, end, before, after): EditResult`.
- Produces component props: `{ section, postId, posts, onChange, onUploadStateChange }`.
- Upload state: `{ pending: number; failures: Array<{ fileName: string; message: string }> }`.

- [ ] **Step 1: Write failing editing and source tests**

```js
test("inserts uploaded image markdown at the captured selection", () => {
  assert.deepEqual(insertAtSelection("前后", 1, 1, "![图](/media/a/figure.png)"), {
    value: "前![图](/media/a/figure.png)后",
    selectionStart: 26,
    selectionEnd: 26,
  });
});

test("editor exposes one markdown textarea for every section", async () => {
  assert.doesNotMatch(sectionSource, /section.kind === "checklist"|section.kind === "relation"/);
  assert.match(sectionSource, /MarkdownSectionEditor/);
  assert.match(markdownEditorSource, /onPaste/);
  assert.match(markdownEditorSource, /accept="image\/png,image\/jpeg,image\/webp,image\/gif"/);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/markdown-editing.test.mjs tests/editor-source.test.mjs tests/editor-responsive.test.mjs`

Expected: FAIL because the Markdown editor modules do not exist.

- [ ] **Step 3: Implement pure cursor helpers**

`EditResult` contains `value`, `selectionStart`, and `selectionEnd`. `wrapSelection` selects the original text after wrapping when selection is nonempty; otherwise it places the caret between delimiters.

- [ ] **Step 4: Implement the Markdown section component**

The component must:

- keep a textarea ref and capture `selectionStart/selectionEnd` before upload;
- render buttons for heading, bold, link, image, formula, code, task and relation;
- preserve focus after toolbar insertion;
- detect image clipboard items in `onPaste`;
- upload one file per request using `FormData`;
- use `URL.createObjectURL` only for component-local temporary preview and revoke it on completion/unmount;
- insert final `![alt](url)` only after a successful response;
- show pending, failure and retry UI beside the module;
- announce status through `aria-live="polite"`.

- [ ] **Step 5: Guard uploads against article switches**

In `StructuredEditor`, store `activePostId` and a per-post upload generation. An upload completion may call `onChange` only when both captured post id and generation still match. `publish()` returns early with “请先等待图片上传完成或处理失败项” when pending/failure state exists.

- [ ] **Step 6: Make new and reusable modules Markdown**

Remove the kind selector from `AddSectionDrawer`; create every new section with `kind: "markdown"`. Saving a common module stores `kind: "markdown"` while preserving title, `standardKey`, and position.

- [ ] **Step 7: Add responsive and accessible styles**

Use a horizontally scrollable toolbar on mobile, 44px minimum controls, visible focus, a minimum 180px textarea, no fixed height, and a compact upload queue. Do not animate the textarea or change focus during autosave.

- [ ] **Step 8: Run focused editor tests**

Run: `node --test tests/markdown-editing.test.mjs tests/editor-source.test.mjs tests/editor-responsive.test.mjs`

Expected: PASS for paste, file input, toolbar, article-switch guard, publish wait, accessibility and responsive rules.

- [ ] **Step 9: Commit**

```bash
git add components/editor/markdown-editing.ts components/editor/markdown-section-editor.tsx components/editor/section-editor.tsx components/editor/add-section-drawer.tsx components/editor/editor-types.ts components/editor/structured-editor.tsx app/globals.css tests/markdown-editing.test.mjs tests/editor-source.test.mjs tests/editor-responsive.test.mjs
git commit -m "feat: edit every content module as markdown"
```

---

### Task 8: Preserve Markdown, LaTeX, images and warnings through import/export

**Files:**
- Modify: `lib/blog/markdown.ts`
- Create: `components/markdown-renderer.tsx`
- Modify: `components/editor/article-preview.tsx`
- Modify: `components/markdown-article.tsx`
- Test: `tests/markdown-roundtrip.test.mjs`
- Test: `tests/rendered-html.test.mjs`

**Interfaces:**
- Consumes: `normalizeMarkdownPost`, `extractWikiRelations`, stable media URLs.
- Produces import warnings for relative image paths.

- [ ] **Step 1: Write failing round-trip tests**

```js
test("round-trips task lists, wiki links, local media, remote media, and latex", () => {
  const body = [
    "- [ ] 复现实验",
    "[[paper-a|相关论文]]",
    "![本地图](/media/11111111-1111-4111-8111-111111111111/figure.png)",
    "![远程图](https://example.com/a.png)",
    "$$x^2+y^2=1$$",
  ].join("\n\n");
  const imported = importPostMarkdown(exportPostMarkdown(postWith(body)), options);
  assert.equal(imported.draft.sections[0].content, body);
});

test("warns but preserves unresolved relative image paths", () => {
  const result = importPostMarkdown(markdownWith("![图](./assets/a.png)"), options);
  assert.match(result.warnings.join("；"), /本地图片路径/);
  assert.match(result.draft.sections[0].content, /\.\/assets\/a\.png/);
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test tests/markdown-roundtrip.test.mjs tests/rendered-html.test.mjs`

Expected: FAIL for relative-image warning or canonical Markdown normalization.

- [ ] **Step 3: Preserve syntax and add warnings**

Do not rewrite Markdown bodies during import/export beyond heading separation and legacy conversion. Scan image destinations; add one warning per distinct relative path while leaving text unchanged. Continue to reject raw HTML by not enabling `rehype-raw`.

- [ ] **Step 4: Share render configuration**

Create `components/markdown-renderer.tsx` with a `MarkdownRenderer({ source, className })` component. It must render `ReactMarkdown` with `remarkGfm`, `remarkMath`, and `rehypeKatex({ throwOnError: false, strict: false })`. Replace the duplicate renderer configuration in both editor preview and public article with this component.

- [ ] **Step 5: Run round-trip and rendering tests**

Run: `node --test tests/markdown-roundtrip.test.mjs tests/rendered-html.test.mjs`

Expected: PASS for GFM, KaTeX, local/remote images, wiki text preservation and raw HTML escaping.

- [ ] **Step 6: Commit**

```bash
git add lib/blog/markdown.ts components/markdown-renderer.tsx components/editor/article-preview.tsx components/markdown-article.tsx tests/markdown-roundtrip.test.mjs tests/rendered-html.test.mjs
git commit -m "feat: preserve rich markdown across editor flows"
```

---

### Task 9: Full regression, browser QA and Sites publication

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-29-markdown-assets-editor.md`
- Test: `tests/*.test.mjs`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified migration, build, responsive interaction evidence and a deployed Sites version.

- [ ] **Step 1: Document the user workflow**

Add concise instructions covering: create article, write Markdown per module, paste/select images, insert LaTeX, wait for upload/save, publish, export Markdown, and the warning for Obsidian-relative attachments.

- [ ] **Step 2: Run static verification**

Run: `npm run lint`

Expected: exit 0 with no ESLint errors.

- [ ] **Step 3: Run build and the complete test suite**

Run: `npm test`

Expected: build succeeds; every existing and new Node test passes with zero failures.

- [ ] **Step 4: Inspect migration and hosting metadata**

Run: `npm run db:generate`

Expected: no additional migration after the committed `blog_assets` migration.

Run: `rg -n '"d1": "DB"|"r2": "BLOG_ASSETS"' .openai/hosting.json`

Expected: both logical bindings are present exactly once.

- [ ] **Step 5: Browser-verify desktop, tablet and mobile**

At 1440×960, 834×1112 and 390×844 verify:

1. create or open a draft;
2. paste a PNG into a Markdown module;
3. confirm upload status and final Markdown URL;
4. insert a block formula and see KaTeX preview;
5. refresh and confirm Markdown/image persistence;
6. select a JPEG from the file chooser;
7. publish and open the public image in a signed-out context;
8. confirm no horizontal page overflow and all toolbar actions remain reachable.

Expected: identical rendered content across editor preview and published article; draft media is not public before publication.

- [ ] **Step 6: Re-run critical race tests after browser QA**

Run: `node --test tests/editor-source.test.mjs tests/blog-assets.test.mjs tests/blog-service.test.mjs`

Expected: zero failures for upload/article-switch, queued autosave and publish version chaining.

- [ ] **Step 7: Update plan completion evidence and commit**

Record exact lint/test counts, viewport outcomes, migration filename and deployed version in the bottom of this plan, then:

```bash
git add README.md docs/superpowers/plans/2026-07-29-markdown-assets-editor.md
git commit -m "docs: verify markdown asset publishing workflow"
```

- [ ] **Step 8: Publish through Sites**

Package the exact tested commit, save one Sites version, deploy it to the existing project, and poll until `status: "succeeded"`.

Expected: the existing production URL serves the new editor and media route; do not report completion from a local build or pending deployment.
