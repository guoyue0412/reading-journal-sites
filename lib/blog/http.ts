import { assertBlogOwner, BlogAuthError } from "../../app/chatgpt-auth.ts";
import {
  BlogNotFoundError,
  BlogValidationError,
  createBlogService,
  type BlogService,
} from "./service.ts";
import { SlugConflictError, VersionConflictError } from "./store.ts";
import type { PostType } from "./types.ts";

type OwnerAssertion = () => Promise<unknown>;
type JsonRecord = Record<string, unknown>;
const postTypes: readonly PostType[] = ["jobs", "internship", "papers", "reflections"];
const sectionKinds = ["long_text", "short_text", "checklist", "markdown", "relation"] as const;

export async function createEditorBlogService(): Promise<BlogService> {
  const { D1BlogStore } = await import("./d1-store.ts");
  const { D1BlogAssetStore } = await import("./d1-asset-store.ts");
  return createBlogService(
    new D1BlogStore(),
    () => new Date().toISOString(),
    () => crypto.randomUUID(),
    new D1BlogAssetStore(),
  );
}

export function requireRecord(value: unknown, message: string): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BlogValidationError([message]);
  }
  return value as JsonRecord;
}

export async function readJsonRecord(request: Request): Promise<JsonRecord> {
  try {
    return requireRecord(await request.json(), "请求体必须是 JSON 对象");
  } catch (error) {
    if (error instanceof BlogValidationError) throw error;
    throw new BlogValidationError(["请求体必须是合法 JSON 对象"]);
  }
}

export function requireStringField(
  record: JsonRecord,
  field: string,
  message: string,
): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new BlogValidationError([message]);
  }
  return value;
}

export function readOptionalBooleanField(
  record: JsonRecord,
  field: string,
  message: string,
): boolean {
  const value = record[field];
  if (value === undefined) return false;
  if (typeof value !== "boolean") throw new BlogValidationError([message]);
  return value;
}

function requireNonEmptyStringField(
  record: JsonRecord,
  field: string,
  message: string,
): string {
  const value = requireStringField(record, field, message);
  if (!value.trim()) {
    throw new BlogValidationError([message]);
  }
  return value;
}

function requireArrayField(
  record: JsonRecord,
  field: string,
  message: string,
): unknown[] {
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new BlogValidationError([message]);
  }
  return value;
}

function requireStringArrayField(
  record: JsonRecord,
  field: string,
  message: string,
): string[] {
  const values = requireArrayField(record, field, message);
  if (values.some((value) => typeof value !== "string")) {
    throw new BlogValidationError([message]);
  }
  return values as string[];
}

function requireNonNegativeIntegerField(
  record: JsonRecord,
  field: string,
  message: string,
): number {
  const value = record[field];
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new BlogValidationError([message]);
  }
  return value as number;
}

function requireNullableStringField(
  record: JsonRecord,
  field: string,
  message: string,
): void {
  const value = record[field];
  if (value !== null && typeof value !== "string") {
    throw new BlogValidationError([message]);
  }
}

export function requireBlogSectionRecord(value: unknown): JsonRecord {
  const section = requireRecord(value, "组件内容必须是对象");
  requireNonEmptyStringField(section, "id", "组件 ID 不能为空");
  requireNonEmptyStringField(section, "title", "组件名称不能为空");
  const kind = requireStringField(section, "kind", "组件类型无效");
  if (!sectionKinds.includes(kind as typeof sectionKinds[number])) {
    throw new BlogValidationError(["组件类型无效"]);
  }
  requireStringField(section, "content", "组件内容必须是字符串");
  requireStringArrayField(section, "items", "组件 items 必须是字符串数组");
  requireStringArrayField(section, "relationSlugs", "组件 relationSlugs 必须是字符串数组");
  requireNonNegativeIntegerField(section, "position", "组件 position 必须是非负整数");
  requireNullableStringField(section, "templateId", "组件 templateId 必须是字符串或空值");
  requireNullableStringField(section, "standardKey", "组件 standardKey 必须是字符串或空值");
  return section;
}

export function requireSectionTemplateRecord(value: unknown): JsonRecord {
  const template = requireRecord(value, "模板内容必须是对象");
  requireNonEmptyStringField(template, "id", "模板 ID 不能为空");
  requirePostType(requireStringField(template, "postType", "文章类型不能为空"));
  requireNonEmptyStringField(template, "title", "组件名称不能为空");
  const kind = requireStringField(template, "kind", "组件类型无效");
  if (!sectionKinds.includes(kind as typeof sectionKinds[number])) {
    throw new BlogValidationError(["组件类型无效"]);
  }
  requireNonNegativeIntegerField(template, "position", "模板位置必须是非负整数");
  requireNullableStringField(template, "standardKey", "模板标准键必须是字符串或空值");
  if (typeof template.enabled !== "boolean") {
    throw new BlogValidationError(["模板启用状态必须是布尔值"]);
  }
  return template;
}

export function requireDraftRecord(value: unknown): JsonRecord {
  const draft = requireRecord(value, "草稿内容必须是对象");
  for (const field of ["id", "slug", "type", "title", "date", "summary"]) {
    requireStringField(draft, field, `草稿 ${field} 必须是字符串`);
  }
  requireRecord(draft.metadata, "草稿元数据必须是对象");
  requireArrayField(draft, "tags", "草稿标签必须是数组");
  requireArrayField(draft, "related", "草稿关联必须是数组");
  const sections = requireArrayField(draft, "sections", "草稿组件必须是数组");
  for (const sectionValue of sections) {
    requireBlogSectionRecord(sectionValue);
  }
  return draft;
}

export function requireExpectedVersion(record: JsonRecord): number {
  const value = record.expectedVersion;
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new BlogValidationError(["草稿版本必须是非负整数"]);
  }
  return value as number;
}

export function requirePostType(value: unknown): PostType {
  if (typeof value !== "string" || !postTypes.includes(value as PostType)) {
    throw new BlogValidationError(["文章类型无效"]);
  }
  return value as PostType;
}

export function requireScopedTemplatePostType(
  value: unknown,
  scope: PostType,
): PostType {
  const postType = requirePostType(value);
  if (postType !== scope) {
    throw new BlogValidationError(["模板不能跨文章类型修改"]);
  }
  return postType;
}

function errorResponse(error: unknown): Response {
  if (error instanceof BlogAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof BlogValidationError) {
    return Response.json({ error: "内容校验失败", fields: error.errors }, { status: 400 });
  }
  if (error instanceof VersionConflictError) {
    return Response.json(
      { error: "草稿已在其他设备更新", code: "VERSION_CONFLICT" },
      { status: 409 },
    );
  }
  if (error instanceof SlugConflictError) {
    return Response.json(
      { error: "文章地址已存在", code: "SLUG_CONFLICT" },
      { status: 409 },
    );
  }
  if (error instanceof BlogNotFoundError) {
    return Response.json({ error: "文章不存在" }, { status: 404 });
  }
  return Response.json({ error: "保存失败，请稍后重试" }, { status: 500 });
}

export async function withOwnerResponse(
  operation: () => Promise<Response>,
  authorize: OwnerAssertion = assertBlogOwner,
): Promise<Response> {
  try {
    await authorize();
    return await operation();
  } catch (error) {
    return errorResponse(error);
  }
}

export async function withOwnerJson(
  operation: () => Promise<unknown>,
  authorize: OwnerAssertion = assertBlogOwner,
): Promise<Response> {
  return withOwnerResponse(async () => Response.json(await operation()), authorize);
}
