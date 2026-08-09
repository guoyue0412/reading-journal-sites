import { CONTENT_ENTRIES } from "../content/generated.ts";
import { sortEntriesByRecency } from "../content/query.ts";
import type { ContentEntry } from "../content/types.ts";
import type { BlogStore } from "./store.ts";
import type { JobMetadata, PaperMetadata, PublishedSnapshot } from "./types.ts";

function sectionBody(snapshot: PublishedSnapshot): string {
  return [...snapshot.sections].sort((a, b) => a.position - b.position).map((section) => {
    const value = section.kind === "checklist" ? section.items.map((item) => `- [ ] ${item}`).join("\n") : section.kind === "relation" ? section.relationSlugs.map((slug) => `- [[${slug}]]`).join("\n") : section.content;
    return `## ${section.title}\n\n${value}`;
  }).join("\n\n");
}

export function snapshotToContentEntry(snapshot: PublishedSnapshot): ContentEntry {
  const common: ContentEntry = { title: snapshot.title, slug: snapshot.slug, type: snapshot.type, date: snapshot.date, updatedAt: snapshot.updatedAt, publishedAt: snapshot.publishedAt, summary: snapshot.summary, tags: snapshot.tags, related: snapshot.related, status: "published", body: sectionBody(snapshot) };
  if (snapshot.type === "papers") {
    const value = snapshot.metadata as PaperMetadata;
    return { ...common, readAt: value.readAt, authors: value.authors, venue: value.venue, year: value.year, paperUrl: value.paperUrl, readingMethods: value.readingMethods, readingStatus: value.readingStatus, topics: value.topics };
  }
  if (snapshot.type === "jobs") {
    const value = snapshot.metadata as JobMetadata;
    return { ...common, company: value.company, role: value.role, location: value.location, applicationStage: value.applicationStage, appliedAt: value.appliedAt, nextAction: value.nextAction };
  }
  return common;
}

function missingSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const missingBlogTable = /\bno such table:\s*(?:main\.)?(?:blog_state|posts)\b/i.test(message)
    || /\btable\s+(?:main\.)?(?:blog_state|posts)\s+does not exist\b/i.test(message);
  const localCloudflareModuleUnavailable = (code === "ERR_UNSUPPORTED_ESM_URL_SCHEME" && /cloudflare:/i.test(message))
    || /cannot find (?:module|package)\s+['"]cloudflare:workers/i.test(message);
  return missingBlogTable || localCloudflareModuleUnavailable;
}

export async function listPublicEntries(store?: BlogStore, fallback: ContentEntry[] = CONTENT_ENTRIES): Promise<ContentEntry[]> {
  try {
    if (!store) {
      const { env } = await import("cloudflare:workers");
      if (!env.DB) return sortEntriesByRecency(structuredClone(fallback));
    }
    const activeStore = store ?? new (await import("./d1-store.ts")).D1BlogStore();
    if (!(await activeStore.hasBootstrapMarker())) return sortEntriesByRecency(structuredClone(fallback));
    return sortEntriesByRecency((await activeStore.listPublished()).map(snapshotToContentEntry));
  } catch (error) {
    if (missingSchema(error)) return sortEntriesByRecency(structuredClone(fallback));
    throw error;
  }
}

export async function getPublicEntry(slug: string, store?: BlogStore): Promise<ContentEntry | null> {
  return (await listPublicEntries(store)).find((entry) => entry.slug === slug) ?? null;
}
