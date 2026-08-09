import { notFound } from "next/navigation";
import { MarkdownArticle } from "../../../components/markdown-article";
import { SiteShell } from "../../../components/site-shell";
import { getReflectionNavigation, getRelatedEntries } from "../../../lib/content/query";
import { listPublicEntries } from "../../../lib/blog/read-model";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entries = await listPublicEntries();
  const entry = entries.find((candidate) => candidate.slug === slug);

  if (!entry) {
    notFound();
  }

  return (
    <SiteShell>
      <MarkdownArticle
        entry={entry}
        relatedEntries={getRelatedEntries(entry.slug, entries)}
        reflectionNavigation={getReflectionNavigation(entry.slug, entries)}
      />
    </SiteShell>
  );
}
