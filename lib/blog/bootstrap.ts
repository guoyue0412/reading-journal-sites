import { LEGACY_CONTENT_ENTRIES } from "../content/legacy-generated.ts";
import type { ContentEntry } from "../content/types.ts";
import { importPostMarkdown } from "./markdown.ts";
import type { BlogStore } from "./store.ts";

function scalar(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

export function legacyEntryToMarkdown(entry: ContentEntry): string {
  const values: Record<string, unknown> = {
    title: entry.title, slug: entry.slug, type: entry.type, date: entry.date,
    summary: entry.summary, tags: entry.tags, related: entry.related, status: entry.status,
  };
  if (entry.type === "papers") Object.assign(values, { read_at: entry.readAt, authors: entry.authors, venue: entry.venue, year: entry.year, paper_url: entry.paperUrl, reading_methods: entry.readingMethods, reading_status: entry.readingStatus, topics: entry.topics });
  if (entry.type === "jobs") Object.assign(values, { company: entry.company, role: entry.role, location: entry.location ?? "", application_stage: entry.applicationStage, applied_at: entry.appliedAt ?? entry.date, next_action: entry.nextAction ?? "" });
  const frontmatter = Object.entries(values).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}: ${scalar(value)}`).join("\n");
  return `---\n${frontmatter}\n---\n\n${entry.body}\n`;
}

export async function ensureLegacyContentImported(
  store: BlogStore,
  entries: ContentEntry[] = LEGACY_CONTENT_ENTRIES,
  clock = () => new Date().toISOString(),
  ids = () => crypto.randomUUID(),
): Promise<void> {
  if (await store.hasBootstrapMarker()) return;
  for (const entry of entries) {
    const imported = importPostMarkdown(legacyEntryToMarkdown(entry), { id: ids(), now: clock() });
    if (imported.errors.length) throw new Error(`Legacy import failed for ${entry.slug}: ${imported.errors.join(", ")}`);
    const created = await store.importDraft(imported.draft);
    if (entry.status === "published" && !created.publishedRevisionId) {
      await store.publish(created, created.draftVersion, ids(), clock());
    }
  }
  await store.markBootstrapped(clock());
}
