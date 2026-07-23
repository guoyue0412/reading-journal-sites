import { CONTENT_ENTRIES } from "./generated.ts";
import type { ContentEntry, ContentType } from "./types.ts";

function copyEntries(entries: ContentEntry[]): ContentEntry[] {
  return structuredClone(entries);
}

function entryTimestamp(entry: ContentEntry): number {
  return Date.parse(entry.readAt ?? entry.date);
}

export function getRecentEntries(limit: number): ContentEntry[] {
  const entries = [...CONTENT_ENTRIES].sort(
    (left, right) => entryTimestamp(right) - entryTimestamp(left),
  );

  return copyEntries(entries.slice(0, Math.max(0, limit)));
}

export function getEntriesByType(type: ContentType): ContentEntry[] {
  return copyEntries(CONTENT_ENTRIES.filter((entry) => entry.type === type));
}

export function searchEntries(query: string): ContentEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return [];

  const matches = CONTENT_ENTRIES.filter((entry) => {
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

export function getRelatedEntries(slug: string): ContentEntry[] {
  const source = CONTENT_ENTRIES.find((entry) => entry.slug === slug);
  if (!source) return [];

  const candidates = CONTENT_ENTRIES.filter((entry) => entry.slug !== slug);
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
