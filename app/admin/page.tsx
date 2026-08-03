import Link from "next/link";
import { requireBlogOwner } from "@/app/chatgpt-auth";
import { AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const owner = await requireBlogOwner("/admin");
  const { D1BlogStore } = await import("@/lib/blog/d1-store");
  const { ensureLegacyContentImported } = await import("@/lib/blog/bootstrap");
  const store = new D1BlogStore();
  await ensureLegacyContentImported(store);
  const posts = await store.listDrafts();
  const published = posts.filter((post) => post.status === "published").length;
  return <AdminShell><p className="eyebrow">CONTENT WORKSPACE</p><h1>欢迎回来，{owner.displayName}</h1><div className="admin-stats"><article><strong>{published}</strong><span>已发布文章</span></article><article><strong>{posts.length - published}</strong><span>草稿</span></article></div><Link className="admin-action" href="/admin/posts">管理文章</Link></AdminShell>;
}
