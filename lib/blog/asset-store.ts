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

export interface DraftAssetAliasInput {
  sourceAssetId: string;
  id: string;
  postId: string;
  now: string;
}

export interface BlogAssetStore {
  findByPostAndHash(postId: string, sha256: string): Promise<BlogAsset | null>;
  createDraftAsset(asset: BlogAsset): Promise<BlogAsset>;
  createDraftAlias(sourceAssetId: string, input: Omit<DraftAssetAliasInput, "sourceAssetId">): Promise<BlogAsset>;
  createDraftAliases(inputs: readonly DraftAssetAliasInput[]): Promise<BlogAsset[]>;
  getById(id: string): Promise<BlogAsset | null>;
  listByPost(postId: string): Promise<BlogAsset[]>;
  markPublished(postId: string, assetIds: string[], now: string): Promise<void>;
  deleteMetadata(id: string): Promise<void>;
}

const clone = <T>(value: T): T => structuredClone(value);

export class MemoryBlogAssetStore implements BlogAssetStore {
  #assets = new Map<string, BlogAsset>();

  async findByPostAndHash(postId: string, sha256: string) {
    const asset = [...this.#assets.values()].find((item) => item.postId === postId && item.sha256 === sha256);
    return asset ? clone(asset) : null;
  }
  async createDraftAsset(asset: BlogAsset) {
    if (await this.findByPostAndHash(asset.postId, asset.sha256)) throw new Error("重复图片");
    this.#assets.set(asset.id, clone(asset));
    return clone(asset);
  }
  async createDraftAlias(sourceAssetId: string, input: Omit<DraftAssetAliasInput, "sourceAssetId">) {
    return (await this.createDraftAliases([{ sourceAssetId, ...input }]))[0];
  }
  async createDraftAliases(inputs: readonly DraftAssetAliasInput[]) {
    const next = new Map(this.#assets);
    const aliases: BlogAsset[] = [];
    for (const input of inputs) {
      const source = next.get(input.sourceAssetId);
      if (!source) throw new Error("图片不存在");
      if ([...next.values()].some((asset) => asset.postId === input.postId && asset.sha256 === source.sha256)) {
        throw new Error("重复图片");
      }
      const alias = {
        ...source,
        id: input.id,
        postId: input.postId,
        visibility: "draft" as const,
        createdAt: input.now,
        updatedAt: input.now,
      };
      next.set(alias.id, alias);
      aliases.push(alias);
    }
    this.#assets = next;
    return aliases.map(clone);
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
