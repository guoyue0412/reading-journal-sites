import { assertBlogOwner } from "@/app/chatgpt-auth.ts";
import {
  createEditorBlogService,
  readJsonRecord,
  requireStringField,
  withOwnerJson,
} from "@/lib/blog/http.ts";

const getService = createEditorBlogService;
const owner = () => assertBlogOwner();

export async function POST(request: Request) {
  return withOwnerJson(async () => {
    const payload = await readJsonRecord(request);
    const markdown = requireStringField(payload, "markdown", "Markdown 内容必须是字符串");
    const service = await getService();
    return service.previewImport(markdown);
  }, owner);
}
