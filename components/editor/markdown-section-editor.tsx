import { useRef, useState, type ChangeEvent, type ClipboardEvent } from "react";

export type MarkdownImageUpload = {
  id: string;
  postId: string;
  sectionId: string;
  state: "pending" | "complete" | "failed";
  error?: string;
};

export type UploadedMarkdownImage = {
  id: string;
  postId: string;
  sectionId: string;
  markdown: string;
  selection: { start: number; end: number };
};

type Props = {
  postId: string;
  sectionId?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onImageUploaded?: (image: UploadedMarkdownImage) => void;
  onUploadStateChange?: (upload: MarkdownImageUpload) => void;
};

let nextUploadId = 0;

export function MarkdownSectionEditor({ postId, sectionId, label, value, onChange, onImageUploaded, onUploadStateChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestValue = useRef(value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  latestValue.current = value;

  function insert(before: string, after = before, placeholder = "文字", selection?: { start: number; end: number }) {
    const latest = latestValue.current;
    const validSelection = selection
      && selection.start >= 0
      && selection.start <= selection.end
      && selection.end <= latest.length;
    const start = validSelection ? selection.start : latest.length;
    const end = validSelection ? selection.end : latest.length;
    onChange(latest.slice(0, start) + before + (latest.slice(start, end) || placeholder) + after + latest.slice(end));
  }

  async function upload(file: File) {
    const textarea = textareaRef.current;
    const selection = {
      start: textarea?.selectionStart ?? latestValue.current.length,
      end: textarea?.selectionEnd ?? textarea?.selectionStart ?? latestValue.current.length,
    };
    const upload = { id: `markdown-upload-${++nextUploadId}`, postId, sectionId: sectionId ?? "" };
    setUploading(true);
    setError("");
    if (sectionId) onUploadStateChange?.({ ...upload, state: "pending" });
    try {
      const form = new FormData();
      form.set("postId", postId);
      form.set("file", file);
      const response = await fetch("/api/editor/assets", { method: "POST", body: form });
      const payload = await response.json() as { url?: string; safeName?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error || "图片上传失败");
      const markdown = `![${payload.safeName || "图片"}](${payload.url})`;
      if (sectionId && onImageUploaded) onImageUploaded({ ...upload, markdown, selection });
      else insert(markdown, "", "", selection);
      if (sectionId) onUploadStateChange?.({ ...upload, state: "complete" });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "图片上传失败";
      setError(message);
      if (sectionId) onUploadStateChange?.({ ...upload, state: "failed", error: message });
    } finally {
      setUploading(false);
    }
  }

  function paste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const file = [...event.clipboardData.files].find((item) => item.type.startsWith("image/"));
    if (!file) return;
    event.preventDefault();
    void upload(file);
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void upload(file);
  }

  return <div className="markdown-editor">
    <div className="markdown-editor__toolbar" aria-label="Markdown 工具栏">
      <button type="button" onClick={() => insert("**")}>粗体</button>
      <button type="button" onClick={() => insert("[", "](https://)")}>链接</button>
      <button type="button" onClick={() => insert("$", "$", "E=mc^2")}>公式</button>
      <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading ? "上传中…" : "图片"}</button>
      <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={choose} />
    </div>
    <textarea ref={textareaRef} aria-label={label} value={value} onPaste={paste} onChange={(event) => onChange(event.target.value)} placeholder="使用 Markdown 写作；支持图片粘贴、LaTeX 公式与 [[文章-slug]] 关联。" />
    {error ? <p className="markdown-editor__error" role="alert">{error}</p> : null}
  </div>;
}
