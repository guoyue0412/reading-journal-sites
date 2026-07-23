import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { ContentEntry } from "../lib/content/types";

const typeLabels: Record<ContentEntry["type"], string> = {
  jobs: "秋招记录",
  internship: "实习日记",
  papers: "论文阅读",
  reflections: "个人感悟",
};

const readingStatusLabels = {
  queued: "待读",
  reading: "在读",
  reviewed: "已精读",
  reproduced: "已复现",
} as const;

export function MarkdownArticle({
  entry,
  relatedEntries,
}: {
  entry: ContentEntry;
  relatedEntries: ContentEntry[];
}) {
  return (
    <article className="article-page">
      <Link className="article-back" href={`/${entry.type}`}>
        ← 返回{typeLabels[entry.type]}
      </Link>
      <header className="article-header">
        <p className="eyebrow">{typeLabels[entry.type]}</p>
        <h1>{entry.title}</h1>
        <p className="article-summary">{entry.summary}</p>
        <dl className="article-meta">
          <div>
            <dt>日期</dt>
            <dd>{entry.readAt ?? entry.date}</dd>
          </div>
          {entry.authors?.length ? (
            <div>
              <dt>作者</dt>
              <dd>{entry.authors.join("、")}</dd>
            </div>
          ) : null}
          {entry.venue ? (
            <div>
              <dt>来源</dt>
              <dd>{entry.venue}</dd>
            </div>
          ) : null}
          {entry.year ? (
            <div>
              <dt>年份</dt>
              <dd>{entry.year}</dd>
            </div>
          ) : null}
          {entry.readingStatus ? (
            <div>
              <dt>阅读状态</dt>
              <dd>{readingStatusLabels[entry.readingStatus]}</dd>
            </div>
          ) : null}
          {entry.paperUrl ? (
            <div>
              <dt>论文</dt>
              <dd>
                <a href={entry.paperUrl}>查看原文 ↗</a>
              </dd>
            </div>
          ) : null}
        </dl>
        <ul className="tag-list" aria-label="文章标签">
          {entry.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </header>

      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        >
          {entry.body}
        </ReactMarkdown>
      </div>

      {relatedEntries.length ? (
        <aside className="article-related" aria-label="相关文章与日记">
          <p className="eyebrow">CONNECTIONS</p>
          <h2>相关文章与日记</h2>
          <div className="article-related-list">
            {relatedEntries.map((related) => (
              <Link href={`/post/${related.slug}`} key={related.slug}>
                <span>{typeLabels[related.type]}</span>
                {related.title}
              </Link>
            ))}
          </div>
        </aside>
      ) : null}
    </article>
  );
}
