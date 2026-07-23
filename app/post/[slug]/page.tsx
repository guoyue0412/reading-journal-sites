import { notFound } from "next/navigation";
import { MarkdownArticle } from "../../../components/markdown-article";
import { SiteShell } from "../../../components/site-shell";
import { CONTENT_ENTRIES } from "../../../lib/content/generated";
import { getRelatedEntries } from "../../../lib/content/query";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = CONTENT_ENTRIES.find((candidate) => candidate.slug === slug);

  if (!entry) {
    notFound();
  }

  return (
    <SiteShell>
      <MarkdownArticle
        entry={entry}
        relatedEntries={getRelatedEntries(entry.slug)}
      />
    </SiteShell>
  );
}
