import { assertBlogOwner } from "@/app/owner-auth.ts";
import {
  createEditorBlogService,
  readJsonRecord,
  requirePostType,
  requireSectionTemplateRecord,
  requireScopedTemplatePostType,
  requireStringField,
  withOwnerJson,
} from "@/lib/blog/http.ts";
import {
  BlogNotFoundError,
  BlogValidationError,
  type BlogService,
} from "@/lib/blog/service.ts";
import type { PostType, SectionTemplate } from "@/lib/blog/types.ts";

type RouteContext = { params: Promise<{ id: string }> };

const getService = createEditorBlogService;
const owner = () => assertBlogOwner();

async function loadTemplate(
  service: BlogService,
  id: string,
  type: PostType,
): Promise<SectionTemplate> {
  const template = (await service.listTemplates(type)).find((item) => item.id === id);
  if (!template) {
    throw new BlogNotFoundError();
  }
  return template;
}

export async function GET(request: Request, { params }: RouteContext) {
  return withOwnerJson(async () => {
    const { id } = await params;
    const type = requirePostType(new URL(request.url).searchParams.get("type"));
    const service = await getService();
    return { template: await loadTemplate(service, id, type) };
  }, owner);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  return withOwnerJson(async () => {
    const { id } = await params;
    const type = requirePostType(new URL(request.url).searchParams.get("type"));
    const payload = await readJsonRecord(request);
    const templateRecord = requireSectionTemplateRecord(payload);
    const templateId = requireStringField(templateRecord, "id", "模板 ID 不能为空");
    if (templateId !== id) {
      throw new BlogValidationError(["模板 ID 不一致"]);
    }
    requireScopedTemplatePostType(
      requireStringField(templateRecord, "postType", "文章类型不能为空"),
      type,
    );
    const template = templateRecord as unknown as SectionTemplate;
    const service = await getService();
    await loadTemplate(service, id, type);
    return { template: await service.saveTemplate(template) };
  }, owner);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  return withOwnerJson(async () => {
    const { id } = await params;
    const type = requirePostType(new URL(request.url).searchParams.get("type"));
    const service = await getService();
    await loadTemplate(service, id, type);
    await service.disableTemplate(id);
    return { ok: true };
  }, owner);
}
