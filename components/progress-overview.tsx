import Link from "next/link";
import type { ApplicationStage, ReadingStatus } from "../lib/content/types";

const paperLabels: Record<ReadingStatus, string> = {
  queued: "待读",
  in_progress: "阅读中",
  synthesizing: "总结中",
  completed: "已完成",
  archived: "已归档",
};

const recruitingLabels: Record<ApplicationStage, string> = {
  applied: "已投递",
  written_test: "笔试中",
  interview: "面试中",
  offer: "Offer",
  closed: "结束",
};

function CountList<T extends string>({ counts, labels }: { counts: Record<T, number>; labels: Record<T, string> }) {
  return (
    <ul>
      {(Object.entries(labels) as [T, string][]).map(([key, label]) => (
        <li key={key}><strong>{counts[key]}</strong><span>{label}</span></li>
      ))}
    </ul>
  );
}

export function ProgressOverview({
  paperCounts,
  recruitingCounts,
}: {
  paperCounts: Record<ReadingStatus, number>;
  recruitingCounts: Record<ApplicationStage, number>;
}) {
  return (
    <section className="progress-overview" aria-label="研究与求职进展">
      <article>
        <header><p className="eyebrow">READING MAP</p><h2>论文阅读概览</h2></header>
        <CountList counts={paperCounts} labels={paperLabels} />
        <Link href="/papers">查看阅读方式矩阵 <span aria-hidden="true">→</span></Link>
      </article>
      <article>
        <header><p className="eyebrow">RECRUITING MAP</p><h2>秋招进展概览</h2></header>
        <CountList counts={recruitingCounts} labels={recruitingLabels} />
        <Link href="/jobs">查看岗位档案 <span aria-hidden="true">→</span></Link>
      </article>
    </section>
  );
}
