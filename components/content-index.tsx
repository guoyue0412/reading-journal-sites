import Link from "next/link";
import type { ContentEntry } from "../lib/content/types";

const typeLabels: Record<ContentEntry["type"], string> = {
  jobs: "秋招记录",
  internship: "实习日记",
  papers: "论文阅读",
  reflections: "个人感悟",
};

export function ContentIndex({
  title,
  description,
  entries,
}: {
  title: string;
  description: string;
  entries: ContentEntry[];
}) {
  return (
    <div className="index-page">
      <header className="archive-index-heading">
        <p className="archive-kicker">{typeLabels[entries[0]?.type] ?? "内容索引"}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <section className="archive-index-list" aria-label={`${title}文章列表`}>
        {entries.length ? (
          entries.map((entry, index) => (
            <article className="archive-index-entry" key={entry.slug}>
              <span className="entry-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="entry-date">{entry.date}</p>
                <h2>
                  <Link href={`/post/${entry.slug}`}>{entry.title}</Link>
                </h2>
                <p className="entry-summary">{entry.summary}</p>
                <ul className="tag-list" aria-label="标签">
                  {entry.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </div>
              <span className="entry-arrow" aria-hidden="true">
                →
              </span>
            </article>
          ))
        ) : (
          <p className="empty-state">这里还没有文章。前往<Link href="/editor">编辑器创建第一篇 Markdown</Link>，导出后放入对应内容目录。</p>
        )}
      </section>
    </div>
  );
}
