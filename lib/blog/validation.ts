import type {
  BlogPostDraft,
  PostType,
  SectionKind,
} from "./types.ts";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const slugPattern = /^[a-z0-9\u4e00-\u9fff]+(?:-[a-z0-9\u4e00-\u9fff]+)*$/;
const postTypes: readonly PostType[] = ["jobs", "internship", "papers", "reflections"];
const sectionKinds: readonly SectionKind[] = ["long_text", "short_text", "checklist", "markdown", "relation"];
const readingMethods = ["skim", "deep", "synthesis"] as const;
const readingStatuses = ["queued", "in_progress", "synthesizing", "completed", "archived"] as const;
const applicationStages = ["applied", "written_test", "interview", "offer", "closed"] as const;

function isIsoDate(value: string): boolean {
  if (!isoDate.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function includes<T extends string>(values: readonly T[], value: string): value is T {
  return values.includes(value as T);
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function validateDraft(post: BlogPostDraft): string[] {
  const errors: string[] = [];
  if (!post.id.trim()) errors.push("文章 ID 不能为空");
  if (!includes(postTypes, post.type)) errors.push("文章类型无效");
  if (!isIsoDate(post.date)) errors.push("日期必须是有效的 YYYY-MM-DD");
  if (!slugPattern.test(post.slug)) errors.push("slug 只能包含中文、小写字母、数字和单个连字符");
  if (post.type === "reflections" && post.slug !== post.date) errors.push("每日感悟的 slug 必须等于日期");
  if (post.status !== "draft" && post.status !== "published") errors.push("文章状态无效");

  const ids = post.sections.map((section) => section.id);
  if (ids.some((id) => !id.trim())) errors.push("组件 ID 不能为空");
  if (new Set(ids).size !== ids.length) errors.push("组件 ID 不能重复");
  if (post.sections.some((section) => !section.title.trim())) errors.push("组件名称不能为空");
  if (post.sections.some((section) => !includes(sectionKinds, section.kind))) errors.push("组件类型无效");
  if (post.sections.some((section, index) => index > 0 && section.position <= post.sections[index - 1].position)) {
    errors.push("组件顺序必须唯一且递增");
  }

  if (post.type === "papers") {
    const metadata = normalizeMetadata(post.metadata);
    const methods = Array.isArray(metadata.readingMethods) ? metadata.readingMethods : [];
    const readingStatus = typeof metadata.readingStatus === "string" ? metadata.readingStatus : "";
    if (!includes(readingStatuses, readingStatus)) errors.push("阅读状态无效");
    if (!Array.isArray(metadata.readingMethods) || methods.some((method) => typeof method !== "string" || !includes(readingMethods, method))) {
      errors.push("阅读方式无效");
    }
  }
  if (post.type === "jobs") {
    const metadata = normalizeMetadata(post.metadata);
    const applicationStage = typeof metadata.applicationStage === "string" ? metadata.applicationStage : "";
    if (!includes(applicationStages, applicationStage)) errors.push("秋招阶段无效");
  }

  return errors;
}

export function validateForPublish(post: BlogPostDraft): string[] {
  const errors = validateDraft(post);
  if (!post.title.trim()) errors.push("标题不能为空");
  if (!post.summary.trim()) errors.push("摘要不能为空");

  if (post.type === "papers") {
    const metadata = normalizeMetadata(post.metadata);
    const methods = Array.isArray(metadata.readingMethods) ? metadata.readingMethods : [];
    const paperUrl = typeof metadata.paperUrl === "string" ? metadata.paperUrl : "";
    if (!/^https?:\/\//.test(paperUrl)) errors.push("论文链接必须是 HTTP 或 HTTPS 地址");
    if (metadata.readingStatus !== "queued" && methods.length === 0) {
      errors.push("阅读开始后至少选择一种阅读方式");
    }
    const sectionKeys = new Set(post.sections.map((section) => section.standardKey));
    const labels = { skim: "粗读记录", deep: "细读记录", synthesis: "阅读总结" } as const;
    for (const method of methods) {
      if (includes(readingMethods, method) && !sectionKeys.has(method)) errors.push(`缺少${labels[method]}组件`);
    }
  }

  if (post.type === "jobs") {
    const metadata = normalizeMetadata(post.metadata);
    if (typeof metadata.company !== "string" || !metadata.company.trim()) errors.push("公司不能为空");
    if (typeof metadata.role !== "string" || !metadata.role.trim()) errors.push("岗位不能为空");
  }

  return errors;
}
