import { ContentIndex } from "../../components/content-index";
import { SiteShell } from "../../components/site-shell";
import { getEntriesByType } from "../../lib/content/query";

export default function JobsPage() {
  return (
    <SiteShell>
      <ContentIndex
        title="秋招记录"
        description="记录选择、面试与复盘，也记录在碰撞中逐渐清晰的方向。"
        entries={getEntriesByType("jobs")}
      />
    </SiteShell>
  );
}
