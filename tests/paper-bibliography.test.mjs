import assert from "node:assert/strict";
import test from "node:test";

const entries = [
  {
    title: "Control Gamma",
    slug: "control-gamma",
    type: "papers",
    date: "2026-01-20",
    readAt: "2026-01-21",
    summary: "Closed-loop control study.",
    authors: ["Carol"],
    venue: "ICRA",
    year: 2025,
    topics: ["robotics", "control"],
    readingMethods: ["deep"],
    readingStatus: "in_progress",
    tags: [],
    related: [],
    status: "published",
    body: "",
  },
  {
    title: "Robotics Alpha",
    slug: "robotics-alpha",
    type: "papers",
    date: "2026-03-01",
    summary: "Manipulation policy with contact feedback.",
    authors: ["Ada Lovelace"],
    venue: "ICRA",
    year: 2025,
    topics: ["robotics", "manipulation"],
    readingMethods: ["skim", "deep"],
    readingStatus: "completed",
    tags: [],
    related: [],
    status: "published",
    body: "",
  },
  {
    title: "Vision Beta",
    slug: "vision-beta",
    type: "papers",
    date: "2026-02-15",
    summary: "Tactile representation learning.",
    authors: ["Bob"],
    venue: "NeurIPS",
    year: 2024,
    topics: ["vision", "tactile"],
    readingMethods: ["synthesis"],
    readingStatus: "synthesizing",
    tags: [],
    related: [],
    status: "published",
    body: "",
  },
];

const loadSubject = () => import("../lib/research/paper-bibliography.ts");

test("paper bibliography defaults to newest reading date without mutating its input", async () => {
  const { filterAndSortPaperEntries } = await loadSubject();
  const originalOrder = entries.map((entry) => entry.slug);

  assert.deepEqual(filterAndSortPaperEntries(entries).map((entry) => entry.slug), [
    "robotics-alpha",
    "vision-beta",
    "control-gamma",
  ]);
  assert.deepEqual(entries.map((entry) => entry.slug), originalOrder);
});

test("paper bibliography can sort oldest reading date first", async () => {
  const { filterAndSortPaperEntries } = await loadSubject();
  const result = filterAndSortPaperEntries(entries, { order: "oldest" });

  assert.deepEqual(result.map((entry) => entry.slug), [
    "control-gamma",
    "vision-beta",
    "robotics-alpha",
  ]);
});

test("paper bibliography query searches title, summary, authors, venue, and topics case-insensitively", async () => {
  const { filterAndSortPaperEntries } = await loadSubject();

  assert.deepEqual(filterAndSortPaperEntries(entries, { query: "  ADA " }).map((entry) => entry.slug), ["robotics-alpha"]);
  assert.deepEqual(filterAndSortPaperEntries(entries, { query: "tactile" }).map((entry) => entry.slug), ["vision-beta"]);
  assert.deepEqual(filterAndSortPaperEntries(entries, { query: "neurips" }).map((entry) => entry.slug), ["vision-beta"]);
});

test("paper bibliography combines multi-select reading methods and single execution status", async () => {
  const { filterAndSortPaperEntries } = await loadSubject();

  assert.deepEqual(filterAndSortPaperEntries(entries, {
    readingMethods: ["skim", "deep"],
    readingStatus: "completed",
  }).map((entry) => entry.slug), ["robotics-alpha"]);
  assert.deepEqual(filterAndSortPaperEntries(entries, {
    readingMethods: ["synthesis"],
    readingStatus: "synthesizing",
  }).map((entry) => entry.slug), ["vision-beta"]);
  assert.deepEqual(filterAndSortPaperEntries(entries, {
    readingMethods: ["deep"],
    readingStatus: "synthesizing",
  }), []);
});

test("paper bibliography treats selected reading methods as one inclusive facet", async () => {
  const { filterAndSortPaperEntries } = await loadSubject();

  assert.deepEqual(
    filterAndSortPaperEntries(entries, { readingMethods: ["deep", "synthesis"] }).map((entry) => entry.slug),
    ["robotics-alpha", "vision-beta", "control-gamma"],
  );
});

test("paper bibliography filters by execution status alone", async () => {
  const { filterAndSortPaperEntries } = await loadSubject();

  assert.deepEqual(
    filterAndSortPaperEntries(entries, { readingStatus: "completed" }).map((entry) => entry.slug),
    ["robotics-alpha"],
  );
});

test("paper bibliography filters by topic alone", async () => {
  const { filterAndSortPaperEntries } = await loadSubject();

  assert.deepEqual(
    filterAndSortPaperEntries(entries, { topic: "robotics" }).map((entry) => entry.slug),
    ["robotics-alpha", "control-gamma"],
  );
});

test("paper bibliography filters by year alone", async () => {
  const { filterAndSortPaperEntries } = await loadSubject();

  assert.deepEqual(
    filterAndSortPaperEntries(entries, { year: "2025" }).map((entry) => entry.slug),
    ["robotics-alpha", "control-gamma"],
  );
});

test("paper bibliography filters by venue alone", async () => {
  const { filterAndSortPaperEntries } = await loadSubject();

  assert.deepEqual(
    filterAndSortPaperEntries(entries, { venue: "ICRA" }).map((entry) => entry.slug),
    ["robotics-alpha", "control-gamma"],
  );
});

test("paper bibliography combines topic, year, and venue filters", async () => {
  const { filterAndSortPaperEntries } = await loadSubject();
  const result = filterAndSortPaperEntries(entries, {
    topic: "control",
    year: "2025",
    venue: "ICRA",
  });

  assert.deepEqual(result.map((entry) => entry.slug), ["control-gamma"]);
});

test("paper bibliography exposes a reusable clear/default state and treats oldest order as active", async () => {
  const {
    DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS,
    hasPaperBibliographyFilters,
  } = await loadSubject();

  assert.deepEqual(DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS, {
    query: "",
    readingMethods: [],
    readingStatus: "",
    topic: "",
    year: "",
    venue: "",
    order: "newest",
  });
  assert.equal(hasPaperBibliographyFilters(), false);
  assert.equal(hasPaperBibliographyFilters(DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS), false);
  assert.equal(hasPaperBibliographyFilters({ order: "oldest" }), true);
  assert.equal(hasPaperBibliographyFilters({ query: "robot" }), true);
  assert.equal(hasPaperBibliographyFilters({ readingMethods: ["deep"] }), true);
});
