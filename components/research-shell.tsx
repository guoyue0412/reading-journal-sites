import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [["/", "研究"], ["/projects", "项目"], ["/papers", "论文"], ["/blog", "记录"], ["/about", "关于"]] as const;

function NavigationLinks() {
  return <>{navigation.map(([href, label]) => <Link href={href} key={href}>{label}</Link>)}</>;
}

export function ResearchShell({ children }: { children: ReactNode }) {
  return <div className="research-page">
    <header className="archive-masthead">
      <div className="archive-masthead__identity">
        <Link href="/" aria-label="郭跃研究档案馆首页"><strong>郭跃</strong><span>GUO YUE</span></Link>
        <p>EMBODIED AI · RESEARCH ARCHIVE</p>
      </div>
      <nav className="archive-desktop-nav" aria-label="公开导航"><NavigationLinks /></nav>
      <nav className="archive-tools" aria-label="站点工具"><Link href="/search">搜索</Link><Link href="/editor">编辑</Link></nav>
      <details className="archive-mobile-nav">
        <summary>菜单</summary>
        <nav aria-label="移动端公开导航"><NavigationLinks /><Link href="/search">搜索</Link><Link href="/editor">编辑</Link></nav>
      </details>
    </header>
    <main>{children}</main>
    <footer className="archive-footer"><p>继续研究，也继续记录。</p><span>郭跃 · Guo Yue</span></footer>
  </div>;
}
