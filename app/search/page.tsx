import { SearchIndex } from "../../components/search-index";
import { SiteShell } from "../../components/site-shell";
import { getRecentEntries } from "../../lib/content/query";
import { listPublicEntries } from "../../lib/blog/read-model";

export const dynamic = "force-dynamic";
export default async function SearchPage() {
  const entries = await listPublicEntries();
  return (
    <SiteShell>
      <div className="index-page search-page">
        <header className="index-heading">
          <p className="eyebrow">ARCHIVE SEARCH</p>
          <h1>统一搜索</h1>
          <p>在秋招、实习、论文阅读与个人感悟中，寻找彼此关联的记录。</p>
        </header>
        <SearchIndex entries={getRecentEntries(Number.MAX_SAFE_INTEGER, entries)} />
      </div>
    </SiteShell>
  );
}
