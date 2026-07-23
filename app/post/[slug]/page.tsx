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
    return (
      <SiteShell>
        <div className="empty-state">没有找到这篇文章。</div>
      </SiteShell>
    );
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
