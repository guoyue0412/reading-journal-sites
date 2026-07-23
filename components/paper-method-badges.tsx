import type { ReadingMethod, ReadingStatus } from "../lib/content/types";

const methodLabels: Record<ReadingMethod, string> = {
  skim: "粗读",
  deep: "细读",
  synthesis: "总结",
};

const statusLabels: Record<ReadingStatus, string> = {
  queued: "待读",
  in_progress: "阅读中",
  synthesizing: "总结中",
  completed: "已完成",
  archived: "已归档",
};

export function PaperMethodBadges({
  methods,
  status,
  showInactive = true,
}: {
  methods: ReadingMethod[];
  status: ReadingStatus;
  showInactive?: boolean;
}) {
  const entries = Object.entries(methodLabels) as [ReadingMethod, string][];
  return (
    <div className="paper-methods" aria-label={`阅读状态：${statusLabels[status]}`}>
      {entries.map(([method, label]) => {
        const active = methods.includes(method);
        if (!active && !showInactive) return null;
        return (
          <span className={`paper-method${active ? " is-active" : ""}`} key={method}>
            <span aria-hidden="true">{active ? "●" : "—"}</span>
            {label}
            <span className="sr-only">{active ? "已采用" : "未采用"}</span>
          </span>
        );
      })}
    </div>
  );
}

export { methodLabels, statusLabels as readingStatusLabels };
