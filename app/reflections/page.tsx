import Link from "next/link";
import { SiteShell } from "../../components/site-shell";
import { getEntriesByType } from "../../lib/content/query";
import { listPublicEntries } from "../../lib/blog/read-model";

export const dynamic = "force-dynamic";
export default async function ReflectionsPage() {
  const publicEntries = await listPublicEntries();
  const grouped = Object.entries(
    getEntriesByType("reflections", publicEntries).reduce<Record<string, ReturnType<typeof getEntriesByType>>>(
      (months, entry) => {
        const month = entry.date.slice(0, 7);
        (months[month] ??= []).push(entry);
        return months;
      },
      {},
    ),
  )
    .map(([month, entries]) => [
      month,
      entries.sort((left, right) => right.date.localeCompare(left.date)),
    ] as const)
    .sort(([left], [right]) => right.localeCompare(left));

  return (
    <SiteShell>
      <div className="index-page">
        <header className="archive-index-heading">
          <p className="archive-kicker">DAILY REFLECTIONS</p>
          <h1>个人感悟</h1>
          <p>以自然日为索引，收留那些尚未完成，却值得诚实记下的思考。</p>
        </header>
        <div className="archive-reflection-ledger">
          {grouped.length ? grouped.map(([month, entries]) => {
            const [year, monthNumber] = month.split("-");
            return (
              <section className="archive-reflection-month" key={month} aria-labelledby={`month-${month}`}>
                <h2 id={`month-${month}`}><span>{year}</span>{monthNumber} 月</h2>
                <div>
                  {entries.map((entry) => (
                    <article className="archive-reflection-day" key={entry.slug}>
                      <h3><Link href={`/post/${entry.slug}`}>{entry.date}</Link></h3>
                      <div>
                        <h4>{entry.title}</h4>
                        <p>{entry.summary}</p>
                        <ul className="tag-list" aria-label="标签">
                          {entry.tags.map((tag) => <li key={tag}>{tag}</li>)}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          }) : (
            <p className="empty-state">还没有个人感悟。前往<Link href="/editor">编辑器创建第一篇 Markdown</Link>，日期会成为它的自然日索引。</p>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
