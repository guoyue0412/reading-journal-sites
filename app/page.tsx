import Link from "next/link";
import { ResearchShell } from "../components/research-shell";
import { getRecentEntries } from "../lib/content/query";
import { listPublicEntries } from "../lib/blog/read-model";

export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await listPublicEntries();
  const recentEntries = getRecentEntries(3, entries);

  return (
    <ResearchShell>
      <section className="research-hero"><p>GUO YUE · RESEARCH</p><h1>Embodied AI,<br />built for the physical world.</h1><span>I work on vision-language-action models, world models, robot learning, and simulation—connecting research ideas to reliable embodied systems.</span><div><Link href="/projects">Explore projects</Link><Link href="/blog">Read writing</Link></div></section>
      <section className="research-feature"><header><p>SELECTED WORK</p><h2>Research projects</h2><Link href="/projects">All projects →</Link></header><div className="project-grid"><article><p>VLA</p><h3>LingBot-VA</h3><span>Language-driven robot manipulation.</span></article><article><p>WORLD MODEL</p><h3>EgoEngine</h3><span>Predictive models for egocentric interaction.</span></article><article><p>SIMULATION</p><h3>GenWAM</h3><span>Generative environments for learning and evaluation.</span></article></div></section>
      <section className="research-feature"><header><p>NOTES AND ANALYSIS</p><h2>Recent writing</h2><Link href="/blog">All writing →</Link></header><div className="research-list">{recentEntries.map((entry) => <article key={entry.slug}><p>{entry.date}</p><h3><Link href={`/blog/${entry.slug}`}>{entry.title}</Link></h3><span>{entry.summary}</span></article>)}</div></section>
    </ResearchShell>
  );
}
