"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { ContentType } from "../lib/content/types";

const DRAFT_KEY = "guoyue-blog-draft-v1";

const moduleLabels: Record<ContentType, string> = {
  jobs: "秋招记录",
  internship: "实习日记",
  papers: "论文阅读",
  reflections: "个人感悟",
};

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function frontmatter(fields: Record<string, string>) {
  return `---\n${Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}\n---\n\n`;
}

const templates: Record<ContentType, () => string> = {
  jobs: () =>
    frontmatter({
      title: "秋招记录标题",
      slug: "job-note",
      type: "jobs",
      date: localDate(),
      summary: "一句话概括这次经历。",
      tags: "[秋招]",
      related: "[]",
      status: "draft",
      company: "公司名称",
      role: "岗位名称",
      location: "城市",
      application_stage: "applied",
      applied_at: localDate(),
      next_action: "下一步要完成的事情",
    }) + "## 投递\n\n投递时间、渠道、JD 匹配和简历版本。\n\n## 笔试\n\n如未进入笔试，可删除本节。\n\n## 面试\n\n记录轮次、问题、回答复盘与反馈。\n\n## 最终复盘\n\n记录结果、得失和可复用经验。\n",
  internship: () =>
    frontmatter({
      title: "实习日记标题",
      slug: "internship-note",
      type: "internship",
      date: localDate(),
      summary: "一句话概括今天的收获。",
      tags: "[实习]",
      related: "[]",
      status: "draft",
    }) + "从这里开始记录。\n",
  papers: () =>
    frontmatter({
      title: "论文阅读标题",
      slug: "paper-reading-note",
      type: "papers",
      date: localDate(),
      summary: "一句话概括论文的核心问题。",
      tags: "[论文阅读]",
      related: "[]",
      status: "draft",
      read_at: localDate(),
      authors: "[]",
      venue: "arXiv",
      year: String(new Date().getFullYear()),
      paper_url: "https://example.com/paper",
      reading_methods: "[]",
      reading_status: "queued",
      topics: "[]",
    }) + "尚未开始阅读。开始后，请选择实际采用的阅读方式并取消对应章节的注释。\n\n<!-- ## 粗读记录 -->\n<!-- 研究问题、核心贡献、方法直觉与是否值得继续。 -->\n\n<!-- ## 细读记录 -->\n<!-- 模型结构、关键公式、数据、实验、图表与疑问。 -->\n\n<!-- ## 阅读总结 -->\n<!-- 一句话结论、优缺点、关联工作与可复用观点。 -->\n",
  reflections: () => {
    const date = localDate();
    return (
      frontmatter({
        title: "今日感悟",
        slug: date,
        type: "reflections",
        date: date,
        summary: "一句话概括今天的思考。",
        tags: "[日常思考]",
        related: "[]",
        status: "draft",
      }) + "从这里开始记录。\n"
    );
  },
};

function bodyWithoutFrontmatter(markdown: string) {
  return markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

function exportSlug(markdown: string) {
  const leadingFrontmatter = markdown.match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
  )?.[1];
  const value = leadingFrontmatter?.match(
    /^slug:\s*["']?([^\n"']+)["']?\s*$/m,
  )?.[1];
  const safeValue = value?.trim().replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, "-");
  return safeValue || "draft";
}

export function PortableEditor() {
  const [module, setModule] = useState<ContentType>("reflections");
  const [markdown, setMarkdown] = useState("");
  const [activePane, setActivePane] = useState<"edit" | "preview">("edit");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        setMarkdown(localStorage.getItem(DRAFT_KEY) ?? templates.reflections());
      } catch {
        setMarkdown(templates.reflections());
        setError("无法读取本地草稿，已为你打开新的感悟模板。");
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, markdown);
      } catch {
        setError("本地保存失败。你仍可继续编辑并导出 Markdown 文件。");
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [markdown, ready]);

  function chooseModule(event: ChangeEvent<HTMLSelectElement>) {
    const nextModule = event.target.value as ContentType;
    setModule(nextModule);
    setMarkdown(templates[nextModule]());
    setError("");
  }

  async function importMarkdown(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setMarkdown(await file.text());
      setError("");
    } catch {
      setError("无法读取这个 Markdown 文件，请检查文件后重试。");
    } finally {
      event.target.value = "";
    }
  }

  function exportMarkdown() {
    try {
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${exportSlug(markdown)}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("导出失败。你的内容仍保留在编辑器中，请稍后再试。");
    }
  }

  return (
    <section className="portable-editor" aria-label="便携 Markdown 编辑器">
      <div className="portable-editor__toolbar">
        <label>
          <span>文章模块</span>
          <select value={module} onChange={chooseModule}>
            {Object.entries(moduleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="portable-editor__import">
          <span>导入 .md</span>
          <input type="file" accept=".md,text/markdown" onChange={importMarkdown} />
        </label>
        <button type="button" onClick={exportMarkdown}>
          导出 .md
        </button>
      </div>

      {error ? (
        <p className="portable-editor__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="portable-editor__tabs" aria-label="编辑器视图">
        <button
          type="button"
          aria-pressed={activePane === "edit"}
          onClick={() => setActivePane("edit")}
        >编辑</button>
        <button
          type="button"
          aria-pressed={activePane === "preview"}
          onClick={() => setActivePane("preview")}
        >预览</button>
      </div>

      <div className="portable-editor__workspace">
        <div
          className={`portable-editor__pane${activePane === "edit" ? " is-active" : ""}`}
        >
          <label htmlFor="portable-markdown">Markdown</label>
          <textarea
            id="portable-markdown"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck="false"
          />
        </div>
        <div
          className={`portable-editor__pane${activePane === "preview" ? " is-active" : ""}`}
        >
          <p className="portable-editor__pane-label">预览</p>
          <div className="markdown-body portable-editor__preview">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
            >
              {bodyWithoutFrontmatter(markdown)}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </section>
  );
}
