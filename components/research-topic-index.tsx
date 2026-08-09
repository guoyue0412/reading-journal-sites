import Link from "next/link";
import type { ResearchTopic } from "@/lib/research/archive";

export function ResearchTopicIndex({ topics }: { topics: ResearchTopic[] }) {
  return <nav className="archive-topics" aria-labelledby="research-topics">
    <p className="archive-kicker">RESEARCH TOPICS</p>
    <h2 id="research-topics">研究主题</h2>
    <ol>{topics.map((topic, index) => <li key={topic.label}>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <Link href={topic.href}>{topic.label}</Link>
    </li>)}</ol>
  </nav>;
}
