import { ResearchProjectList } from "@/components/research-project-list";
import { ResearchShell } from "@/components/research-shell";
import { researchProjects } from "@/lib/research/archive";

export default function ProjectsPage() {
  return <ResearchShell>
    <header className="archive-page-heading"><p className="archive-kicker">SELECTED WORK</p><h1>研究项目</h1><p>从研究问题、个人贡献和可验证产物理解每一项工作。</p></header>
    <section className="archive-page-section" aria-label="研究项目档案"><ResearchProjectList projects={researchProjects} /></section>
  </ResearchShell>;
}
