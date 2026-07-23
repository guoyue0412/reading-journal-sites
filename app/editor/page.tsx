import { PortableEditor } from "../../components/portable-editor";
import { SiteShell } from "../../components/site-shell";

export default function EditorPage() {
  return (
    <SiteShell>
      <section className="editor-heading">
        <p className="eyebrow">PORTABLE EDITOR</p>
        <h1>随时写，带着走</h1>
        <p>在浏览器里写 Markdown 与 LaTeX；草稿留在当前设备，也可随时导入或导出。</p>
      </section>
      <PortableEditor />
    </SiteShell>
  );
}
