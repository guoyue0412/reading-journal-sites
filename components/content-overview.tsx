import type { ContentEntry } from "@/lib/content/types";

const modules: Array<{ type: ContentEntry["type"]; label: string; target: number; note: string }> = [
  { type: "papers", label: "论文精读", target: 12, note: "每月沉淀一篇可复用的研究笔记" },
  { type: "internship", label: "项目进展", target: 8, note: "记录关键实验、系统迭代与复盘" },
  { type: "jobs", label: "求职记录", target: 6, note: "保留面试、选择与能力建设轨迹" },
  { type: "reflections", label: "研究随笔", target: 24, note: "持续写下问题、观察与长期思考" },
];

function activityLabel(count: number) {
  if (count >= 3) return "高活跃";
  if (count >= 1) return "持续更新";
  return "等待更新";
}

export function ContentOverview({ entries }: { entries: ContentEntry[] }) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  return <section className="content-overview" aria-labelledby="content-overview-title">
    <header><div><p>CONTENT PULSE</p><h2 id="content-overview-title">内容总览</h2></div><span>过去 30 天的发布活跃度</span></header>
    <div className="content-overview-grid">
      {modules.map((module) => {
        const items = entries.filter((entry) => entry.type === module.type);
        const activity = items.filter((entry) => new Date(`${entry.date}T00:00:00`) >= cutoff).length;
        const completion = Math.min(100, Math.round((items.length / module.target) * 100));
        return <article key={module.type}>
          <div className="overview-title"><h3>{module.label}</h3><span className={activity ? "is-active" : ""}>{activityLabel(activity)}</span></div>
          <p className="overview-count"><strong>{items.length}</strong><span> / {module.target} 篇</span></p>
          <div className="overview-progress" aria-label={`${module.label}完成度 ${completion}%`}><span style={{ width: `${completion}%` }} /></div>
          <p className="overview-note">{module.note}</p>
          <p className="overview-activity">近 30 天发布 <strong>{activity}</strong> 篇</p>
        </article>;
      })}
    </div>
  </section>;
}
