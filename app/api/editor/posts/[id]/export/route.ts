import { assertBlogOwner } from "@/app/owner-auth.ts";
import { createEditorBlogService, withOwnerResponse } from "@/lib/blog/http.ts";

type RouteContext = { params: Promise<{ id: string }> };

const getService = createEditorBlogService;
const owner = () => assertBlogOwner();

function markdownFilename(slug: string): string {
  const safeSlug = slug
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safeSlug || "post"}.md`;
}

export async function GET(_request: Request, { params }: RouteContext) {
  return withOwnerResponse(async () => {
    const { id } = await params;
    const service = await getService();
    const post = await service.loadPost(id);
    const markdown = await service.exportPost(id);
    return new Response(markdown, {
      headers: {
        "Content-Disposition": `attachment; filename="${markdownFilename(post.slug)}"`,
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }, owner);
}
