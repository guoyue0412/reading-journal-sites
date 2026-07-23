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
          <p>每篇论文按实际采用的粗读、细读与总结方式归档；阅读方式可组合，执行状态保持唯一。</p>
        </header>
        <PaperIndex entries={getEntriesByType("papers")} />
      </div>
    </SiteShell>
  );
}
