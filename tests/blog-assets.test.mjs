import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MemoryBlogAssetStore } from "../lib/blog/asset-store.ts";
import { assetMarkdownUrl, validateImageFile } from "../lib/blog/assets.ts";

const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
const jpeg = Uint8Array.from([0xff,0xd8,0xff,0xe0,0,0]);
const svg = new TextEncoder().encode("<svg><script>alert(1)</script></svg>");

test("accepts real png and jpeg bytes and rejects svg or spoofed images", async () => {
  assert.equal((await validateImageFile(png, "image/png", "论文 图.png")).contentType, "image/png");
  assert.equal((await validateImageFile(jpeg, "image/jpeg", "photo.jpg")).extension, "jpg");
  await assert.rejects(() => validateImageFile(svg, "image/svg+xml", "x.svg"), /不支持/);
  await assert.rejects(() => validateImageFile(svg, "image/jpeg", "x.jpg"), /文件内容与格式不一致/);
});

test("asset metadata deduplicates per post and promotes only owned ids", async () => {
  const store = new MemoryBlogAssetStore();
  const asset = {
    id: "11111111-1111-4111-8111-111111111111", postId: "post-1", objectKey: "blog/post-1/a.png",
    originalName: "a.png", safeName: "a.png", contentType: "image/png", sizeBytes: 12, sha256: "abc",
    visibility: "draft", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
  };
  await store.createDraftAsset(asset);
  assert.equal((await store.findByPostAndHash("post-1", "abc"))?.id, asset.id);
  await assert.rejects(() => store.createDraftAsset({ ...asset, id: "other" }), /重复/);
  await store.markPublished("post-1", [asset.id], "2026-07-29T00:00:00.000Z");
  assert.equal((await store.getById(asset.id))?.visibility, "published");
  await assert.rejects(() => store.markPublished("post-2", [asset.id], "2026-07-29T00:00:00.000Z"), /不属于/);
});

test("builds stable markdown media urls", () => {
  assert.equal(assetMarkdownUrl({ id: "asset-id", safeName: "figure.png" }), "/media/asset-id/figure.png");
});

test("asset stores clone draft aliases without changing the source object metadata", async () => {
  const store = new MemoryBlogAssetStore();
  const source = {
    id: "11111111-1111-4111-8111-111111111111", postId: "source-post", objectKey: "posts/source-post/original.png",
    originalName: "original.png", safeName: "original.png", contentType: "image/png", sizeBytes: 12, sha256: "alias-hash",
    visibility: "draft", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
  };
  await store.createDraftAsset(source);

  const alias = await store.createDraftAlias(source.id, {
    id: "22222222-2222-4222-8222-222222222222",
    postId: "imported-post",
    now: "2026-07-02T00:00:00.000Z",
  });

  assert.deepEqual(alias, {
    ...source,
    id: "22222222-2222-4222-8222-222222222222",
    postId: "imported-post",
    visibility: "draft",
    createdAt: "2026-07-02T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
  });
  assert.deepEqual(await store.getById(source.id), source);
  await assert.rejects(
    () => store.createDraftAlias(source.id, {
      id: source.id,
      postId: "self-alias-post",
      now: "2026-07-03T00:00:00.000Z",
    }),
    /已存在/,
  );
  await assert.rejects(
    () => store.createDraftAlias(source.id, {
      id: alias.id,
      postId: "duplicate-alias-post",
      now: "2026-07-03T00:00:00.000Z",
    }),
    /已存在/,
  );
  assert.deepEqual(await store.getById(source.id), source);
  assert.deepEqual(await store.getById(alias.id), alias);
  await assert.rejects(
    () => store.createDraftAlias("missing", { id: "alias-missing", postId: "imported-post", now: "2026-07-02T00:00:00.000Z" }),
    /图片不存在/,
  );
});

test("D1 asset aliases use one metadata INSERT SELECT and retain the immutable object key", async () => {
  const source = await readFile(new URL("../lib/blog/d1-asset-store.ts", import.meta.url), "utf8");
  const method = source.slice(source.indexOf("async createDraftAlias"), source.indexOf("async getById"));

  assert.match(method, /INSERT INTO blog_assets/);
  assert.match(method, /SELECT/);
  assert.match(method, /object_key/);
  assert.match(method, /'draft'/);
  assert.match(method, /meta\.changes/);
});
