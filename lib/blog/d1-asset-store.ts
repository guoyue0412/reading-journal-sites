import { env } from "cloudflare:workers";
import type { BlogAsset, BlogAssetStore } from "./asset-store.ts";

type Row = { id:string; post_id:string; object_key:string; original_name:string; safe_name:string; content_type:string; size_bytes:number; sha256:string; visibility:"draft"|"published"; created_at:string; updated_at:string };
const map = (r: Row): BlogAsset => ({ id:r.id, postId:r.post_id, objectKey:r.object_key, originalName:r.original_name, safeName:r.safe_name, contentType:r.content_type, sizeBytes:r.size_bytes, sha256:r.sha256, visibility:r.visibility, createdAt:r.created_at, updatedAt:r.updated_at });
const columns = "id, post_id, object_key, original_name, safe_name, content_type, size_bytes, sha256, visibility, created_at, updated_at";

export class D1BlogAssetStore implements BlogAssetStore {
  #db() { return (env as unknown as { DB:D1Database }).DB; }
  async findByPostAndHash(postId:string, sha256:string) { const r=await this.#db().prepare(`SELECT ${columns} FROM blog_assets WHERE post_id=?1 AND sha256=?2`).bind(postId,sha256).first<Row>(); return r?map(r):null; }
  async createDraftAsset(a:BlogAsset) { await this.#db().prepare("INSERT INTO blog_assets (id,post_id,object_key,original_name,safe_name,content_type,size_bytes,sha256,visibility,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)").bind(a.id,a.postId,a.objectKey,a.originalName,a.safeName,a.contentType,a.sizeBytes,a.sha256,a.visibility,a.createdAt,a.updatedAt).run(); return structuredClone(a); }
  async createDraftAlias(sourceAssetId:string,input:{id:string;postId:string;now:string}) {
    const result=await this.#db().prepare("INSERT INTO blog_assets (id,post_id,object_key,original_name,safe_name,content_type,size_bytes,sha256,visibility,created_at,updated_at) SELECT ?1,?2,object_key,original_name,safe_name,content_type,size_bytes,sha256,'draft',?3,?3 FROM blog_assets WHERE id=?4").bind(input.id,input.postId,input.now,sourceAssetId).run();
    if(result.meta.changes!==1)throw new Error("图片不存在");
    const alias=await this.getById(input.id);
    if(!alias)throw new Error("图片别名创建失败");
    return alias;
  }
  async getById(id:string) { const r=await this.#db().prepare(`SELECT ${columns} FROM blog_assets WHERE id=?1`).bind(id).first<Row>(); return r?map(r):null; }
  async listByPost(postId:string) { const r=await this.#db().prepare(`SELECT ${columns} FROM blog_assets WHERE post_id=?1 ORDER BY created_at`).bind(postId).all<Row>(); return r.results.map(map); }
  async markPublished(postId:string, ids:string[], now:string) { if(!ids.length)return; const qs=ids.map(()=>"?").join(","); const owned=await this.#db().prepare(`SELECT COUNT(*) AS n FROM blog_assets WHERE post_id=?1 AND id IN (${qs})`).bind(postId,...ids).first<{n:number}>(); if(Number(owned?.n)!==new Set(ids).size) throw new Error("图片不存在或不属于当前文章"); await this.#db().prepare(`UPDATE blog_assets SET visibility='published',updated_at=?1 WHERE post_id=?2 AND id IN (${qs})`).bind(now,postId,...ids).run(); }
  async deleteMetadata(id:string) { await this.#db().prepare("DELETE FROM blog_assets WHERE id=?1").bind(id).run(); }
}

export function blogAssetBucket(): R2Bucket { return (env as unknown as { BLOG_ASSETS:R2Bucket }).BLOG_ASSETS; }
