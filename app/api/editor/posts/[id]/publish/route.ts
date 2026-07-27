import { assertBlogOwner } from "@/app/chatgpt-auth.ts";
import {
  createEditorBlogService,
  readJsonRecord,
  requireExpectedVersion,
  withOwnerJson,
} from "@/lib/blog/http.ts";

type RouteContext = { params: Promise<{ id: string }> };

const getService = createEditorBlogService;
const owner = () => assertBlogOwner();

export async function POST(request: Request, { params }: RouteContext) {
  return withOwnerJson(async () => {
    const { id } = await params;
    const payload = await readJsonRecord(request);
    const expectedVersion = requireExpectedVersion(payload);
    const service = await getService();
    return { post: await service.publishPost(id, expectedVersion) };
  }, owner);
}
