import { assertBlogOwner } from "@/app/chatgpt-auth.ts";
import {
  createEditorBlogService,
  requireDraftRecord,
  readJsonRecord,
  requireExpectedVersion,
  requireStringField,
  withOwnerJson,
} from "@/lib/blog/http.ts";
import { BlogValidationError } from "@/lib/blog/service.ts";
import type { BlogPostDraft } from "@/lib/blog/types.ts";

type RouteContext = { params: Promise<{ id: string }> };

const getService = createEditorBlogService;
const owner = () => assertBlogOwner();

export async function GET(_request: Request, { params }: RouteContext) {
  return withOwnerJson(async () => {
    const { id } = await params;
    const service = await getService();
    return { post: await service.loadPost(id) };
  }, owner);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return withOwnerJson(async () => {
    const { id } = await params;
    const payload = await readJsonRecord(request);
    const draft = requireDraftRecord(payload.draft);
    const draftId = requireStringField(draft, "id", "文章 ID 不能为空");
    const expectedVersion = requireExpectedVersion(payload);
    if (draftId !== id) {
      throw new BlogValidationError(["文章 ID 不一致"]);
    }
    const service = await getService();
    return { post: await service.saveDraft(draft as BlogPostDraft, expectedVersion) };
  }, owner);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return withOwnerJson(async () => {
    const { id } = await params;
    const service = await getService();
    await service.deletePost(id);
    return { ok: true };
  }, owner);
}
