import type { ContentEntry, ReadingMethod, ReadingStatus } from "../content/types";

export type PaperBibliographyOrder = "newest" | "oldest";

export type PaperBibliographyFilters = {
  query: string;
  readingMethods: readonly ReadingMethod[];
  readingStatus: ReadingStatus | "";
  topic: string;
  year: string;
  venue: string;
  order: PaperBibliographyOrder;
};

export const DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS: Readonly<PaperBibliographyFilters> = Object.freeze({
  query: "",
  readingMethods: Object.freeze([]),
  readingStatus: "",
  topic: "",
  year: "",
  venue: "",
  order: "newest",
});

function resolveFilters(filters: Partial<PaperBibliographyFilters> = {}): PaperBibliographyFilters {
  return { ...DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS, ...filters };
}

export function hasPaperBibliographyFilters(filters: Partial<PaperBibliographyFilters> = {}) {
  const resolved = resolveFilters(filters);
  return Boolean(
    resolved.query ||
    resolved.readingMethods.length ||
    resolved.readingStatus ||
    resolved.topic ||
    resolved.year ||
    resolved.venue ||
    resolved.order !== DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS.order
  );
}

export function filterAndSortPaperEntries(
  entries: readonly ContentEntry[],
  filters: Partial<PaperBibliographyFilters> = {},
): ContentEntry[] {
  const resolved = resolveFilters(filters);
  const needle = resolved.query.trim().toLocaleLowerCase();

  return entries.filter((entry) =>
    (!needle || [entry.title, entry.summary, entry.venue ?? "", ...(entry.authors ?? []), ...(entry.topics ?? [])]
      .some((value) => value.toLocaleLowerCase().includes(needle))) &&
    (!resolved.topic || entry.topics?.includes(resolved.topic)) &&
    (!resolved.year || String(entry.year) === resolved.year) &&
    (!resolved.venue || entry.venue === resolved.venue) &&
    (!resolved.readingStatus || entry.readingStatus === resolved.readingStatus) &&
    (!resolved.readingMethods.length || entry.readingMethods?.some((method) => resolved.readingMethods.includes(method)))
  ).sort((left, right) => {
    const comparison = (left.readAt ?? left.date).localeCompare(right.readAt ?? right.date);
    return resolved.order === "newest" ? -comparison : comparison;
  });
}
