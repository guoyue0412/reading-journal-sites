import type {
  BlogPostDraft,
  JobMetadata,
  PaperMetadata,
  PostType,
  SectionTemplate,
} from "./types.ts";
import { READING_SUMMARY } from "./section-constants.ts";

export const defaultTemplatesFor: Record<PostType, Array<Omit<SectionTemplate, "id" | "postType">>> = {
  jobs: [
    { title: "投递", kind: "long_text", position: 10, standardKey: "applied", enabled: true },
    { title: "笔试", kind: "long_text", position: 20, standardKey: "written_test", enabled: true },
    { title: "面试", kind: "long_text", position: 30, standardKey: "interview", enabled: true },
    { title: "最终复盘", kind: "long_text", position: 40, standardKey: "review", enabled: true },
  ],
  internship: [
    { title: "今日任务", kind: "checklist", position: 10, standardKey: "tasks", enabled: true },
    { title: "解决的问题", kind: "long_text", position: 20, standardKey: "problems", enabled: true },
    { title: "学习收获", kind: "long_text", position: 30, standardKey: "learning", enabled: true },
    { title: "明日计划", kind: "checklist", position: 40, standardKey: "next", enabled: true },
  ],
  papers: [
    { title: "研究问题", kind: "long_text", position: 5, standardKey: "question", enabled: true },
    { title: "粗读记录", kind: "markdown", position: 10, standardKey: "skim", enabled: true },
    { title: "细读记录", kind: "markdown", position: 20, standardKey: "deep", enabled: true },
    { title: "阅读总结", kind: "markdown", position: 30, standardKey: READING_SUMMARY, enabled: true },
  ],
  reflections: [
    { title: "今日事件", kind: "long_text", position: 10, standardKey: "event", enabled: true },
    { title: "感受", kind: "long_text", position: 20, standardKey: "feeling", enabled: true },
    { title: "反思", kind: "long_text", position: 30, standardKey: "reflection", enabled: true },
    { title: "一句话总结", kind: "short_text", position: 40, standardKey: "summary", enabled: true },
  ],
};

export function createEmptyDraft(type: PostType, id: string, date: string, reusable: SectionTemplate[]): BlogPostDraft {
  const definitions = [
    ...defaultTemplatesFor[type].map((item) => ({ ...item, id: `${id}-${item.standardKey}`, postType: type })),
    ...reusable.filter((item) => item.enabled),
  ].sort((left, right) => left.position - right.position);

  const metadata: BlogPostDraft["metadata"] = type === "papers"
    ? {
        authors: [],
        venue: "arXiv",
        year: Number(date.slice(0, 4)),
        paperUrl: "",
        readAt: date,
        readingMethods: [],
        readingStatus: "queued",
        topics: [],
      } satisfies PaperMetadata
    : type === "jobs"
      ? {
          company: "",
          role: "",
          location: "",
          applicationStage: "applied",
          appliedAt: date,
          nextAction: "",
        } satisfies JobMetadata
      : {};

  return {
    id,
    slug: type === "reflections" ? date : `${type}-${date}`,
    type,
    title: "",
    date,
    summary: "",
    tags: [],
    related: [],
    status: "draft",
    metadata,
    sections: definitions.map((item, index) => ({
      id: `${id}-section-${index + 1}`,
      title: item.title,
      kind: item.kind,
      content: "",
      items: [],
      relationSlugs: [],
      position: (index + 1) * 10,
      templateId: item.standardKey ? null : item.id,
      standardKey: item.standardKey,
    })),
    draftVersion: 0,
    publishedRevisionId: null,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}
