import Link from "next/link";
import { ResearchShell } from "@/components/research-shell";
import { listPublicEntries } from "@/lib/blog/read-model";

export const dynamic = "force-dynamic";

const labels = {
  papers: "论文阅读",
  jobs: "秋招记录",
  internship: "实习日记",
  reflections: "个人随笔",
} as const;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: unknown; type?: unknown }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const type = typeof params.type === "string" ? params.type : "all";
  const needle = q.trim().toLocaleLowerCase();
  const entries = (await listPublicEntries()).filter(
    (entry) =>
      (type === "all" || entry.type === type) &&
      (!needle ||
        [entry.title, entry.summary, ...entry.tags].some((value) =>
          value.toLocaleLowerCase().includes(needle),
        )),
  );

  return (
    <ResearchShell>
      <div className="index-page">
        <header className="archive-index-heading">
          <p className="archive-kicker">WRITING</p>
          <h1>记录</h1>
          <p>论文之外，保存秋招、实习和每日思考。</p>
        </header>
        <form className="archive-record-filter" method="get">
          <label>
            搜索
            <input type="search" name="q" defaultValue={q} />
          </label>
          <label>
            类型
            <select name="type" defaultValue={type}>
              <option value="all">全部</option>
              {Object.entries(labels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">筛选</button>
        </form>
        <ol className="archive-record-list">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <time dateTime={entry.date}>{entry.date}</time>
              <Link href={`/blog/${entry.slug}`}>{entry.title}</Link>
              <span>{labels[entry.type]}</span>
            </li>
          ))}
        </ol>
        {!entries.length ? (
          <p className="empty-state">没有符合条件的已发布文章。</p>
        ) : null}
      </div>
    </ResearchShell>
  );
}
