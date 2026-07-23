"use client";

import Link from "next/link";
import { useState } from "react";
import type { ContentEntry } from "../lib/content/types";

const statusLabels = {
  queued: "待读",
  reading: "在读",
  reviewed: "已精读",
  reproduced: "已复现",
} as const;

function unique(values: (string | number | undefined)[]) {
  return [...new Set(values.filter((value) => value !== undefined))].map(String);
}

export function PaperIndex({ entries }: { entries: ContentEntry[] }) {
  const [topic, setTopic] = useState("");
  const [year, setYear] = useState("");
  const [venue, setVenue] = useState("");
  const [readingStatus, setReadingStatus] = useState("");
  const topics = unique(entries.flatMap((entry) => entry.topics ?? []));
  const years = unique(entries.map((entry) => entry.year));
  const venues = unique(entries.map((entry) => entry.venue));

  const filteredEntries = entries.filter(
    (entry) =>
      (!topic || entry.topics?.includes(topic)) &&
      (!year || String(entry.year) === year) &&
      (!venue || entry.venue === venue) &&
      (!readingStatus || entry.readingStatus === readingStatus),
  );

  return (
    <>
      <div className="paper-filters" aria-label="论文筛选">
        <label>
          主题
          <select value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option value="">全部主题</option>
            {topics.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          年份
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">全部年份</option>
            {years.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          来源
          <select value={venue} onChange={(event) => setVenue(event.target.value)}>
            <option value="">全部来源</option>
            {venues.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          状态
          <select value={readingStatus} onChange={(event) => setReadingStatus(event.target.value)}>
            <option value="">全部状态</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      <section className="paper-list" aria-live="polite" aria-label="论文阅读列表">
        {filteredEntries.length ? filteredEntries.map((entry, index) => (
          <article className="paper-entry" key={entry.slug}>
            <span className="entry-number">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <p className="paper-meta">
                {entry.year} · {entry.venue ?? "未注明来源"} · {statusLabels[entry.readingStatus ?? "queued"]}
              </p>
              <h2><Link href={`/post/${entry.slug}`}>{entry.title}</Link></h2>
              <p className="entry-summary">{entry.summary}</p>
              <ul className="tag-list" aria-label="论文主题">
                {(entry.topics ?? []).map((value) => <li key={value}>{value}</li>)}
              </ul>
            </div>
          </article>
        )) : <p className="empty-state">没有符合当前条件的论文。</p>}
      </section>
    </>
  );
}
