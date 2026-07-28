"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { BlogPostDraft, BlogSection, PostType, SectionTemplate } from "@/lib/blog/types";
import { AddSectionDrawer } from "./add-section-drawer";
import { ArticlePreview } from "./article-preview";
import { EditorSidebar } from "./editor-sidebar";
import { localDate, postTypeLabels, replacePost, type MobilePane, type SaveState } from "./editor-types";
import { PostFields } from "./post-fields";
import { SectionEditor } from "./section-editor";

type Props = { initialPosts: BlogPostDraft[]; initialTemplates: SectionTemplate[]; ownerName: string };
type ApiError = { error?: string; message?: string; code?: string; fields?: string[] };
const emergencyKey = (id: string) => `guoyue-blog-recovery:${id}`;
const formatApiError = (payload: ApiError, fallback: string) => {
  const detail = payload.fields?.filter(Boolean).join("；");
  return [payload.error || payload.message, detail].filter(Boolean).join("：") || fallback;
};

export function StructuredEditor({ initialPosts, initialTemplates, ownerName }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(initialPosts[0]?.id ?? null);
  const [current, setCurrent] = useState<BlogPostDraft | null>(initialPosts[0] ?? null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("edit");
  const saveTimer = useRef<number | null>(null);
  const currentRef = useRef(current);
  const activePostId = useRef<string | null>(initialPosts[0]?.id ?? null);
  const saveInFlight = useRef(false);
  const editRevision = useRef(0);
  const savedRevision = useRef(0);
  const queuedSave = useRef<BlogPostDraft | null>(null);
  const savePromise = useRef<Promise<BlogPostDraft | null> | null>(null);

  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);

  function persistEmergencyDraft(post: BlogPostDraft) {
    try { localStorage.setItem(emergencyKey(post.id), JSON.stringify(post)); } catch { setMessage("浏览器恢复副本保存失败，请及时导出 Markdown。"); }
  }
  function clearEmergencyDraft(id: string) { try { localStorage.removeItem(emergencyKey(id)); } catch { /* D1 remains authoritative. */ } }

  async function persistDraft(next: BlogPostDraft): Promise<BlogPostDraft | null> {
    if (saveInFlight.current) {
      queuedSave.current = next;
      return savePromise.current ?? null;
    }

    saveInFlight.current = true;
    const requestRevision = editRevision.current;
    let savedPost: BlogPostDraft | null = null;
    const request = (async () => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/editor/posts/${next.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ draft: next, expectedVersion: next.draftVersion }) });
        const payload = await response.json() as { post?: BlogPostDraft } & ApiError;
        if (response.status === 409 && payload.code === "VERSION_CONFLICT") { setSaveState("conflict"); setMessage("检测到其他页面的更新，请重新载入后继续。"); return null; }
        if (!response.ok || !payload.post) { setSaveState("failed"); setMessage(formatApiError(payload, "保存失败")); return null; }
        savedPost = payload.post;
        if (requestRevision === editRevision.current && activePostId.current === next.id) {
          setCurrent(payload.post); currentRef.current = payload.post;
          setPosts((value) => replacePost(value, payload.post!));
          savedRevision.current = requestRevision;
          clearEmergencyDraft(next.id); setSaveState("saved"); setMessage("");
        }
        return payload.post;
      } catch { setSaveState("failed"); setMessage("网络异常，内容已保存在当前浏览器的恢复副本中。"); return null; }
    })();
    savePromise.current = request;

    try {
      return await request;
    } finally {
      saveInFlight.current = false;
      savePromise.current = null;
      const queued = queuedSave.current;
      queuedSave.current = null;
      if (queued && savedPost) void persistDraft({ ...queued, draftVersion: savedPost.draftVersion });
    }
  }

  function scheduleAutosave(next: BlogPostDraft) {
    editRevision.current += 1;
    setCurrent(next); currentRef.current = next; setPosts((value) => replacePost(value, next)); setSaveState("idle");
    persistEmergencyDraft(next);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (saveInFlight.current) {
      queuedSave.current = next;
      return;
    }
    saveTimer.current = window.setTimeout(() => { saveTimer.current = null; void persistDraft(next); }, 800);
  }

  async function flushAutosave(): Promise<BlogPostDraft | null> {
    if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
    while (true) {
      if (saveInFlight.current) { await savePromise.current; continue; }
      if (savedRevision.current === editRevision.current) return currentRef.current;
      const next = currentRef.current;
      if (!next || !await persistDraft(next)) return null;
    }
  }

  async function selectPost(id: string) {
    if (id === selectedId) return;
    await flushAutosave();
    const local = posts.find((post) => post.id === id);
    activePostId.current = id; setSelectedId(id); setCurrent(local ?? null); currentRef.current = local ?? null; setSaveState("idle"); setMessage("");
    try {
      const recovery = localStorage.getItem(emergencyKey(id));
      if (recovery && window.confirm("发现这个文章的未保存恢复副本，是否恢复？")) scheduleAutosave(JSON.parse(recovery) as BlogPostDraft);
    } catch { /* Ignore unreadable recovery data. */ }
  }

  async function createPost(type: PostType) {
    setCreating(true); setMessage("");
    try {
      const response = await fetch("/api/editor/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, date: localDate() }) });
      const payload = await response.json() as { post?: BlogPostDraft } & ApiError;
      if (!response.ok || !payload.post) throw new Error(formatApiError(payload, "新建失败"));
      setPosts((value) => replacePost(value, payload.post!)); activePostId.current = payload.post.id; setSelectedId(payload.post.id); setCurrent(payload.post); currentRef.current = payload.post; setSaveState("saved");
    } catch (error) { setMessage(error instanceof Error ? error.message : "新建失败"); } finally { setCreating(false); }
  }

  function updateSection(section: BlogSection) {
    if (!current) return;
    scheduleAutosave({ ...current, sections: current.sections.map((item) => item.id === section.id ? section : item), updatedAt: new Date().toISOString() });
  }
  function moveSection(id: string, delta: number) {
    if (!current) return;
    const ordered = [...current.sections].sort((a, b) => a.position - b.position);
    const from = ordered.findIndex((item) => item.id === id); const to = from + delta;
    if (from < 0 || to < 0 || to >= ordered.length) return;
    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    scheduleAutosave({ ...current, sections: ordered.map((item, index) => ({ ...item, position: (index + 1) * 10 })), updatedAt: new Date().toISOString() });
  }
  function duplicateSection(id: string) {
    if (!current) return;
    const source = current.sections.find((item) => item.id === id); if (!source) return;
    const copy = { ...source, id: crypto.randomUUID(), title: `${source.title}（副本）`, standardKey: null, position: source.position + 1 };
    const sections = [...current.sections, copy].sort((a, b) => a.position - b.position).map((item, index) => ({ ...item, position: (index + 1) * 10 }));
    scheduleAutosave({ ...current, sections, updatedAt: new Date().toISOString() });
  }
  function deleteSection(id: string) { if (current && window.confirm("确定删除这个模块？")) scheduleAutosave({ ...current, sections: current.sections.filter((item) => item.id !== id), updatedAt: new Date().toISOString() }); }

  async function addSection(section: BlogSection, saveAsTemplate: boolean) {
    if (!current) return;
    let nextSection = section;
    if (saveAsTemplate) {
      const response = await fetch("/api/editor/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ postType: current.type, section }) });
      const payload = await response.json() as { template?: SectionTemplate } & ApiError;
      if (!response.ok || !payload.template) { setMessage(formatApiError(payload, "常用模块保存失败")); return; }
      setTemplates((value) => [...value, payload.template!]); nextSection = { ...section, templateId: payload.template.id };
    }
    scheduleAutosave({ ...current, sections: [...current.sections, nextSection].map((item, index) => ({ ...item, position: (index + 1) * 10 })), updatedAt: new Date().toISOString() });
  }

  async function publish() {
    const saved = await flushAutosave(); if (!saved) return;
    setMessage("正在发布……");
    const response = await fetch(`/api/editor/posts/${saved.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: saved.draftVersion }) });
    const payload = await response.json() as { post?: BlogPostDraft & { publishedAt?: string } } & ApiError;
    if (!response.ok || !payload.post) { setMessage(formatApiError(payload, "发布失败")); return; }
    setCurrent(payload.post); currentRef.current = payload.post; setPosts((value) => replacePost(value, payload.post!)); setSaveState("saved"); setMessage(`已发布${payload.post.publishedAt ? ` · ${payload.post.publishedAt}` : ""}`);
  }

  async function reloadOnlineDraft() {
    if (!current) return;
    const response = await fetch(`/api/editor/posts/${current.id}`);
    const payload = await response.json() as { post?: BlogPostDraft } & ApiError;
    if (!response.ok || !payload.post) { setMessage(formatApiError(payload, "重新加载失败")); return; }
    setCurrent(payload.post); currentRef.current = payload.post; setPosts((value) => replacePost(value, payload.post!)); setSaveState("saved"); setMessage("已重新加载线上草稿；本地恢复副本仍保留。");
  }

  function exportCurrentDraft() {
    if (!current) return;
    import("@/lib/blog/markdown").then(({ exportPostMarkdown }) => {
      const url = URL.createObjectURL(new Blob([exportPostMarkdown(current)], { type: "text/markdown;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${current.slug || "draft"}.md`; anchor.click(); URL.revokeObjectURL(url);
    });
  }

  async function saveAsNewArticle() {
    if (!current) return;
    const response = await fetch("/api/editor/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: current.type, date: current.date }) });
    const payload = await response.json() as { post?: BlogPostDraft } & ApiError;
    if (!response.ok || !payload.post) { setMessage(formatApiError(payload, "另存失败")); return; }
    const copy = { ...current, id: payload.post.id, slug: `${current.slug}-copy`, title: `${current.title}（副本）`, draftVersion: payload.post.draftVersion, publishedRevisionId: null, status: "draft" as const, createdAt: payload.post.createdAt, sections: current.sections.map((section) => ({ ...section, id: crypto.randomUUID() })) };
    activePostId.current = copy.id; setSelectedId(copy.id); scheduleAutosave(copy); setMessage("已创建新文章副本，本地恢复副本仍保留。");
  }

  async function importMarkdown(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const response = await fetch("/api/editor/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ markdown: await file.text() }) });
    const payload = await response.json() as { draft?: BlogPostDraft; errors?: string[]; warnings?: string[] } & ApiError;
    if (!response.ok || !payload.draft) { setMessage(formatApiError(payload, "导入失败")); return; }
    if (payload.errors?.length) { setMessage(`导入校验：${payload.errors.join("；")}`); return; }
    const warning = payload.warnings?.length ? `\n警告：${payload.warnings.join("；")}` : "";
    if (!window.confirm(`导入内容将创建为新草稿，是否继续？${warning}`)) return;
    const createResponse = await fetch("/api/editor/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: payload.draft.type, date: payload.draft.date }) });
    const created = await createResponse.json() as { post?: BlogPostDraft } & ApiError;
    if (!createResponse.ok || !created.post) { setMessage(formatApiError(created, "创建导入草稿失败")); return; }
    const merged = { ...payload.draft, id: created.post.id, draftVersion: created.post.draftVersion, createdAt: created.post.createdAt, sections: payload.draft.sections.map((section) => ({ ...section, id: crypto.randomUUID() })) };
    activePostId.current = merged.id; setSelectedId(merged.id); scheduleAutosave(merged);
  }

  const typeTemplates = current ? templates.filter((template) => template.postType === current.type && template.enabled) : [];
  return <section className="structured-editor article-surface" aria-label="结构化写作工作台">
    <header className="studio-toolbar studio-toolbar--floating material-toolbar">
      <span className="studio-owner">{ownerName}</span>
      <span className={`studio-save-state save-state--${saveState}`} aria-live="polite">{({ idle: "待保存", saving: "保存中…", saved: "已保存", failed: "保存失败", conflict: "版本冲突" })[saveState]}</span>
      <label className="studio-import material-action">导入 Markdown<input type="file" accept=".md,text/markdown" onChange={(e) => void importMarkdown(e)} /></label>
      {current ? <a className="material-action" href={`/api/editor/posts/${current.id}/export`} download>导出 Markdown</a> : null}
      <button className="material-action material-action--primary" type="button" disabled={!current || saveState === "saving"} onClick={() => void publish()}>发布</button>
    </header>
    {message ? <p className="studio-message" role="status" aria-live="polite">{message}</p> : null}
    {saveState === "failed" ? <div className="studio-recovery"><button type="button" onClick={() => currentRef.current && void persistDraft(currentRef.current)}>重试保存</button><button type="button" onClick={exportCurrentDraft}>导出当前草稿</button></div> : null}
    {saveState === "conflict" ? <div className="studio-recovery"><button type="button" onClick={() => void reloadOnlineDraft()}>重新加载线上草稿</button><button type="button" onClick={() => void saveAsNewArticle()}>另存为新文章</button></div> : null}
    <div className="studio-mobile-tabs"><button type="button" aria-pressed={mobilePane === "edit"} onClick={() => setMobilePane("edit")}>编辑</button><button type="button" aria-pressed={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>预览</button></div>
    <div className={`studio-layout studio-layout--${mobilePane}`} data-mobile-pane={mobilePane}>
      <EditorSidebar posts={posts} selectedId={selectedId} creating={creating} onSelect={(id) => void selectPost(id)} onCreate={(type) => void createPost(type)} />
      <main className="studio-form">{current ? <><p className="eyebrow">{postTypeLabels[current.type]}</p><PostFields post={current} onChange={scheduleAutosave} /><div className="studio-sections"><div className="studio-sections__title"><h2>内容模块</h2><button type="button" onClick={() => setDrawerOpen(true)}>+ 添加模块</button></div>{[...current.sections].sort((a, b) => a.position - b.position).map((section) => <SectionEditor key={section.id} section={section} posts={posts.filter(post => post.id !== current.id)} onChange={updateSection} onMove={(delta) => moveSection(section.id, delta)} onDuplicate={() => duplicateSection(section.id)} onDelete={() => deleteSection(section.id)} />)}</div></> : <div className="studio-empty"><h2>开始写作</h2><p>从左侧选择文章类型，系统会提供对应的结构化模板。</p></div>}</main>
      <ArticlePreview post={current} />
    </div>
    <AddSectionDrawer open={drawerOpen} insertionPosition={(current?.sections.length ?? 0) * 10 + 10} templates={typeTemplates} onClose={() => setDrawerOpen(false)} onAdd={addSection} />
  </section>;
}
