"use client";

import Link from "next/link";
import { useState } from "react";
import { PaperMethodBadges, readingStatusLabels } from "./paper-method-badges";
import type { ContentEntry, ReadingMethod, ReadingStatus } from "../lib/content/types";

const methods: [ReadingMethod, string][] = [["skim", "粗读"], ["deep", "细读"], ["synthesis", "总结"]];
const statuses = Object.entries(readingStatusLabels) as [ReadingStatus, string][];

function unique(values: (string | number | undefined)[]) {
  return [...new Set(values.filter((value) => value !== undefined))].map(String);
}

type PaperConnection = Pick<ContentEntry, "slug" | "title" | "type">;

export function PaperIndex({ entries, connections = {} }: { entries: ContentEntry[]; connections?: Record<string, PaperConnection[]> }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const [year, setYear] = useState("");
  const [venue, setVenue] = useState("");
  const [readingStatus, setReadingStatus] = useState("");
  const [readingMethod, setReadingMethod] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const topics = unique(entries.flatMap((entry) => entry.topics ?? []));
  const years = unique(entries.map((entry) => entry.year));
  const venues = unique(entries.map((entry) => entry.venue));
  const needle = query.trim().toLocaleLowerCase();
  const hasFilters = Boolean(query || topic || year || venue || readingStatus || readingMethod);

  const filteredEntries = entries.filter((entry) =>
    (!needle || [entry.title, entry.summary, entry.venue ?? "", ...(entry.authors ?? []), ...(entry.topics ?? [])].some((value) => value.toLocaleLowerCase().includes(needle))) &&
    (!topic || entry.topics?.includes(topic)) &&
    (!year || String(entry.year) === year) &&
    (!venue || entry.venue === venue) &&
    (!readingStatus || entry.readingStatus === readingStatus) &&
    (!readingMethod || entry.readingMethods?.includes(readingMethod as ReadingMethod))
  ).sort((left, right) => {
    const comparison = (left.readAt ?? left.date).localeCompare(right.readAt ?? right.date);
    return order === "newest" ? -comparison : comparison;
  });

  function clearFilters() {
    setQuery(""); setTopic(""); setYear(""); setVenue(""); setReadingStatus(""); setReadingMethod(""); setOrder("newest");
  }

  return (
    <>
      <div className="paper-filters panel-controls" aria-label="论文筛选">
        <label>关键词<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label>阅读方式<select value={readingMethod} onChange={(event) => setReadingMethod(event.target.value)}><option value="">全部方式</option>{methods.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>执行状态<select value={readingStatus} onChange={(event) => setReadingStatus(event.target.value)}><option value="">全部状态</option>{statuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>主题<select value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">全部主题</option>{topics.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>年份<select value={year} onChange={(event) => setYear(event.target.value)}><option value="">全部年份</option>{years.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>来源<select value={venue} onChange={(event) => setVenue(event.target.value)}><option value="">全部来源</option>{venues.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>排序<select value={order} onChange={(event) => setOrder(event.target.value as "newest" | "oldest")}><option value="newest">最近阅读</option><option value="oldest">最早阅读</option></select></label>
        {hasFilters ? <button type="button" onClick={clearFilters}>清除筛选</button> : null}
      </div>

      {!entries.length ? (
        <p className="empty-state">还没有论文阅读。前往<Link href="/editor">编辑器创建第一篇 Markdown</Link>，再放入论文内容目录。</p>
      ) : filteredEntries.length ? (
        <section aria-live="polite" aria-labelledby="paper-bibliography-title">
          <div className="paper-bibliography-heading"><p className="archive-kicker">BIBLIOGRAPHY</p><h2 id="paper-bibliography-title">论文档案</h2><p>{filteredEntries.length} 篇论文</p></div>
          <ol className="paper-bibliography">
            {filteredEntries.map((entry) => <li key={entry.slug}>
              <time dateTime={entry.readAt ?? entry.date}>{entry.readAt ?? entry.date}</time>
              <PaperMethodBadges methods={entry.readingMethods ?? []} status={entry.readingStatus ?? "queued"} showInactive={false} />
              <div>
                <h2><Link href={`/post/${entry.slug}`}>{entry.title}</Link></h2>
                <p className="paper-bibliography__source">{entry.authors?.join("、")} · {entry.year} · {entry.venue ?? "未注明来源"}</p>
                <ul className="paper-index-topics" aria-label="论文主题">{(entry.topics ?? []).map((value) => <li key={value}>{value}</li>)}</ul>
                {connections[entry.slug]?.length ? <nav className="paper-index-connections" aria-label="关联文章">{connections[entry.slug].map((related) => <Link href={`/post/${related.slug}`} key={related.slug}>{related.title}</Link>)}</nav> : null}
              </div>
              <span className="paper-bibliography__status">{readingStatusLabels[entry.readingStatus ?? "queued"]}</span>
            </li>)}
          </ol>
          <div className="paper-mobile-list">
            {filteredEntries.map((entry) => <article key={entry.slug}>
              <p>{entry.readAt ?? entry.date} · {entry.venue ?? "未注明来源"}</p>
              <h2><Link href={`/post/${entry.slug}`}>{entry.title}</Link></h2>
              <p>{entry.authors?.join("、")} · {entry.year}</p>
              <PaperMethodBadges methods={entry.readingMethods ?? []} status={entry.readingStatus ?? "queued"} showInactive={false} />
              <ul className="paper-index-topics" aria-label="论文主题">{(entry.topics ?? []).map((value) => <li key={value}>{value}</li>)}</ul>
              {connections[entry.slug]?.length ? <nav className="paper-index-connections" aria-label="关联文章">{connections[entry.slug].map((related) => <Link href={`/post/${related.slug}`} key={related.slug}>{related.title}</Link>)}</nav> : null}
              <p>{entry.summary}</p>
            </article>)}
          </div>
        </section>
      ) : (
        <div className="empty-state"><p>没有符合当前条件的论文，请调整上方筛选条件。</p><button type="button" onClick={clearFilters}>清除筛选</button></div>
      )}
    </>
  );
}
