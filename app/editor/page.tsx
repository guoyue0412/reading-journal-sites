import { requireBlogOwner } from "@/app/chatgpt-auth";
import { StructuredEditor } from "@/components/editor/structured-editor";
import { SiteShell } from "@/components/site-shell";
import type { PostType, SectionTemplate } from "@/lib/blog/types";

export const dynamic = "force-dynamic";

const postTypes: PostType[] = ["jobs", "internship", "papers", "reflections"];

export default async function EditorPage() {
  const owner = await requireBlogOwner("/editor");
  const [{ D1BlogStore }, { ensureLegacyContentImported }] = await Promise.all([
    import("@/lib/blog/d1-store"),
    import("@/lib/blog/bootstrap"),
  ]);
  const store = new D1BlogStore();
  await ensureLegacyContentImported(store);
  const [posts, templateGroups] = await Promise.all([
    store.listDrafts(),
    Promise.all(postTypes.map((type) => store.listTemplates(type))),
  ]);
  const templates: SectionTemplate[] = templateGroups.flat();

  return (
    <SiteShell>
      <section className="editor-heading">
        <p className="eyebrow">WRITING STUDIO</p>
        <h1>郭跃的写作工作台</h1>
        <p>结构化写作、实时预览、Markdown 双向流转；只有明确点击发布后内容才会公开。</p>
      </section>
      <StructuredEditor
        initialPosts={posts}
        initialTemplates={templates}
        ownerName={owner.displayName}
      />
    </SiteShell>
  );
}
