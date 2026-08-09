"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [["/", "研究"], ["/projects", "项目"], ["/papers", "论文"], ["/blog", "记录"], ["/about", "关于"]] as const;
const tools = [["/search", "搜索"], ["/editor", "编辑"]] as const;

function isCurrentPath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({ pathname, items }: { pathname: string; items: ReadonlyArray<readonly [string, string]> }) {
  return items.map(([href, label]) => {
    const current = isCurrentPath(pathname, href);
    return <Link href={href} aria-current={current ? "page" : undefined} key={href}>{label}</Link>;
  });
}

export function ResearchNavigation({ className, ariaLabel }: { className?: string; ariaLabel: string }) {
  const pathname = usePathname();

  return <nav className={className} aria-label={ariaLabel}>
    <NavigationLinks pathname={pathname} items={navigation} />
  </nav>;
}

export function ResearchToolNavigation({ className, ariaLabel }: { className?: string; ariaLabel: string }) {
  const pathname = usePathname();

  return <nav className={className} aria-label={ariaLabel}>
    <NavigationLinks pathname={pathname} items={tools} />
  </nav>;
}
