import assert from "node:assert/strict";
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
