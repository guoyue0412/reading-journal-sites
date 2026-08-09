import type { BlogPostDraft, PostType } from "@/lib/blog/types";
import { postTypeLabels } from "./editor-types";

type Props = {
  id: string;
  isOpen: boolean;
  posts: BlogPostDraft[];
  selectedId: string | null;
  creating: boolean;
  onSelect: (id: string) => void;
  onCreate: (type: PostType) => void;
};

export function EditorSidebar({ id, isOpen, posts, selectedId, creating, onSelect, onCreate }: Props) {
  return (
    <aside id={id} className={`studio-sidebar${isOpen ? " is-open" : ""}`} aria-label="文章列表">
      <div className="studio-sidebar__create">
        <strong>新建文章</strong>
        {(Object.keys(postTypeLabels) as PostType[]).map((type) => (
          <button key={type} type="button" disabled={creating} onClick={() => onCreate(type)}>
            + {postTypeLabels[type]}
          </button>
        ))}
      </div>
      <div className="studio-sidebar__posts">
        <strong>全部草稿</strong>
        {posts.length === 0 ? <p>还没有文章，从上方选择一个模板开始。</p> : null}
        {posts.map((post) => (
          <button
            className={post.id === selectedId ? "is-active" : ""}
            key={post.id}
            type="button"
            onClick={() => onSelect(post.id)}
          >
            <span>{post.title || "未命名文章"}</span>
            <small>{postTypeLabels[post.type]} · {post.date}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}
