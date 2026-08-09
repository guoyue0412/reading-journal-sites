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
        <div className="archive-projects__evidence" aria-label={`${project.title}研究证据`}>
          {project.evidence.map((item) => "href" in item
            ? <Link href={item.href} key={item.href}>{item.label} <span aria-hidden="true">↗</span></Link>
            : <span className="archive-projects__evidence-status" key={`${item.label}-${item.note}`}><strong>{item.label}</strong>{item.note}</span>)}
        </div>
      </article>
    </li>)}
  </ol>;
}
