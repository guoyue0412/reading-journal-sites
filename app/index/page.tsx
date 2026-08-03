import Link from "next/link";
import { ResearchShell } from "@/components/research-shell";
import { listPublicEntries } from "@/lib/blog/read-model";
import type { ContentEntry } from "@/lib/content/types";

export const dynamic = "force-dynamic";

const groups: Array<{ type: ContentEntry["type"]; title: string }> = [
  { type: "papers", title: "论文精读" },
  { type: "internship", title: "项目进展" },
  { type: "jobs", title: "求职记录" },
  { type: "reflections", title: "研究随笔" },
];

export default async function IndexPage() {
  const entries = await listPublicEntries();
  return <ResearchShell>
    <section className="research-intro"><p>KNOWLEDGE INDEX</p><h1>内容索引</h1><span>只保留标题与时间，作为所有 Markdown 文章的入口。</span></section>
    <section className="title-index" aria-label="文章索引">
      {groups.map((group) => {
        const items = entries.filter((entry) => entry.type === group.type);
        return <section key={group.type}><header><h2>{group.title}</h2><span>{items.length} 篇</span></header><ol>{items.map((entry) => <li key={entry.slug}><time dateTime={entry.date}>{entry.date}</time><Link href={`/blog/${entry.slug}`}>{entry.title}</Link></li>)}</ol></section>;
      })}
    </section>
  </ResearchShell>;
}
