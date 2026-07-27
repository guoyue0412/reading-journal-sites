import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { exportPostMarkdown } from "@/lib/blog/markdown";
import type { BlogPostDraft } from "@/lib/blog/types";

function withoutFrontmatter(markdown: string) { return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, ""); }

export function ArticlePreview({ post }: { post: BlogPostDraft | null }) {
  if (!post) return <aside className="studio-preview"><p>选择或新建文章后在这里预览。</p></aside>;
  return <aside className="studio-preview" aria-label="文章预览">
    <p className="eyebrow">LIVE PREVIEW</p><h1>{post.title || "未命名文章"}</h1><p>{post.summary}</p>
    <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}>{withoutFrontmatter(exportPostMarkdown(post))}</ReactMarkdown></div>
  </aside>;
}
