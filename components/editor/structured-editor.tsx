"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { BlogPostDraft, BlogSection, PostType, SectionTemplate } from "@/lib/blog/types";
import { AddSectionDrawer } from "./add-section-drawer";
import { ArticlePreview } from "./article-preview";
import { EditorMobileBar } from "./editor-mobile-bar";
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
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const isNullableString = (value: unknown) => value === null || typeof value === "string";
const recoverySectionKinds = new Set(["long_text", "short_text", "checklist", "markdown", "relation"]);

function isCompleteRecoveryDraft(value: unknown, active: BlogPostDraft): value is BlogPostDraft {
  if (!isRecord(value) || value.id !== active.id || value.type !== active.type) return false;
  if (!["id", "slug", "type", "title", "date", "summary", "status", "createdAt", "updatedAt"].every((key) => typeof value[key] === "string")) return false;
  if (value.status !== "draft" && value.status !== "published") return false;
  if (!Number.isInteger(value.draftVersion) || (value.draftVersion as number) < 0 || !isNullableString(value.publishedRevisionId)) return false;
  if (!isStringArray(value.tags) || !isStringArray(value.related) || !isRecord(value.metadata) || !Array.isArray(value.sections)) return false;
  if (!value.sections.every((item) => isRecord(item)
    && typeof item.id === "string"
    && typeof item.title === "string"
    && typeof item.kind === "string"
    && recoverySectionKinds.has(item.kind)
    && typeof item.content === "string"
    && isStringArray(item.items)
    && isStringArray(item.relationSlugs)
    && Number.isInteger(item.position)
    && (item.position as number) >= 0
    && isNullableString(item.templateId)
    && isNullableString(item.standardKey))) return false;
  if (active.type === "papers") {
    const metadata = value.metadata;
    return isStringArray(metadata.authors)
      && typeof metadata.venue === "string"
      && Number.isInteger(metadata.year)
      && typeof metadata.paperUrl === "string"
      && typeof metadata.readAt === "string"
      && isStringArray(metadata.readingMethods)
      && typeof metadata.readingStatus === "string"
      && isStringArray(metadata.topics);
  }
  if (active.type === "jobs") {
    const metadata = value.metadata;
    return ["company", "role", "location", "applicationStage", "appliedAt", "nextAction"].every((key) => typeof metadata[key] === "string");
  }
  return true;
}

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const postsToggleRef = useRef<HTMLButtonElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  const currentRef = useRef(current);
  const activePostId = useRef<string | null>(initialPosts[0]?.id ?? null);
  const saveInFlight = useRef(false);
  const editRevision = useRef(0);
  const savedRevision = useRef(0);
  const queuedSave = useRef<BlogPostDraft | null>(null);
  const savePromise = useRef<Promise<BlogPostDraft | null> | null>(null);
  const publishingPost = useRef<{ postId: string; editRevision: number } | null>(null);
  const publishPromise = useRef<Promise<void> | null>(null);
  const recoveryChecked = useRef(new Set<string>());
  const acceptedRecoveries = useRef(new Set<string>());

  const closeSidebarAndRestoreFocus = () => {
    setSidebarOpen(false);
    postsToggleRef.current?.focus();
  };

  useEffect(() => () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); }, []);

  function persistEmergencyDraft(post: BlogPostDraft) {
    try { localStorage.setItem(emergencyKey(post.id), JSON.stringify(post)); } catch { setMessage("浏览器恢复副本保存失败，请及时导出 Markdown。"); }
  }
  function clearEmergencyDraft(id: string) { try { localStorage.removeItem(emergencyKey(id)); } catch { /* D1 remains authoritative. */ } }

  function offerEmergencyRecovery(post: BlogPostDraft) {
    if (recoveryChecked.current.has(post.id)) {
      if (acceptedRecoveries.current.has(post.id) && currentRef.current?.id === post.id && savedRevision.current !== editRevision.current) armAutosave(post.id);
      return;
    }
    recoveryChecked.current.add(post.id);
    try {
      const raw = localStorage.getItem(emergencyKey(post.id));
      if (!raw) return;
      const recovery: unknown = JSON.parse(raw);
      if (!isCompleteRecoveryDraft(recovery, post)) return;
      if (window.confirm("发现这个文章的未保存恢复副本，是否恢复？")) {
        acceptedRecoveries.current.add(post.id);
        scheduleAutosave(recovery);
      }
    } catch { /* Ignore malformed or inaccessible recovery data. */ }
  }

  useEffect(() => {
    const initial = currentRef.current;
    if (initial) offerEmergencyRecovery(initial);
    // The initial post is intentionally checked once per mounted editor session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function armAutosave(postId: string) {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      const latest = currentRef.current;
      if (!latest || latest.id !== postId || publishingPost.current?.postId === postId) return;
      void persistDraft(latest);
    }, 800);
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
    if (publishingPost.current?.postId === next.id) return;
    armAutosave(next.id);
  }

  async function flushAutosave(): Promise<BlogPostDraft | null> {
    while (true) {
      if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
      const pendingPublish = publishPromise.current;
      if (pendingPublish) {
        await pendingPublish;
        if (publishPromise.current === pendingPublish) publishPromise.current = null;
        continue;
      }
      if (saveInFlight.current) { await savePromise.current; continue; }
      if (savedRevision.current === editRevision.current) return currentRef.current;
      const next = currentRef.current;
      if (!next || !await persistDraft(next)) return null;
    }
  }

  async function selectPost(id: string) {
    if (id === selectedId) return;
    if (currentRef.current) {
      const saved = await flushAutosave();
      if (!saved) return;
    }
    const local = posts.find((post) => post.id === id);
    activePostId.current = id; setSelectedId(id); setCurrent(local ?? null); currentRef.current = local ?? null; setSaveState("idle"); setMessage("");
    if (local) offerEmergencyRecovery(local);
  }

  async function createPost(type: PostType) {
    setCreating(true); setMessage("");
    try {
      if (currentRef.current) {
        const saved = await flushAutosave();
        if (!saved) return;
      }
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
    const context = { postId: saved.id, editRevision: editRevision.current };
    publishingPost.current = context;
    setMessage("正在发布……");
    const request = (async () => {
      try {
        const response = await fetch(`/api/editor/posts/${saved.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: saved.draftVersion }) });
        if (response.status === 401) { setMessage("登录已失效，请重新登录后再发布。"); return; }
        const payload = await response.json() as { post?: BlogPostDraft & { publishedAt?: string } } & ApiError;
        if (!response.ok || !payload.post) { setMessage(formatApiError(payload, "发布失败")); return; }
        const latest = currentRef.current;
        if (activePostId.current !== context.postId || latest?.id !== context.postId) return;
        const hasNewEdits = editRevision.current !== context.editRevision;
        const next = hasNewEdits ? {
          ...latest,
          status: payload.post.status,
          draftVersion: payload.post.draftVersion,
          publishedRevisionId: payload.post.publishedRevisionId,
          createdAt: payload.post.createdAt,
          updatedAt: payload.post.updatedAt,
        } : payload.post;
        setCurrent(next); currentRef.current = next; setPosts((value) => replacePost(value, next)); setSaveState(hasNewEdits ? "idle" : "saved"); setMessage(`已发布${payload.post.publishedAt ? ` · ${payload.post.publishedAt}` : ""}`);
      } catch {
        setMessage("网络异常，发布未完成，请检查连接后重试。");
      }
    })();
    publishPromise.current = request;
    try {
      await request;
    } finally {
      if (publishPromise.current === request) publishPromise.current = null;
      if (publishingPost.current === context) publishingPost.current = null;
      const latest = currentRef.current;
      if (activePostId.current === context.postId && latest?.id === context.postId && savedRevision.current !== editRevision.current) armAutosave(context.postId);
    }
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

  async function recoverConflictedDraft(local: BlogPostDraft) {
    try {
      const { exportPostMarkdown } = await import("@/lib/blog/markdown");
      const response = await fetch("/api/editor/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ markdown: exportPostMarkdown(local), create: true }) });
      const payload = await response.json() as { draft?: BlogPostDraft; errors?: string[]; warnings?: string[] } & ApiError;
      if (!response.ok || !payload.draft) { setMessage(payload.errors?.join("；") || formatApiError(payload, "创建恢复副本失败")); return; }
      if (payload.errors?.length) { setMessage(`恢复副本校验：${payload.errors.join("；")}`); return; }
      activePostId.current = payload.draft.id; setSelectedId(payload.draft.id); setCurrent(payload.draft); currentRef.current = payload.draft;
      setPosts((value) => replacePost(value, payload.draft!)); savedRevision.current = editRevision.current; setSaveState("saved"); setMessage("已从本地冲突稿创建新文章。");
    } catch {
      setMessage("网络异常，未创建恢复副本，请检查连接后重试。");
    }
  }

  async function saveAsNewArticle() {
    if (!currentRef.current) return;
    if (saveState === "conflict") { await recoverConflictedDraft(currentRef.current); return; }
    const saved = await flushAutosave();
    if (!saved) return;
    try {
      const response = await fetch(`/api/editor/posts/${saved.id}/copy`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: saved.draftVersion }) });
      const payload = await response.json() as { post?: BlogPostDraft } & ApiError;
      if (!response.ok || !payload.post) { setMessage(formatApiError(payload, "另存失败")); return; }
      activePostId.current = payload.post.id; setSelectedId(payload.post.id); setCurrent(payload.post); currentRef.current = payload.post;
      setPosts((value) => replacePost(value, payload.post!)); savedRevision.current = editRevision.current; setSaveState("saved");
      setMessage("已创建新文章副本，本地恢复副本仍保留。");
    } catch {
      setMessage("网络异常，未创建文章副本，请检查连接后重试。");
    }
  }

  async function importMarkdown(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    const markdown = await file.text();
    const response = await fetch("/api/editor/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ markdown }) });
    const payload = await response.json() as { draft?: BlogPostDraft; errors?: string[]; warnings?: string[] } & ApiError;
    if (!response.ok || !payload.draft) { setMessage(formatApiError(payload, "导入失败")); return; }
    if (payload.errors?.length) { setMessage(`导入校验：${payload.errors.join("；")}`); return; }
    const warning = payload.warnings?.length ? `\n警告：${payload.warnings.join("；")}` : "";
    if (!window.confirm(`导入内容将创建为新草稿，是否继续？${warning}`)) return;
    if (currentRef.current) {
      const saved = await flushAutosave();
      if (!saved) return;
    }
    const createResponse = await fetch("/api/editor/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ markdown, create: true }) });
    const created = await createResponse.json() as { draft?: BlogPostDraft; errors?: string[]; warnings?: string[] } & ApiError;
    if (!createResponse.ok || !created.draft) { setMessage(formatApiError(created, "创建导入草稿失败")); return; }
    if (created.errors?.length) { setMessage(`导入校验：${created.errors.join("；")}`); return; }
    activePostId.current = created.draft.id; setSelectedId(created.draft.id); setCurrent(created.draft); currentRef.current = created.draft;
    setPosts((value) => replacePost(value, created.draft!)); savedRevision.current = editRevision.current; setSaveState("saved"); setMessage("已导入为新草稿。");
  }

  const typeTemplates = current ? templates.filter((template) => template.postType === current.type && template.enabled) : [];
  return <section className="structured-editor article-surface studio-surface" aria-label="结构化写作工作台">
    <header className="studio-toolbar studio-toolbar--floating material-toolbar">
      <span className="studio-owner">{ownerName}</span>
      <button ref={postsToggleRef} className="studio-posts-toggle" type="button" aria-expanded={sidebarOpen} aria-controls="studio-post-list" onClick={() => setSidebarOpen((value) => !value)}>文章列表</button>
      <span className={`studio-save-state save-state--${saveState}`} aria-live="polite">{({ idle: "待保存", saving: "保存中…", saved: "已保存", failed: "保存失败", conflict: "版本冲突" })[saveState]}</span>
      <label className="studio-import material-action">导入 Markdown<input ref={importInputRef} type="file" accept=".md,text/markdown" onChange={(e) => void importMarkdown(e)} /></label>
      {current ? <a className="material-action" href={`/api/editor/posts/${current.id}/export`} download>导出 Markdown</a> : null}
      <button className="material-action material-action--primary" type="button" disabled={!current || saveState === "saving"} onClick={() => void publish()}>发布</button>
    </header>
    {message ? <p className="studio-message" role="status" aria-live="polite">{message}</p> : null}
    {saveState === "failed" ? <div className="studio-recovery"><button type="button" onClick={() => currentRef.current && void persistDraft(currentRef.current)}>重试保存</button><button type="button" onClick={exportCurrentDraft}>导出当前草稿</button></div> : null}
    {saveState === "conflict" ? <div className="studio-recovery"><button type="button" onClick={() => void reloadOnlineDraft()}>重新加载线上草稿</button><button type="button" onClick={() => void saveAsNewArticle()}>另存为新文章</button></div> : null}
    <div className="studio-mobile-tabs"><button type="button" aria-pressed={mobilePane === "edit"} onClick={() => setMobilePane("edit")}>编辑</button><button type="button" aria-pressed={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>预览</button></div>
    <div className={`studio-layout studio-layout--${mobilePane}`} data-mobile-pane={mobilePane}>
      <EditorSidebar id="studio-post-list" isOpen={sidebarOpen} posts={posts} selectedId={selectedId} creating={creating} onSelect={(id) => { closeSidebarAndRestoreFocus(); void selectPost(id); }} onCreate={(type) => { closeSidebarAndRestoreFocus(); void createPost(type); }} />
      <main className="studio-form">{current ? <><p className="eyebrow">{postTypeLabels[current.type]}</p><PostFields post={current} onChange={scheduleAutosave} /><div className="studio-sections"><div className="studio-sections__title"><h2>内容模块</h2><button className="material-action" type="button" onClick={() => setDrawerOpen(true)}>+ 添加模块</button></div>{[...current.sections].sort((a, b) => a.position - b.position).map((section) => <SectionEditor key={section.id} postId={current.id} section={section} onChange={updateSection} onMove={(delta) => moveSection(section.id, delta)} onDuplicate={() => duplicateSection(section.id)} onDelete={() => deleteSection(section.id)} />)}</div></> : <div className="studio-empty"><h2>开始写作</h2><p>从左侧选择文章类型，系统会提供对应的结构化模板。</p></div>}</main>
      <ArticlePreview post={current} />
    </div>
    <EditorMobileBar pane={mobilePane} saveState={saveState} disabled={!current} onAdd={() => setDrawerOpen(true)} onPaneChange={setMobilePane} onPublish={() => void publish()} onImport={() => importInputRef.current?.click()} onExport={exportCurrentDraft} />
    <AddSectionDrawer open={drawerOpen} insertionPosition={(current?.sections.length ?? 0) * 10 + 10} templates={typeTemplates} onClose={() => setDrawerOpen(false)} onAdd={addSection} />
  </section>;
}
