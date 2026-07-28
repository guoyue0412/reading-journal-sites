import type { BlogPostDraft, BlogSection } from "./types.ts";

export const READING_SUMMARY = "reading-summary";
export const READING_SUMMARY_TITLE = "阅读总结";

const legacyReadingSummaryKeys = new Set(["synthesis", "readingsummary"]);

function comparableKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s-]+/g, "");
}

export function isReadingSummarySection(section: Pick<BlogSection, "title" | "standardKey">): boolean {
  const key = section.standardKey ? comparableKey(section.standardKey) : "";
  return legacyReadingSummaryKeys.has(key) || section.title.trim() === READING_SUMMARY_TITLE;
}

export function normalizeSection(section: BlogSection): BlogSection {
  return isReadingSummarySection(section) && section.standardKey !== READING_SUMMARY
    ? { ...section, standardKey: READING_SUMMARY }
    : section;
}

export function normalizeBlogPost(post: BlogPostDraft): BlogPostDraft {
  if (post.type !== "papers") return post;
  const sections = post.sections.map(normalizeSection);
  return sections.some((section, index) => section !== post.sections[index]) ? { ...post, sections } : post;
}
