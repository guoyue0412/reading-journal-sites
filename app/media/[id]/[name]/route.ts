import { getChatGPTUser, isBlogOwner } from "@/app/chatgpt-auth.ts";

type Context={params:Promise<{id:string;name:string}>};
export async function GET(_request:Request,{params}:Context){
  const {D1BlogAssetStore,blogAssetBucket}=await import("@/lib/blog/d1-asset-store.ts");
  const {id}=await params, asset=await new D1BlogAssetStore().getById(id);
  if(!asset)return new Response("Not found",{status:404});
  if(asset.visibility!=="published"){
    const user=await getChatGPTUser();
    if(!user||!isBlogOwner(user.email,process.env.BLOG_OWNER_EMAIL))return new Response("Not found",{status:404});
  }
  const object=await blogAssetBucket().get(asset.objectKey);
  if(!object)return new Response("Not found",{status:404});
  const headers=new Headers({"content-type":asset.contentType,"content-length":String(asset.sizeBytes),"x-content-type-options":"nosniff","cache-control":asset.visibility==="published"?"public, max-age=31536000, immutable":"private, no-store"});
  if(object.httpEtag)headers.set("etag",object.httpEtag);
  return new Response(object.body,{headers});
}
