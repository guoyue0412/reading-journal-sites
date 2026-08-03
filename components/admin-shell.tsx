import Link from "next/link";
import type { ReactNode } from "react";

export function AdminShell({ children }: { children: ReactNode }) {
  return <div className="admin-page">
    <header className="admin-header">
      <Link href="/admin" className="research-brand">Guo Yue <span>Admin</span></Link>
      <nav aria-label="后台导航"><Link href="/admin">概览</Link><Link href="/admin/posts">文章</Link><Link href="/">查看站点</Link></nav>
    </header>
    <main className="admin-main">{children}</main>
  </div>;
}
