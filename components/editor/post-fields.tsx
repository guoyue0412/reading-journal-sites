import type { BlogPostDraft, JobMetadata, PaperMetadata } from "@/lib/blog/types";

type Props = { post: BlogPostDraft; onChange: (post: BlogPostDraft) => void };
const methods = [["skim", "粗读"], ["deep", "细读"], ["synthesis", "总结"]] as const;

export function PostFields({ post, onChange }: Props) {
  const set = <K extends keyof BlogPostDraft>(key: K, value: BlogPostDraft[K]) => onChange({ ...post, [key]: value });
  const setList = (key: "tags" | "related", value: string) => set(key, value.split(/[,，]/).map((item) => item.trim()).filter(Boolean));

  return (
    <section className="studio-fields" aria-label="文章信息">
      <label>标题<input value={post.title} onChange={(e) => set("title", e.target.value)} /></label>
      <label>Slug<input value={post.slug} onChange={(e) => set("slug", e.target.value)} /></label>
      <label>日期<input type="date" value={post.date} onChange={(e) => set("date", e.target.value)} /></label>
      <label>摘要<textarea value={post.summary} onChange={(e) => set("summary", e.target.value)} /></label>
      <label>标签（逗号分隔）<input value={post.tags.join(", ")} onChange={(e) => setList("tags", e.target.value)} /></label>
      <label>相关文章 Slug（逗号分隔）<input value={post.related.join(", ")} onChange={(e) => setList("related", e.target.value)} /></label>
      {post.type === "papers" ? <PaperFields post={post} onChange={onChange} /> : null}
      {post.type === "jobs" ? <JobFields post={post} onChange={onChange} /> : null}
    </section>
  );
}

function PaperFields({ post, onChange }: Props) {
  const metadata = post.metadata as PaperMetadata;
  const update = (patch: Partial<PaperMetadata>) => onChange({ ...post, metadata: { ...metadata, ...patch } });
  return <fieldset className="studio-fields__specific"><legend>论文索引</legend>
    <label>作者<input value={metadata.authors.join(", ")} onChange={(e) => update({ authors: e.target.value.split(/[,，]/).map(v => v.trim()).filter(Boolean) })} /></label>
    <label>会议 / 期刊<input value={metadata.venue} onChange={(e) => update({ venue: e.target.value })} /></label>
    <label>年份<input type="number" value={metadata.year} onChange={(e) => update({ year: Number(e.target.value) })} /></label>
    <label>论文链接<input type="url" value={metadata.paperUrl} onChange={(e) => update({ paperUrl: e.target.value })} /></label>
    <label>阅读日期<input type="date" value={metadata.readAt} onChange={(e) => update({ readAt: e.target.value })} /></label>
    <div className="studio-choice"><span>阅读方式（可多选）</span>{methods.map(([value, label]) => <label key={value}><input type="checkbox" checked={metadata.readingMethods.includes(value)} onChange={(e) => update({ readingMethods: e.target.checked ? [...metadata.readingMethods, value] : metadata.readingMethods.filter(item => item !== value) })} />{label}</label>)}</div>
    <label>执行状态<select value={metadata.readingStatus} onChange={(e) => update({ readingStatus: e.target.value as PaperMetadata["readingStatus"] })}><option value="queued">待阅读</option><option value="in_progress">阅读中</option><option value="synthesizing">总结中</option><option value="completed">已完成</option><option value="archived">已归档</option></select></label>
    <label>主题<input value={metadata.topics.join(", ")} onChange={(e) => update({ topics: e.target.value.split(/[,，]/).map(v => v.trim()).filter(Boolean) })} /></label>
  </fieldset>;
}

function JobFields({ post, onChange }: Props) {
  const metadata = post.metadata as JobMetadata;
  const update = (patch: Partial<JobMetadata>) => onChange({ ...post, metadata: { ...metadata, ...patch } });
  return <fieldset className="studio-fields__specific"><legend>秋招进展</legend>
    <label>公司<input value={metadata.company} onChange={(e) => update({ company: e.target.value })} /></label>
    <label>岗位<input value={metadata.role} onChange={(e) => update({ role: e.target.value })} /></label>
    <label>地点<input value={metadata.location} onChange={(e) => update({ location: e.target.value })} /></label>
    <label>当前阶段<select value={metadata.applicationStage} onChange={(e) => update({ applicationStage: e.target.value as JobMetadata["applicationStage"] })}><option value="applied">投递</option><option value="written_test">笔试</option><option value="interview">面试</option><option value="offer">Offer</option><option value="closed">结束</option></select></label>
    <label>投递日期<input type="date" value={metadata.appliedAt} onChange={(e) => update({ appliedAt: e.target.value })} /></label>
    <label>下一步<input value={metadata.nextAction} onChange={(e) => update({ nextAction: e.target.value })} /></label>
  </fieldset>;
}
