import Link from "next/link";
import type { ReactNode } from "react";
import { ResearchNavigation } from "./research-navigation";

export function ResearchShell({ children }: { children: ReactNode }) {
  return <div className="research-page">
    <header className="archive-masthead">
      <div className="archive-masthead__identity">
        <Link href="/" aria-label="郭跃研究档案馆首页"><strong>郭跃</strong><span>GUO YUE</span></Link>
        <p>EMBODIED AI · RESEARCH ARCHIVE</p>
      </div>
      <ResearchNavigation className="archive-desktop-nav" ariaLabel="公开导航" />
      <nav className="archive-tools" aria-label="站点工具"><Link href="/search">搜索</Link><Link href="/editor">编辑</Link></nav>
      <details className="archive-mobile-nav">
        <summary>菜单</summary>
        <ResearchNavigation ariaLabel="移动端公开导航" includeTools />
      </details>
    </header>
    <main>{children}</main>
    <footer className="archive-footer"><p>继续研究，也继续记录。</p><span>郭跃 · Guo Yue</span></footer>
  </div>;
}
