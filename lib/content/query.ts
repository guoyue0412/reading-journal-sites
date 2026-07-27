import { CONTENT_ENTRIES } from "./generated.ts";
import type { ApplicationStage, ContentEntry, ContentType, ReadingStatus } from "./types.ts";

const readingStatuses: ReadingStatus[] = ["queued", "in_progress", "synthesizing", "completed", "archived"];
const applicationStages: ApplicationStage[] = ["applied", "written_test", "interview", "offer", "closed"];

function copyEntries(entries: ContentEntry[]): ContentEntry[] {
  return structuredClone(entries);
}

export function sortEntriesByRecency<T extends { date: string; readAt?: string }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => Date.parse(right.readAt ?? right.date) - Date.parse(left.readAt ?? left.date));
}

export function getRecentEntries(limit: number, source: ContentEntry[] = CONTENT_ENTRIES): ContentEntry[] {
  const entries = sortEntriesByRecency(source);

  return copyEntries(entries.slice(0, Math.max(0, limit)));
}

export function getEntriesByType(type: ContentType, entries: ContentEntry[] = CONTENT_ENTRIES): ContentEntry[] {
  return copyEntries(sortEntriesByRecency(entries.filter((entry) => entry.type === type)));
}

export function getRecentEntriesByType(type: ContentType, limit: number, entries: ContentEntry[] = CONTENT_ENTRIES): ContentEntry[] {
  return getEntriesByType(type, entries).slice(0, Math.max(0, limit));
}

export function getPaperStatusCounts(entries: ContentEntry[] = CONTENT_ENTRIES): Record<ReadingStatus, number> {
  const counts = Object.fromEntries(readingStatuses.map((status) => [status, 0])) as Record<ReadingStatus, number>;
  for (const entry of entries) {
    if (entry.type === "papers" && entry.readingStatus) counts[entry.readingStatus] += 1;
  }
  return counts;
}

export function getRecruitingStageCounts(entries: ContentEntry[] = CONTENT_ENTRIES): Record<ApplicationStage, number> {
  const counts = Object.fromEntries(applicationStages.map((stage) => [stage, 0])) as Record<ApplicationStage, number>;
  for (const entry of entries) {
    if (entry.type === "jobs" && entry.applicationStage) counts[entry.applicationStage] += 1;
  }
  return counts;
}

export function searchEntries(query: string, entries: ContentEntry[] = CONTENT_ENTRIES): ContentEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  const matches = entries.filter((entry) => {
    const searchableFields = [
      entry.title,
      entry.summary,
      ...entry.tags,
      ...(entry.topics ?? []),
      entry.venue ?? "",
    ];

    return searchableFields.some((field) =>
      field.toLocaleLowerCase().includes(normalizedQuery),
    );
  });

  return copyEntries(matches);
}

function sharesMetadata(left: ContentEntry, right: ContentEntry): boolean {
  const rightMetadata = new Set([...right.tags, ...(right.topics ?? [])]);
  return [...left.tags, ...(left.topics ?? [])].some((value) =>
    rightMetadata.has(value),
  );
}

export function getRelatedEntries(slug: string, entries: ContentEntry[] = CONTENT_ENTRIES): ContentEntry[] {
  const source = entries.find((entry) => entry.slug === slug);
  if (!source) return [];

  const candidates = entries.filter((entry) => entry.slug !== slug);
  const explicit = source.related
    .map((relatedSlug) =>
      candidates.find((entry) => entry.slug === relatedSlug),
    )
    .filter((entry): entry is ContentEntry => entry !== undefined);
  const outgoingSlugs = new Set(explicit.map((entry) => entry.slug));
  explicit.push(
    ...candidates.filter(
      (entry) =>
        !outgoingSlugs.has(entry.slug) && entry.related.includes(source.slug),
    ),
  );
  const explicitSlugs = new Set(explicit.map((entry) => entry.slug));
  const sharedMetadata = candidates.filter(
    (entry) => !explicitSlugs.has(entry.slug) && sharesMetadata(source, entry),
  );
  const selectedSlugs = new Set(
    [...explicit, ...sharedMetadata].map((entry) => entry.slug),
  );
  const sameDate = candidates.filter(
    (entry) => !selectedSlugs.has(entry.slug) && entry.date === source.date,
  );

  return copyEntries([...explicit, ...sharedMetadata, ...sameDate]);
}
