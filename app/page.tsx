import Link from "next/link";
import { methodLabels, readingStatusLabels } from "@/components/paper-method-badges";
import { ResearchProjectList } from "@/components/research-project-list";
import { ResearchShell } from "@/components/research-shell";
import { ResearchTopicIndex } from "@/components/research-topic-index";
import { getRecentEntries, getRecentEntriesByType } from "@/lib/content/query";
import { listPublicEntries } from "@/lib/blog/read-model";
import type { ContentType } from "@/lib/content/types";
import { researchProfile, researchProjects, researchTopics } from "@/lib/research/archive";

export const dynamic = "force-dynamic";

const recordTypeLabels: Record<ContentType, string> = {
  jobs: "秋招记录",
  internship: "实习日记",
  papers: "论文阅读",
  reflections: "个人感悟",
};

export default async function Home() {
  const entries = await listPublicEntries();
  const papers = getRecentEntriesByType("papers", 3, entries);
  const records = getRecentEntries(4, entries.filter((entry) => entry.type !== "papers"));

  return <ResearchShell>
    <section className="archive-hero">
      <div><p className="archive-kicker">{researchProfile.field}</p><h1>{researchProfile.name}<span>{researchProfile.latinName}</span></h1><p>{researchProfile.statement}</p><nav aria-label="研究者资料">{researchProfile.links.map((item) => item.href.startsWith("http") ? <a href={item.href} rel="me" key={item.href}>{item.label}</a> : <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav></div>
      <aside aria-labelledby="current-question"><p className="archive-kicker">CURRENT QUESTION</p><h2 id="current-question">当前研究问题</h2><p>{researchProfile.currentQuestion}</p><time dateTime="2026-08-09">更新于 2026.08.09</time></aside>
    </section>
    <section className="archive-section" aria-labelledby="selected-projects"><header><p className="archive-kicker">SELECTED WORK</p><h2 id="selected-projects">精选研究项目</h2><Link href="/projects">完整项目档案 →</Link></header><ResearchProjectList projects={researchProjects} compact /></section>
    <section className="archive-section"><ResearchTopicIndex topics={researchTopics} /></section>
    <section className="archive-section" aria-labelledby="recent-papers"><header><p className="archive-kicker">RECENT READING</p><h2 id="recent-papers">最近论文阅读</h2><Link href="/papers">论文索引 →</Link></header><ol className="archive-reading-list">{papers.map((entry) => <li key={entry.slug}><time dateTime={entry.readAt ?? entry.date}>{entry.readAt ?? entry.date}</time><div><p>{(entry.readingMethods ?? []).map((method) => methodLabels[method]).join(" · ") || "尚未选择阅读方式"} · {readingStatusLabels[entry.readingStatus ?? "queued"]}</p><h3><Link href={`/post/${entry.slug}`}>{entry.title}</Link></h3><p>{entry.summary}</p></div></li>)}</ol></section>
    <section className="archive-section" aria-labelledby="recent-records"><header><p className="archive-kicker">FIELD NOTES</p><h2 id="recent-records">研究之外的记录</h2><Link href="/index">完整内容索引 →</Link></header><ol className="archive-record-list">{records.map((entry) => <li key={entry.slug}><time dateTime={entry.date}>{entry.date}</time><Link href={`/post/${entry.slug}`}>{entry.title}</Link><span>{recordTypeLabels[entry.type]}</span></li>)}</ol></section>
  </ResearchShell>;
}
