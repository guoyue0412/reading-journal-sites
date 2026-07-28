import type { BlogPostDraft, BlogSection } from "@/lib/blog/types";
import { sectionKindLabels } from "./editor-types";
import { READING_SUMMARY } from "@/lib/blog/section-constants";

type Props = { section: BlogSection; posts: BlogPostDraft[]; onChange: (section: BlogSection) => void; onMove: (delta: number) => void; onDuplicate: () => void; onDelete: () => void };

export function SectionEditor({ section, posts, onChange, onMove, onDuplicate, onDelete }: Props) {
  return <section className="studio-section" aria-labelledby={`section-${section.id}`}>
    <div className="studio-section__heading">
      <input id={`section-${section.id}`} aria-label="模块标题" value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
      <small>{section.standardKey === READING_SUMMARY ? "阅读总结组件" : sectionKindLabels[section.kind]}</small>
      <button type="button" onClick={() => onMove(-1)} aria-label={`上移${section.title}`}>↑</button>
      <button type="button" onClick={() => onMove(1)} aria-label={`下移${section.title}`}>↓</button>
      <button type="button" onClick={onDuplicate}>复制</button>
      <button type="button" onClick={onDelete}>删除</button>
    </div>
    <SectionValueControl section={section} posts={posts} onChange={onChange} />
  </section>;
}

function SectionValueControl({ section, posts, onChange }: Pick<Props, "section" | "posts" | "onChange">) {
  if (section.kind === "checklist") return <div className="studio-checklist">
    {section.items.map((item, index) => <div key={index}><input aria-label={`清单项 ${index + 1}`} value={item} onChange={(e) => onChange({ ...section, items: section.items.map((value, i) => i === index ? e.target.value : value) })} /><button type="button" onClick={() => onChange({ ...section, items: section.items.filter((_, i) => i !== index) })}>移除</button></div>)}
    <button type="button" onClick={() => onChange({ ...section, items: [...section.items, ""] })}>+ 添加清单项</button>
  </div>;
  if (section.kind === "relation") return <div className="studio-relations">
    <p>选择要互相索引的文章：</p>
    {posts.map((post) => <label key={post.id}><input type="checkbox" checked={section.relationSlugs.includes(post.slug)} onChange={(e) => onChange({ ...section, relationSlugs: e.target.checked ? [...section.relationSlugs, post.slug] : section.relationSlugs.filter(slug => slug !== post.slug) })} />{post.title || post.slug}</label>)}
  </div>;
  return <textarea className={section.kind === "short_text" ? "is-short" : ""} aria-label={`${section.title}内容`} value={section.content} onChange={(e) => onChange({ ...section, content: e.target.value })} placeholder={section.kind === "markdown" ? "支持 Markdown 与 LaTeX，例如 $E=mc^2$" : "填写内容"} />;
}
