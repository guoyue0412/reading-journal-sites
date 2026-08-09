import { CONTENT_ENTRIES } from "../content/generated.ts";
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
  const common: ContentEntry = { title: snapshot.title, slug: snapshot.slug, type: snapshot.type, date: snapshot.date, updatedAt: snapshot.updatedAt, summary: snapshot.summary, tags: snapshot.tags, related: snapshot.related, status: "published", body: sectionBody(snapshot) };
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
  return /no such table|does not exist|D1_ERROR|ERR_UNSUPPORTED_ESM_URL_SCHEME|cloudflare:/i.test(message);
}

export async function listPublicEntries(store?: BlogStore, fallback: ContentEntry[] = CONTENT_ENTRIES): Promise<ContentEntry[]> {
  try {
    if (!store) {
      const { env } = await import("cloudflare:workers");
      if (!env.DB) return structuredClone(fallback);
    }
    const activeStore = store ?? new (await import("./d1-store.ts")).D1BlogStore();
    if (!(await activeStore.hasBootstrapMarker())) return structuredClone(fallback);
    return (await activeStore.listPublished()).map(snapshotToContentEntry);
  } catch (error) {
    if (missingSchema(error)) return structuredClone(fallback);
    throw error;
  }
}

export async function getPublicEntry(slug: string, store?: BlogStore): Promise<ContentEntry | null> {
  return (await listPublicEntries(store)).find((entry) => entry.slug === slug) ?? null;
}
