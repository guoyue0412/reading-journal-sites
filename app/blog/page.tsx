import Link from "next/link";
import { ResearchShell } from "@/components/research-shell";
import { listPublicEntries } from "@/lib/blog/read-model";

export const dynamic = "force-dynamic";

const labels = { papers: "论文精读", jobs: "求职记录", internship: "项目进展", reflections: "随笔" } as const;

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const { q = "", type = "all" } = await searchParams;
  const needle = q.trim().toLowerCase();
  const entries = (await listPublicEntries()).filter((entry) =>
    (type === "all" || entry.type === type) &&
    (!needle || `${entry.title} ${entry.summary} ${entry.tags.join(" ")}`.toLowerCase().includes(needle)),
  );
  return <ResearchShell>
    <section className="research-intro"><p>WRITING</p><h1>Notes on embodied intelligence.</h1><span>研究笔记、论文精读与构建可靠具身系统的过程记录。</span></section>
    <section className="research-list-section">
      <form className="blog-filter" method="get"><input name="q" defaultValue={q} placeholder="搜索文章" aria-label="搜索文章" /><select name="type" defaultValue={type} aria-label="文章类型"><option value="all">全部</option><option value="papers">论文精读</option><option value="internship">项目进展</option><option value="jobs">求职记录</option><option value="reflections">随笔</option></select><button type="submit">筛选</button></form>
      <div className="research-list">{entries.map((entry) => <article key={entry.slug}><p>{labels[entry.type]} · <time dateTime={entry.date}>{entry.date}</time></p><h2><Link href={`/blog/${entry.slug}`}>{entry.title}</Link></h2><p>{entry.summary}</p><div>{entry.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></article>)}{!entries.length && <p className="empty-state">没有符合条件的已发布文章。</p>}</div>
    </section>
  </ResearchShell>;
}
