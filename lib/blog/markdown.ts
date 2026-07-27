import type {
  BlogPostDraft,
  BlogSection,
  JobMetadata,
  PaperMetadata,
  PostMetadata,
  PostType,
} from "./types.ts";
import { validateDraft } from "./validation.ts";

export interface ImportResult {
  draft: BlogPostDraft;
  errors: string[];
  warnings: string[];
  unknownFrontmatter: Record<string, string>;
}

export interface ImportOptions {
  id: string;
  now: string;
}

const knownHeadings: Record<PostType, Record<string, string>> = {
  papers: { "研究问题": "question", "粗读记录": "skim", "细读记录": "deep", "阅读总结": "synthesis" },
  jobs: { "投递": "applied", "笔试": "written_test", "面试": "interview", "最终复盘": "review" },
  internship: { "今日任务": "tasks", "解决的问题": "problems", "学习收获": "learning", "明日计划": "next" },
  reflections: { "今日事件": "event", "感受": "feeling", "反思": "reflection", "一句话总结": "summary" },
};

const knownFrontmatter = new Set([
  "title", "slug", "type", "date", "summary", "tags", "related", "status",
  "read_at", "authors", "venue", "year", "paper_url", "reading_methods", "reading_status", "topics",
  "company", "role", "location", "application_stage", "applied_at", "next_action",
]);

export function exportPostMarkdown(post: BlogPostDraft): string {
  const frontmatter = Object.entries(canonicalFrontmatter(post))
    .map(([key, value]) => `${key}: ${formatYamlScalar(value)}`)
    .join("\n");
  const body = [...post.sections]
    .sort((left, right) => left.position - right.position)
    .map(sectionToMarkdown)
    .join("\n\n");
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

export function importPostMarkdown(source: string, options: ImportOptions): ImportResult {
  const parsed = parseFrontmatterAndBody(source);
  const draft = frontmatterToDraft(parsed.frontmatter, options);
  draft.status = "draft";
  draft.sections = splitH2Sections(parsed.body).map((section, index) => ({
    id: `${options.id}-section-${index + 1}`,
    title: section.title,
    kind: "markdown",
    content: section.body,
    items: [],
    relationSlugs: [],
    position: (index + 1) * 10,
    templateId: null,
    standardKey: (knownHeadings[draft.type] ?? {})[section.title] ?? null,
  }));

  return {
    draft,
    errors: validateDraft(draft),
    warnings: parsed.warnings,
    unknownFrontmatter: parsed.unknownFrontmatter,
  };
}

function canonicalFrontmatter(post: BlogPostDraft): Record<string, string | number | string[]> {
  const common = {
    title: post.title,
    slug: post.slug,
    type: post.type,
    date: post.date,
    summary: post.summary,
    tags: post.tags,
    related: post.related,
    status: post.status,
  };

  if (post.type === "papers") {
    const metadata = post.metadata as PaperMetadata;
    return {
      ...common,
      read_at: metadata.readAt,
      authors: metadata.authors,
      venue: metadata.venue,
      year: metadata.year,
      paper_url: metadata.paperUrl,
      reading_methods: metadata.readingMethods,
      reading_status: metadata.readingStatus,
      topics: metadata.topics,
    };
  }
  if (post.type === "jobs") {
    const metadata = post.metadata as JobMetadata;
    return {
      ...common,
      company: metadata.company,
      role: metadata.role,
      location: metadata.location,
      application_stage: metadata.applicationStage,
      applied_at: metadata.appliedAt,
      next_action: metadata.nextAction,
    };
  }
  return common;
}

function frontmatterToDraft(frontmatter: Record<string, unknown>, options: ImportOptions): BlogPostDraft {
  const type = stringValue(frontmatter.type) as PostType;
  const metadata = type === "papers"
    ? {
        authors: arrayValue(frontmatter.authors),
        venue: stringValue(frontmatter.venue),
        year: numberValue(frontmatter.year),
        paperUrl: stringValue(frontmatter.paper_url),
        readAt: stringValue(frontmatter.read_at),
        readingMethods: arrayValue(frontmatter.reading_methods),
        readingStatus: stringValue(frontmatter.reading_status),
        topics: arrayValue(frontmatter.topics),
      } as PaperMetadata
    : type === "jobs"
      ? {
          company: stringValue(frontmatter.company),
          role: stringValue(frontmatter.role),
          location: stringValue(frontmatter.location),
          applicationStage: stringValue(frontmatter.application_stage),
          appliedAt: stringValue(frontmatter.applied_at),
          nextAction: stringValue(frontmatter.next_action),
        } as JobMetadata
      : {};

  return {
    id: options.id,
    slug: stringValue(frontmatter.slug),
    type,
    title: stringValue(frontmatter.title),
    date: stringValue(frontmatter.date),
    summary: stringValue(frontmatter.summary),
    tags: arrayValue(frontmatter.tags),
    related: arrayValue(frontmatter.related),
    status: "draft",
    metadata: metadata as PostMetadata,
    sections: [],
    draftVersion: 0,
    publishedRevisionId: null,
    createdAt: options.now,
    updatedAt: options.now,
  };
}

function parseFrontmatterAndBody(source: string): {
  frontmatter: Record<string, unknown>;
  body: string;
  warnings: string[];
  unknownFrontmatter: Record<string, string>;
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: source, warnings: ["缺少 YAML frontmatter"], unknownFrontmatter: {} };

  const frontmatter: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    frontmatter[line.slice(0, separator).trim()] = parseScalar(line.slice(separator + 1));
  }
  return {
    frontmatter,
    body: match[2],
    warnings: [],
    unknownFrontmatter: Object.fromEntries(
      Object.entries(frontmatter)
        .filter(([key]) => !knownFrontmatter.has(key))
        .map(([key, value]) => [key, String(value)]),
    ),
  };
}

function parseScalar(value: string): string | number | string[] {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? splitArrayValues(inner).map((item) => unquote(item.trim())) : [];
  }
  const unquoted = unquote(trimmed);
  return /^-?\d+(?:\.\d+)?$/.test(unquoted) ? Number(unquoted) : unquoted;
}

function splitArrayValues(value: string): string[] {
  const items: string[] = [];
  let current = "";
  let quote = "";
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\" && quote) {
      current += character;
      escaped = true;
      continue;
    }
    if ((character === '"' || character === "'") && (!quote || quote === character)) {
      quote = quote ? "" : character;
      current += character;
      continue;
    }
    if (character === "," && !quote) {
      items.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  items.push(current);
  return items;
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

function splitH2Sections(body: string): Array<{ title: string; body: string }> {
  const sections: Array<{ title: string; body: string }> = [];
  let fence: { character: string; length: number } | null = null;
  let current: { title: string; lines: string[] } | null = null;

  for (const line of body.split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fenceMatch) {
      const openingFence = fenceMatch[1];
      const trailing = fenceMatch[2];
      if (!fence) {
        fence = { character: openingFence[0], length: openingFence.length };
      } else if (
        openingFence[0] === fence.character
        && openingFence.length >= fence.length
        && !trailing.trim()
      ) {
        fence = null;
      }
    }
    const heading = !fence ? line.match(/^##\s+(.+?)\s*$/) : null;
    if (heading) {
      if (current) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
      current = { title: heading[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
  return sections;
}

function sectionToMarkdown(section: BlogSection): string {
  const value = section.kind === "checklist"
    ? section.items.map((item) => `- [ ] ${item}`).join("\n")
    : section.kind === "relation"
      ? section.relationSlugs.map((slug) => `- [[${slug}]]`).join("\n")
      : section.content;
  return `## ${section.title}\n\n${value}`;
}

function formatYamlScalar(value: string | number | string[]): string {
  if (Array.isArray(value)) return `[${value.map(formatYamlString).join(", ")}]`;
  return typeof value === "number" ? String(value) : formatYamlString(value);
}

function formatYamlString(value: string): string {
  return value === ""
    || /[\n\r\[\]{}#,]|^[-?:!&*]|:\s|\s$/.test(value)
    || /^(?:-?\d+(?:\.\d+)?|true|false)$/.test(value)
    ? JSON.stringify(value)
    : value;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function arrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
