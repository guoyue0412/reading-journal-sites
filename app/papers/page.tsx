import { PaperIndex } from "../../components/paper-index";
import { SiteShell } from "../../components/site-shell";
import { getEntriesByType } from "../../lib/content/query";

export default function PapersPage() {
  return (
    <SiteShell>
      <div className="index-page">
        <header className="index-heading">
          <p className="eyebrow">RESEARCH READING</p>
          <h1>论文阅读</h1>
          <p>从具身智能、VLA 与触觉研究中，整理问题、方法和仍待验证的判断。</p>
        </header>
        <PaperIndex entries={getEntriesByType("papers")} />
      </div>
    </SiteShell>
  );
}
