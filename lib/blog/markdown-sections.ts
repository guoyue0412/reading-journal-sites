import type { BlogPostDraft, BlogSection } from "./types.ts";
import { normalizeSection } from "./section-constants.ts";

function joinParts(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join("\n\n");
}

function outsideFences(markdown: string): string {
  let fence: { character: string; length: number } | null = null;
  return markdown.split(/\r?\n/).map((line) => {
    const match = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (match) {
      if (!fence) fence = { character: match[1][0], length: match[1].length };
      else if (match[1][0] === fence.character && match[1].length >= fence.length && !match[2].trim()) fence = null;
      return "";
    }
    return fence ? "" : line;
  }).join("\n");
}

export function extractWikiRelations(markdown: string): Array<{ slug: string; label: string | null }> {
  const found = new Map<string, string | null>();
  for (const match of outsideFences(markdown).matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
    const slug = match[1].trim();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || found.has(slug)) continue;
    found.set(slug, match[2]?.trim() || null);
  }
  return [...found].map(([slug, label]) => ({ slug, label }));
}

export function extractLocalAssetIds(markdown: string): string[] {
  const found = new Set<string>();
  for (const match of outsideFences(markdown).matchAll(/!\[[^\]]*\]\(\/media\/([0-9a-f-]{36})\/[^)]+\)/gi)) found.add(match[1].toLowerCase());
  return [...found];
}

export function normalizeMarkdownSection(input: BlogSection): BlogSection {
  const section = normalizeSection(input);
  const checklist = section.kind === "checklist" ? section.items.map((item) => `- [ ] ${item}`).join("\n") : "";
  const relations = section.kind === "relation" ? section.relationSlugs.map((slug) => `[[${slug}]]`).join("\n") : "";
  const content = joinParts([section.content, checklist, relations]);
  return {
    ...section,
    kind: "markdown",
    content,
    items: [],
    relationSlugs: extractWikiRelations(content).map(({ slug }) => slug),
  };
}

export function derivePostRelations(post: Pick<BlogPostDraft, "sections">): string[] {
  const found = new Set<string>();
  for (const section of post.sections) for (const { slug } of extractWikiRelations(section.content)) found.add(slug);
  return [...found];
}

export function normalizeMarkdownPost(post: BlogPostDraft): BlogPostDraft {
  const sections = post.sections.map(normalizeMarkdownSection);
  return { ...post, sections, related: [...new Set([...post.related, ...derivePostRelations({ sections })])] };
}
