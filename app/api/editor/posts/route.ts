import { assertBlogOwner } from "@/app/owner-auth.ts";
import {
  createEditorBlogService,
  readJsonRecord,
  requireStringField,
  withOwnerJson,
} from "@/lib/blog/http.ts";
import type { PostType } from "@/lib/blog/types.ts";

const getService = createEditorBlogService;
const owner = () => assertBlogOwner();

export async function GET() {
  return withOwnerJson(async () => {
    const service = await getService();
    return { posts: await service.listPosts() };
  }, owner);
}

export async function POST(request: Request) {
  return withOwnerJson(async () => {
    const payload = await readJsonRecord(request);
    const input = {
      type: requireStringField(payload, "type", "文章类型不能为空") as PostType,
      date: requireStringField(payload, "date", "日期不能为空"),
    };
    const service = await getService();
    return { post: await service.createPost(input) };
  }, owner);
}
