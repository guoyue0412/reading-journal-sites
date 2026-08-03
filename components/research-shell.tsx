import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  ["/", "首页"],
  ["/index", "索引"],
  ["/blog", "博客"],
  ["/papers", "论文"],
  ["/projects", "项目"],
  ["/about", "关于"],
] as const;

export function ResearchShell({ children }: { children: ReactNode }) {
  return (
    <div className="research-page">
      <header className="research-header">
        <Link className="research-brand" href="/" aria-label="Guo Yue Research 首页">
          Guo Yue <span>Research</span>
        </Link>
        <nav className="research-nav" aria-label="公开导航">
          {navigation.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <div className="research-tools">
          <Link href="/search" aria-label="搜索">搜索</Link>
          <Link href="/admin" aria-label="站点后台">账户</Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className="research-footer">Guo Yue · Embodied AI, World Models, Robot Learning</footer>
    </div>
  );
}
