import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  ["/", "首页"],
  ["/jobs", "秋招记录"],
  ["/internship", "实习日记"],
  ["/papers", "论文阅读"],
  ["/reflections", "个人感悟"],
  ["/editor", "编辑器"],
  ["/search", "搜索"],
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-page">
      <header className="site-header">
        <Link className="site-brand" href="/" aria-label="郭跃个人博客首页">
          郭跃 <span>GUO YUE</span>
        </Link>
        <p className="site-edition">Personal Journal · No. 2026</p>
        <nav className="desktop-nav" aria-label="主导航">
          {navigation.map(([href, label]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <details className="mobile-nav">
          <summary>目录</summary>
          <nav aria-label="移动端主导航">
            {navigation.map(([href, label]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
          </nav>
        </details>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <span className="footer-mark">郭跃 / Guo Yue</span>
        <span>© 2026 · 保持好奇，保持诚实</span>
      </footer>
    </div>
  );
}
