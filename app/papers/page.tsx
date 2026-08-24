import { PaperIndex } from "../../components/paper-index";
import { ResearchShell } from "../../components/research-shell";
import { getEntriesByType, getRelatedEntries } from "../../lib/content/query";
import { listPublicEntries } from "../../lib/blog/read-model";

export default async function PapersPage() {
  const allEntries = await listPublicEntries();
  const entries = getEntriesByType("papers", allEntries);
  const connections = Object.fromEntries(entries.map((entry) => [
    entry.slug,
    getRelatedEntries(entry.slug, allEntries).slice(0, 3).map(({ slug, title, type }) => ({ slug, title, type })),
  ]));
  return (
    <ResearchShell>
      <header className="archive-page-heading">
        <p className="archive-kicker">RESEARCH READING</p>
        <h1>论文阅读</h1>
        <p>每篇论文按实际采用的粗读、细读与总结方式归档；阅读方式可组合，执行状态保持唯一。</p>
      </header>
      <section className="archive-page-section" aria-label="论文阅读档案">
        <PaperIndex entries={entries} connections={connections} />
      </section>
    </ResearchShell>
  );
}
