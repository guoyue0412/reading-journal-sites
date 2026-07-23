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

export function PaperIndex({ entries }: { entries: ContentEntry[] }) {
  const [topic, setTopic] = useState("");
  const [year, setYear] = useState("");
  const [venue, setVenue] = useState("");
  const [readingStatus, setReadingStatus] = useState("");
  const [readingMethod, setReadingMethod] = useState("");
  const topics = unique(entries.flatMap((entry) => entry.topics ?? []));
  const years = unique(entries.map((entry) => entry.year));
  const venues = unique(entries.map((entry) => entry.venue));
  const hasFilters = Boolean(topic || year || venue || readingStatus || readingMethod);

  const filteredEntries = entries.filter((entry) =>
    (!topic || entry.topics?.includes(topic)) &&
    (!year || String(entry.year) === year) &&
    (!venue || entry.venue === venue) &&
    (!readingStatus || entry.readingStatus === readingStatus) &&
    (!readingMethod || entry.readingMethods?.includes(readingMethod as ReadingMethod)),
  );

  function clearFilters() {
    setTopic(""); setYear(""); setVenue(""); setReadingStatus(""); setReadingMethod("");
  }

  return (
    <>
      <div className="paper-filters" aria-label="论文筛选">
        <label>阅读方式<select value={readingMethod} onChange={(event) => setReadingMethod(event.target.value)}>
          <option value="">全部方式</option>{methods.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
        <label>执行状态<select value={readingStatus} onChange={(event) => setReadingStatus(event.target.value)}>
          <option value="">全部状态</option>{statuses.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
        <label>主题<select value={topic} onChange={(event) => setTopic(event.target.value)}>
          <option value="">全部主题</option>{topics.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label>年份<select value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="">全部年份</option>{years.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label>来源<select value={venue} onChange={(event) => setVenue(event.target.value)}>
          <option value="">全部来源</option>{venues.map((value) => <option key={value}>{value}</option>)}
        </select></label>
        {hasFilters ? <button type="button" onClick={clearFilters}>清除筛选</button> : null}
      </div>

      {!entries.length ? (
        <p className="empty-state">还没有论文阅读。前往<Link href="/editor">编辑器创建第一篇 Markdown</Link>，再放入论文内容目录。</p>
      ) : filteredEntries.length ? (
        <section className="paper-matrix-section" aria-live="polite" aria-labelledby="paper-matrix-title">
          <div className="paper-matrix-heading"><p className="eyebrow">READING METHODS</p><h2 id="paper-matrix-title">阅读方式矩阵</h2><p>{filteredEntries.length} 篇论文</p></div>
          <table className="paper-matrix">
            <thead><tr><th scope="col">论文</th>{methods.map(([, label]) => <th scope="col" key={label}>{label}</th>)}<th scope="col">执行状态</th></tr></thead>
            <tbody>{filteredEntries.map((entry) => (
              <tr key={entry.slug}>
                <th scope="row"><Link href={`/post/${entry.slug}`}>{entry.title}</Link><span>{entry.year} · {entry.venue}</span></th>
                {methods.map(([method, label]) => { const active = entry.readingMethods?.includes(method) ?? false; return <td key={method}><span aria-hidden="true">{active ? "●" : "—"}</span><span className="sr-only">{label}{active ? "已采用" : "未采用"}</span></td>; })}
                <td>{readingStatusLabels[entry.readingStatus ?? "queued"]}</td>
              </tr>
            ))}</tbody>
          </table>
          <div className="paper-mobile-list">{filteredEntries.map((entry) => (
            <article key={entry.slug}>
              <p>{entry.year} · {entry.venue ?? "未注明来源"} · {readingStatusLabels[entry.readingStatus ?? "queued"]}</p>
              <h2><Link href={`/post/${entry.slug}`}>{entry.title}</Link></h2>
              <PaperMethodBadges methods={entry.readingMethods ?? []} status={entry.readingStatus ?? "queued"} />
              <p>{entry.summary}</p>
            </article>
          ))}</div>
        </section>
      ) : (
        <div className="empty-state"><p>没有符合当前条件的论文，请调整上方筛选条件。</p><button type="button" onClick={clearFilters}>清除筛选</button></div>
      )}
    </>
  );
}
