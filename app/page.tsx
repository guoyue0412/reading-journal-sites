import Link from "next/link";
import { ProgressOverview } from "../components/progress-overview";
import { SiteShell } from "../components/site-shell";
import { getEntriesByType, getPaperStatusCounts, getRecentEntries, getRecruitingStageCounts, getRelatedEntries } from "../lib/content/query";

const modules = [
  ["01", "/jobs", "秋招记录", "选择、碰撞与重新认识自己"],
  ["02", "/internship", "实习日记", "把学习放进真实世界里检验"],
  ["03", "/papers", "论文阅读", "具身智能、VLA 与触觉研究"],
  ["04", "/reflections", "个人感悟", "关于成长、关系与长期主义"],
] as const;

const typeLabels = {
  jobs: "秋招记录",
  internship: "实习日记",
  papers: "论文阅读",
  reflections: "个人感悟",
};

export default function Home() {
  const recentEntries = getRecentEntries(4);
  const reflection = getEntriesByType("reflections")[0];
  const related = reflection ? getRelatedEntries(reflection.slug).slice(0, 3) : [];

  return (
    <SiteShell>
      <section className="home-hero" aria-labelledby="hero-title">
        <div>
          <p className="hero-kicker"><span aria-hidden="true" />写给自己，也与世界分享</p>
          <h1 id="hero-title">在具体的生活里，<br />留下诚实的文字。</h1>
        </div>
        <p className="editor-note"><strong>编者的话</strong>这里记录求职、工作与研究，也收留那些还没有答案的时刻。慢一点写，清楚一点想。</p>
      </section>

      <section className="module-grid" aria-label="文章模块">
        {modules.map(([number, href, title, description]) => (
          <Link className="module-card" href={href} key={href}>
            <span className="module-number">{number}</span>
            <span className="module-arrow" aria-hidden="true">→</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </Link>
        ))}
      </section>

      <section className="editorial-section recent-section" aria-labelledby="recent-title">
        <div className="section-intro">
          <p className="eyebrow">LATEST NOTES</p>
          <h2 id="recent-title">近期阅读与记录</h2>
          <p>按真实阅读与写作时间排列，留下最近正在形成的思考。</p>
        </div>
        <div className="recent-list">
          {recentEntries.map((entry, index) => (
            <article className="recent-entry" key={entry.slug}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3><Link href={`/post/${entry.slug}`}>{entry.title}</Link></h3>
              <p>{typeLabels[entry.type]}</p>
            </article>
          ))}
        </div>
      </section>

      <ProgressOverview paperCounts={getPaperStatusCounts()} recruitingCounts={getRecruitingStageCounts()} />

      <section className="editorial-section split-section" aria-labelledby="reflection-title">
        <div>
          <p className="eyebrow">DAILY NOTE</p>
          <h2 id="reflection-title">今日感悟</h2>
        </div>
        {reflection ? (
          <article className="reflection-feature">
            <time dateTime={reflection.date}>{reflection.date}</time>
            <h3><Link href={`/post/${reflection.slug}`}>{reflection.title}</Link></h3>
            <p>{reflection.summary}</p>
          </article>
        ) : <p className="empty-state">今天还没有写下新的感悟。</p>}
      </section>

      <section className="relation-strip" aria-labelledby="relation-title">
        <div>
          <p className="eyebrow">CROSS REFERENCES</p>
          <h2 id="relation-title">同一段时间，不同侧面的记录</h2>
        </div>
        <div className="relation-links">
          {related.map((entry) => (
            <Link href={`/post/${entry.slug}`} key={entry.slug}>
              <span>{typeLabels[entry.type]}</span>{entry.title}
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
