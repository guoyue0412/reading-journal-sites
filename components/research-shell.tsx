import Link from "next/link";
import type { ReactNode } from "react";
import { ResearchNavigation, ResearchToolNavigation } from "./research-navigation";

export function ResearchShell({ children }: { children: ReactNode }) {
  return <div className="research-page">
    <header className="archive-masthead">
      <div className="archive-masthead__identity">
        <Link href="/" aria-label="郭跃研究档案馆首页"><strong>郭跃</strong><span>GUO YUE</span></Link>
        <p>EMBODIED AI · RESEARCH ARCHIVE</p>
      </div>
      <ResearchNavigation className="archive-desktop-nav" ariaLabel="公开导航" />
      <ResearchToolNavigation className="archive-tools" ariaLabel="站点工具" />
      <details className="archive-mobile-nav">
        <summary>菜单</summary>
        <div className="archive-mobile-nav__panel">
          <ResearchNavigation ariaLabel="移动端公开导航" />
          <ResearchToolNavigation ariaLabel="移动端站点工具" />
        </div>
      </details>
    </header>
    <main>{children}</main>
    <footer className="archive-footer"><p>继续研究，也继续记录。</p><span>郭跃 · Guo Yue</span></footer>
  </div>;
}
