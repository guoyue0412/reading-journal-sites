import { useEffect, useRef, useState } from "react";
import type { BlogSection, SectionKind, SectionTemplate } from "@/lib/blog/types";
import { sectionKindLabels } from "./editor-types";

type Props = { open: boolean; insertionPosition: number; templates: SectionTemplate[]; onClose: () => void; onAdd: (section: BlogSection, saveAsTemplate: boolean) => Promise<void> };
const kinds: SectionKind[] = ["long_text", "short_text", "checklist", "markdown", "relation"];

export function AddSectionDrawer({ open, insertionPosition, templates, onClose, onAdd }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<SectionKind>("long_text");
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
    await onAdd({ id: crypto.randomUUID(), title: title.trim(), kind, content: "", items: [], relationSlugs: [], position: insertionPosition, templateId: null, standardKey: null }, saveAsTemplate);
    setTitle(""); setSaveAsTemplate(false); onClose();
  }
  function addTemplate(template: SectionTemplate) {
    void onAdd({ id: crypto.randomUUID(), title: template.title, kind: template.kind, content: "", items: [], relationSlugs: [], position: insertionPosition, templateId: template.id, standardKey: null }, false).then(onClose);
  }
  return <div ref={dialogRef} className="studio-drawer" role="dialog" aria-modal="true" aria-label="添加模块">
    <div><h2>添加新模块</h2><button type="button" onClick={onClose}>关闭</button></div>
    {templates.length ? <div className="studio-drawer__templates"><strong>常用模块</strong>{templates.filter(t => t.enabled).map(template => <button type="button" key={template.id} onClick={() => addTemplate(template)}>{template.title}</button>)}</div> : null}
    <label>模块名称<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：创新点、相关论文" /></label>
    <label>内容类型<select value={kind} onChange={(e) => setKind(e.target.value as SectionKind)}>{kinds.map(value => <option key={value} value={value}>{sectionKindLabels[value]} ({value})</option>)}</select></label>
    <label><input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />保存为常用模块</label>
    <button type="button" onClick={() => void submit()}>添加模块</button>
  </div>;
}
