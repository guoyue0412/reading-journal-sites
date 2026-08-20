import { requireBlogOwner } from "@/app/owner-auth";
import { AdminShell } from "@/components/admin-shell";
import { StructuredEditor } from "@/components/editor/structured-editor";
import type { PostType, SectionTemplate } from "@/lib/blog/types";

export const dynamic = "force-dynamic";
const postTypes: PostType[] = ["jobs", "internship", "papers", "reflections"];

export default async function AdminPostsPage() {
  const owner = await requireBlogOwner("/admin/posts");
  const [{ D1BlogStore }, { ensureLegacyContentImported }, { createEditorBlogService }] = await Promise.all([
    import("@/lib/blog/d1-store"),
    import("@/lib/blog/bootstrap"),
    import("@/lib/blog/http"),
  ]);
  const store = new D1BlogStore();
  await ensureLegacyContentImported(store);
  const service = await createEditorBlogService();
  const [posts, groups] = await Promise.all([service.listPosts(), Promise.all(postTypes.map((type) => service.listTemplates(type)))]);
  return <AdminShell><header className="admin-copy"><p className="eyebrow">PUBLISHING</p><h1>文章管理</h1><p>草稿、发布、删除、模板和图片管理都在这个后台完成。</p></header><StructuredEditor initialPosts={posts} initialTemplates={groups.flat() as SectionTemplate[]} ownerName={owner.displayName} /></AdminShell>;
}
