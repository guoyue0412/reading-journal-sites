import Link from "next/link";
import { ResearchShell } from "@/components/research-shell";
import { listPublicEntries } from "@/lib/blog/read-model";
import type { ContentEntry } from "@/lib/content/types";

export const dynamic = "force-dynamic";

const groups: Array<{ type: ContentEntry["type"]; title: string }> = [
  { type: "papers", title: "论文精读" },
  { type: "internship", title: "实习日记" },
  { type: "jobs", title: "秋招记录" },
  { type: "reflections", title: "个人随笔" },
];

export default async function IndexPage() {
  const entries = await listPublicEntries();

  return (
    <ResearchShell>
      <div className="index-page">
        <header className="archive-index-heading">
          <p className="archive-kicker">KNOWLEDGE INDEX</p>
          <h1>完整内容索引</h1>
          <p>四类内容独立归档，通过时间、标签和关联文章共同连接。</p>
        </header>
        <div className="archive-index-groups">
          {groups.map((group) => {
            const items = entries.filter((entry) => entry.type === group.type);
            return (
              <section key={group.type}>
                <header>
                  <h2>{group.title}</h2>
                  <span>{items.length} 篇</span>
                </header>
                <ol>
                  {items.map((entry) => (
                    <li key={entry.slug}>
                      <time dateTime={entry.date}>{entry.date}</time>
                      <Link href={`/post/${entry.slug}`}>{entry.title}</Link>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      </div>
    </ResearchShell>
  );
}
