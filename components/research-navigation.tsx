"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [["/", "研究"], ["/projects", "项目"], ["/papers", "论文"], ["/blog", "记录"], ["/about", "关于"]] as const;

function isCurrentPath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function ResearchNavigation({ className, ariaLabel, includeTools = false }: { className?: string; ariaLabel: string; includeTools?: boolean }) {
  const pathname = usePathname();

  return <nav className={className} aria-label={ariaLabel}>
    {navigation.map(([href, label]) => {
      const current = isCurrentPath(pathname, href);
      return <Link href={href} aria-current={current ? "page" : undefined} key={href}>{label}</Link>;
    })}
    {includeTools ? <><Link href="/search">搜索</Link><Link href="/editor">编辑</Link></> : null}
  </nav>;
}
