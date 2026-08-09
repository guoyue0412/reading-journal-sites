import type { MobilePane, SaveState } from "./editor-types";

export function EditorMobileBar({ pane, saveState, disabled, onAdd, onPaneChange, onPublish }: {
  pane: MobilePane;
  saveState: SaveState;
  disabled: boolean;
  onAdd: () => void;
  onPaneChange: (pane: MobilePane) => void;
  onPublish: () => void;
}) {
  const saveLabel = ({ idle: "待保存", saving: "保存中", saved: "已保存", failed: "保存失败", conflict: "版本冲突" } as const)[saveState];
  return <nav className="studio-mobile-bar" aria-label="移动端编辑操作">
    <button type="button" disabled={disabled} onClick={onAdd}>添加模块</button>
    <button type="button" aria-pressed={pane === "preview"} onClick={() => onPaneChange(pane === "preview" ? "edit" : "preview")}>{pane === "preview" ? "继续编辑" : "预览"}</button>
    <span className={`save-state--${saveState}`} aria-live="polite">{saveLabel}</span>
    <button type="button" disabled={disabled || saveState === "saving"} onClick={onPublish}>发布</button>
  </nav>;
}
