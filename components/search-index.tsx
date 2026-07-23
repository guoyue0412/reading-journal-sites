"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { searchEntries } from "../lib/content/query";
import type { ContentEntry, ContentType } from "../lib/content/types";

const modules: { type: ContentType; label: string }[] = [
  { type: "jobs", label: "秋招记录" },
  { type: "internship", label: "实习日记" },
  { type: "papers", label: "论文阅读" },
  { type: "reflections", label: "个人感悟" },
];

export function SearchIndex({ entries }: { entries: ContentEntry[] }) {
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<ContentType | "">("");
  const results = useMemo(() => {
    const matches = query.trim() ? searchEntries(query) : entries;
    return activeType
      ? matches.filter((entry) => entry.type === activeType)
      : matches;
  }, [activeType, entries, query]);

  return (
    <section className="search-index" aria-label="全站内容搜索">
      <label htmlFor="site-search">搜索文章、标签与论文主题</label>
      <input
        id="site-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="例如：触觉、秋招、arXiv"
      />
      <div className="search-chips" aria-label="按内容类型筛选">
        <button
          type="button"
          aria-pressed={!activeType}
          onClick={() => setActiveType("")}
        >
          全部
        </button>
        {modules.map((module) => (
          <button
            type="button"
            aria-pressed={activeType === module.type}
            onClick={() => setActiveType(module.type)}
            key={module.type}
          >
            {module.label}
          </button>
        ))}
      </div>
      <p className="search-count" aria-live="polite">
        {results.length} 篇内容
      </p>
      <div className="search-results">
        {results.length ? (
          results.map((entry) => (
            <article key={entry.slug}>
              <p>
                {modules.find((module) => module.type === entry.type)?.label} · {entry.date}
              </p>
              <h2>
                <Link href={`/post/${entry.slug}`}>{entry.title}</Link>
              </h2>
              <p>{entry.summary}</p>
            </article>
          ))
        ) : (
          <p className="empty-state">没有找到匹配的内容，试试更短的关键词。</p>
        )}
      </div>
    </section>
  );
}
