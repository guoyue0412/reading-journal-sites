import Link from "next/link";
import { SiteShell } from "../components/site-shell";

export default function NotFound() {
  return (
    <SiteShell>
      <section className="not-found" aria-labelledby="not-found-title">
        <p className="eyebrow">404 · LOST PAGE</p>
        <h1 id="not-found-title">页面没有找到</h1>
        <p>这篇文字可能尚未发布、已经移动，或这个地址从未存在。</p>
        <Link href="/">返回首页</Link>
      </section>
    </SiteShell>
  );
}
