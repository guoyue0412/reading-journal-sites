import { useEffect, useRef, useState } from "react";
import type { BlogSection, SectionTemplate } from "@/lib/blog/types";
import { READING_SUMMARY, READING_SUMMARY_TITLE } from "@/lib/blog/section-constants";

type Props = { open: boolean; insertionPosition: number; templates: SectionTemplate[]; onClose: () => void; onAdd: (section: BlogSection, saveAsTemplate: boolean) => Promise<void> };

export function AddSectionDrawer({ open, insertionPosition, templates, onClose, onAdd }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("button, input, select")?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>("button, input, select")].filter((item) => !item.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  async function submit() {
    if (!title.trim()) return;
    const normalizedTitle = title.trim();
    await onAdd({ id: crypto.randomUUID(), title: normalizedTitle, kind: "markdown", content: "", items: [], relationSlugs: [], position: insertionPosition, templateId: null, standardKey: normalizedTitle === READING_SUMMARY_TITLE ? READING_SUMMARY : null }, saveAsTemplate);
    setTitle(""); setSaveAsTemplate(false); onClose();
  }
  function addTemplate(template: SectionTemplate) {
    void onAdd({ id: crypto.randomUUID(), title: template.title, kind: "markdown", content: "", items: [], relationSlugs: [], position: insertionPosition, templateId: template.id, standardKey: template.standardKey }, false).then(onClose);
  }
  return <div ref={dialogRef} className="studio-drawer" role="dialog" aria-modal="true" aria-label="添加模块">
    <div><h2>添加新模块</h2><button type="button" onClick={onClose}>关闭</button></div>
    {templates.length ? <div className="studio-drawer__templates"><strong>常用模块</strong>{templates.filter(t => t.enabled).map(template => <button type="button" key={template.id} onClick={() => addTemplate(template)}>{template.title}</button>)}</div> : null}
    <label>模块名称<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：创新点、相关论文" /></label>
    <p>每个模块均使用 Markdown，支持 LaTeX、图片和文章关联。</p>
    <label><input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />保存为常用模块</label>
    <button type="button" onClick={() => void submit()}>添加模块</button>
  </div>;
}
