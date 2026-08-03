import { notFound } from "next/navigation";
import { MarkdownArticle } from "@/components/markdown-article";
import { ResearchShell } from "@/components/research-shell";
import { getRelatedEntries } from "@/lib/content/query";
import { listPublicEntries } from "@/lib/blog/read-model";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entries = await listPublicEntries();
  const entry = entries.find((item) => item.slug === slug);
  if (!entry) notFound();
  return <ResearchShell><MarkdownArticle entry={entry} relatedEntries={getRelatedEntries(entry.slug, entries)} /></ResearchShell>;
}
