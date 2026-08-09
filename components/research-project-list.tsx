import Link from "next/link";
import type { ResearchProject } from "@/lib/research/archive";

export function ResearchProjectList({ projects, compact = false }: { projects: ResearchProject[]; compact?: boolean }) {
  return <ol className={compact ? "archive-projects archive-projects--compact" : "archive-projects"}>
    {projects.map((project, index) => <li id={project.id} key={project.id}>
      <span className="archive-projects__number">{String(index + 1).padStart(2, "0")}</span>
      <article>
        <p className="archive-kicker">{project.field}</p>
        <h3>{project.title}</h3>
        <dl>
          <div><dt>研究问题</dt><dd>{project.question}</dd></div>
          <div><dt>研究贡献</dt><dd>{project.contribution}</dd></div>
        </dl>
        <nav aria-label={`${project.title}研究证据`}>
          {project.evidence.map((item) => <Link href={item.href} key={item.href}>{item.label} <span aria-hidden="true">↗</span></Link>)}
        </nav>
      </article>
    </li>)}
  </ol>;
}
