export type AssetVisibility = "draft" | "published";

export interface BlogAsset {
  id: string;
  postId: string;
  objectKey: string;
  originalName: string;
  safeName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  visibility: AssetVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface BlogAssetStore {
  findByPostAndHash(postId: string, sha256: string): Promise<BlogAsset | null>;
  createDraftAsset(asset: BlogAsset): Promise<BlogAsset>;
  createDraftAlias(sourceAssetId: string, input: { id: string; postId: string; now: string }): Promise<BlogAsset>;
  getById(id: string): Promise<BlogAsset | null>;
  listByPost(postId: string): Promise<BlogAsset[]>;
  markPublished(postId: string, assetIds: string[], now: string): Promise<void>;
  deleteMetadata(id: string): Promise<void>;
}

const clone = <T>(value: T): T => structuredClone(value);

export class MemoryBlogAssetStore implements BlogAssetStore {
  readonly #assets = new Map<string, BlogAsset>();

  async findByPostAndHash(postId: string, sha256: string) {
    const asset = [...this.#assets.values()].find((item) => item.postId === postId && item.sha256 === sha256);
    return asset ? clone(asset) : null;
  }
  async createDraftAsset(asset: BlogAsset) {
    if (await this.findByPostAndHash(asset.postId, asset.sha256)) throw new Error("重复图片");
    this.#assets.set(asset.id, clone(asset));
    return clone(asset);
  }
  async createDraftAlias(sourceAssetId: string, input: { id: string; postId: string; now: string }) {
    const source = this.#assets.get(sourceAssetId);
    if (!source) throw new Error("图片不存在");
    return this.createDraftAsset({
      ...source,
      id: input.id,
      postId: input.postId,
      visibility: "draft",
      createdAt: input.now,
      updatedAt: input.now,
    });
  }
  async getById(id: string) {
    const asset = this.#assets.get(id);
    return asset ? clone(asset) : null;
  }
  async listByPost(postId: string) {
    return [...this.#assets.values()].filter((asset) => asset.postId === postId).map(clone);
  }
  async markPublished(postId: string, assetIds: string[], now: string) {
    for (const id of assetIds) {
      const asset = this.#assets.get(id);
      if (!asset || asset.postId !== postId) throw new Error("图片不存在或不属于当前文章");
    }
    for (const id of assetIds) this.#assets.set(id, { ...this.#assets.get(id)!, visibility: "published", updatedAt: now });
  }
  async deleteMetadata(id: string) { this.#assets.delete(id); }
}
