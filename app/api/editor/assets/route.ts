import { assertBlogOwner } from "@/app/chatgpt-auth.ts";
import { assetMarkdownUrl, validateImageFile } from "@/lib/blog/assets.ts";
import { createEditorBlogService } from "@/lib/blog/http.ts";

export async function POST(request: Request) {
  try {
    await assertBlogOwner();
    const { D1BlogAssetStore, blogAssetBucket } = await import("@/lib/blog/d1-asset-store.ts");
    const form = await request.formData();
    const postId = form.get("postId");
    const file = form.get("file");
    if (typeof postId !== "string" || !(file instanceof File)) return Response.json({error:"请选择文章和图片"},{status:400});
    await (await createEditorBlogService()).loadPost(postId);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const valid = await validateImageFile(bytes, file.type, file.name);
    const store = new D1BlogAssetStore();
    const existing = await store.findByPostAndHash(postId, valid.sha256);
    if (existing) return Response.json({assetId:existing.id,url:assetMarkdownUrl(existing),safeName:existing.safeName,contentType:existing.contentType,sizeBytes:existing.sizeBytes});
    const now = new Date().toISOString(), id = crypto.randomUUID(), objectKey = `posts/${postId}/${id}.${valid.extension}`;
    await blogAssetBucket().put(objectKey, bytes, {httpMetadata:{contentType:valid.contentType},customMetadata:{postId,assetId:id}});
    const asset={id,postId,objectKey,originalName:file.name,safeName:valid.safeName,contentType:valid.contentType,sizeBytes:valid.sizeBytes,sha256:valid.sha256,visibility:"draft" as const,createdAt:now,updatedAt:now};
    try { await store.createDraftAsset(asset); } catch (error) { await blogAssetBucket().delete(objectKey); throw error; }
    return Response.json({assetId:id,url:assetMarkdownUrl(asset),safeName:asset.safeName,contentType:asset.contentType,sizeBytes:asset.sizeBytes});
  } catch (error) {
    const e=error as {status?:number;message?:string};
    return Response.json({error:e.message||"图片上传失败"},{status:e.status||400});
  }
}
