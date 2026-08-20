import { assertBlogOwner } from "@/app/owner-auth.ts";
import {
  createEditorBlogService,
  readOptionalBooleanField,
  readJsonRecord,
  requireStringField,
  withOwnerJson,
} from "@/lib/blog/http.ts";
import { assertSameOrigin } from "@/lib/blog/csrf.ts";

const getService = createEditorBlogService;
const owner = () => assertBlogOwner();

export async function POST(request: Request) {
  return withOwnerJson(async () => {
    assertSameOrigin(request);
    const payload = await readJsonRecord(request);
    const markdown = requireStringField(payload, "markdown", "Markdown 内容必须是字符串");
    const create = readOptionalBooleanField(payload, "create", "导入创建标记必须是布尔值");
    const service = await getService();
    return create ? service.createImportedPost(markdown) : service.previewImport(markdown);
  }, owner);
}
