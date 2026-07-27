import type { BlogPostDraft, PostType, SectionKind } from "@/lib/blog/types";

export type SaveState = "idle" | "saving" | "saved" | "failed" | "conflict";
export type MobilePane = "edit" | "preview";

export const postTypeLabels: Record<PostType, string> = {
  jobs: "秋招进展",
  internship: "实习日记",
  papers: "论文阅读",
  reflections: "每日感悟",
};

export const sectionKindLabels: Record<SectionKind, string> = {
  long_text: "长文本",
  short_text: "短文本",
  checklist: "清单",
  markdown: "Markdown / LaTeX",
  relation: "关联文章",
};

export function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function replacePost(posts: BlogPostDraft[], next: BlogPostDraft): BlogPostDraft[] {
  const found = posts.some((post) => post.id === next.id);
  return (found ? posts.map((post) => post.id === next.id ? next : post) : [next, ...posts])
    .sort((left, right) => right.date.localeCompare(left.date));
}
