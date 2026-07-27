import { RecruitingIndex } from "../../components/recruiting-index";
import { SiteShell } from "../../components/site-shell";
import { getRecentEntriesByType } from "../../lib/content/query";
import { listPublicEntries } from "../../lib/blog/read-model";

export const dynamic = "force-dynamic";
export default async function JobsPage() {
  const entries = await listPublicEntries();
  return (
    <SiteShell>
      <div className="index-page">
        <header className="index-heading">
          <p className="eyebrow">RECRUITING ARCHIVE</p>
          <h1>秋招进展</h1>
          <p>以岗位为独立档案，记录投递、笔试、面试与最终结果，也留下每一步真正需要补强的能力。</p>
        </header>
        <RecruitingIndex entries={getRecentEntriesByType("jobs", Number.MAX_SAFE_INTEGER, entries)} />
      </div>
    </SiteShell>
  );
}
