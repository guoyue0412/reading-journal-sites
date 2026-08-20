import { assertBlogOwner } from "@/app/owner-auth.ts";
import {
  createEditorBlogService,
  requireBlogSectionRecord,
  readJsonRecord,
  requirePostType,
  requireSectionTemplateRecord,
  requireStringField,
  withOwnerJson,
} from "@/lib/blog/http.ts";
import type { BlogSection, SectionTemplate } from "@/lib/blog/types.ts";

const getService = createEditorBlogService;
const owner = () => assertBlogOwner();

export async function GET(request: Request) {
  return withOwnerJson(async () => {
    const type = requirePostType(new URL(request.url).searchParams.get("type"));
    const service = await getService();
    return { templates: await service.listTemplates(type) };
  }, owner);
}

export async function POST(request: Request) {
  return withOwnerJson(async () => {
    const payload = await readJsonRecord(request);
    if ("section" in payload) {
      const section = requireBlogSectionRecord(payload.section);
      const postType = requirePostType(
        requireStringField(payload, "postType", "文章类型不能为空"),
      );
      const service = await getService();
      return {
        template: await service.saveSectionAsTemplate(
          postType,
          section as unknown as BlogSection,
        ),
      };
    }
    const template = requireSectionTemplateRecord(payload);
    const service = await getService();
    return { template: await service.saveTemplate(template as unknown as SectionTemplate) };
  }, owner);
}
