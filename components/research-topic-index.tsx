import Link from "next/link";
import type { ResearchTopic } from "@/lib/research/archive";

export function ResearchTopicIndex({ topics }: { topics: ResearchTopic[] }) {
  return <nav className="archive-topics" aria-label="研究主题">
    <p className="archive-kicker">RESEARCH TOPICS</p>
    <ol>{topics.map((topic, index) => <li key={topic.label}>
      <span>{String(index + 1).padStart(2, "0")}</span>
      <Link href={topic.href}>{topic.label}</Link>
    </li>)}</ol>
  </nav>;
}
