"use client";

import Link from "next/link";
import { useState } from "react";
import type { ApplicationStage, ContentEntry } from "../lib/content/types";

const stageLabels: Record<ApplicationStage, string> = {
  applied: "投递",
  written_test: "笔试",
  interview: "面试",
  offer: "Offer",
  closed: "结束",
};

const stages = Object.entries(stageLabels) as [ApplicationStage, string][];

export function RecruitingIndex({ entries }: { entries: ContentEntry[] }) {
  const [activeStage, setActiveStage] = useState<ApplicationStage | "">("");
  const counts = Object.fromEntries(stages.map(([stage]) => [stage, entries.filter((entry) => entry.applicationStage === stage).length])) as Record<ApplicationStage, number>;
  const filteredEntries = activeStage ? entries.filter((entry) => entry.applicationStage === activeStage) : entries;

  return (
    <>
      <section className="recruiting-funnel" aria-label="秋招阶段筛选">
        {stages.map(([stage, label]) => (
          <button type="button" key={stage} aria-pressed={activeStage === stage} onClick={() => setActiveStage(activeStage === stage ? "" : stage)}>
            <strong>{counts[stage]}</strong><span>{label}</span>
          </button>
        ))}
      </section>
      <div className="recruiting-list" aria-live="polite">
        {!entries.length ? (
          <p className="empty-state">还没有秋招岗位档案。前往<Link href="/editor">编辑器创建第一篇 Markdown</Link>。</p>
        ) : filteredEntries.length ? filteredEntries.map((entry) => (
          <article className="recruiting-card" key={entry.slug}>
            <div className="recruiting-card__stage"><span>当前阶段</span><strong>{stageLabels[entry.applicationStage ?? "applied"]}</strong></div>
            <div className="recruiting-card__body">
              <p>{entry.company}{entry.location ? ` · ${entry.location}` : ""}{entry.appliedAt ? ` · ${entry.appliedAt}` : ""}</p>
              <h2><Link href={`/post/${entry.slug}`}>{entry.role}</Link></h2>
              <p>{entry.summary}</p>
              {entry.nextAction ? <p className="recruiting-card__next"><span>下一步</span>{entry.nextAction}</p> : null}
            </div>
            <Link className="recruiting-card__link" href={`/post/${entry.slug}`} aria-label={`查看${entry.company}${entry.role}档案`}>→</Link>
          </article>
        )) : (
          <div className="empty-state"><p>当前阶段还没有岗位档案。</p><button type="button" onClick={() => setActiveStage("")}>清除筛选</button></div>
        )}
      </div>
      {activeStage && filteredEntries.length ? <button className="recruiting-reset" type="button" onClick={() => setActiveStage("")}>清除筛选</button> : null}
    </>
  );
}

export { stageLabels as applicationStageLabels };
