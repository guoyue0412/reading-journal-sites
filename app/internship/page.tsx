import { ContentIndex } from "../../components/content-index";
import { SiteShell } from "../../components/site-shell";
import { getEntriesByType } from "../../lib/content/query";

export default function InternshipPage() {
  return (
    <SiteShell>
      <ContentIndex
        title="实习日记"
        description="把学习放进真实世界检验，留下关于工程、协作与成长的现场笔记。"
        entries={getEntriesByType("internship")}
      />
    </SiteShell>
  );
}
