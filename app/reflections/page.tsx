import Link from "next/link";
import { SiteShell } from "../../components/site-shell";
import { getEntriesByType } from "../../lib/content/query";

export default function ReflectionsPage() {
  const grouped = Object.entries(
    getEntriesByType("reflections").reduce<Record<string, ReturnType<typeof getEntriesByType>>>(
      (months, entry) => {
        const month = entry.date.slice(0, 7);
        (months[month] ??= []).push(entry);
        return months;
      },
      {},
    ),
  ).sort(([left], [right]) => right.localeCompare(left));

  return (
    <SiteShell>
      <div className="index-page">
        <header className="index-heading">
          <p className="eyebrow">DAILY REFLECTIONS</p>
          <h1>个人感悟</h1>
          <p>以自然日为索引，收留那些尚未完成，却值得诚实记下的思考。</p>
        </header>
        <div className="reflection-archive">
          {grouped.map(([month, entries]) => {
            const [year, monthNumber] = month.split("-");
            return (
              <section className="reflection-month" key={month} aria-labelledby={`month-${month}`}>
                <h2 id={`month-${month}`}><span>{year}</span>{monthNumber} 月</h2>
                <div>
                  {entries.map((entry) => (
                    <article className="reflection-day" key={entry.slug}>
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
          })}
        </div>
      </div>
    </SiteShell>
  );
}
