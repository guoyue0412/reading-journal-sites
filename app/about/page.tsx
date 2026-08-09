import Link from "next/link";
import { ResearchShell } from "@/components/research-shell";

export default function AboutPage() {
  return <ResearchShell>
    <header className="archive-page-heading"><p className="archive-kicker">ABOUT</p><h1>Guo Yue</h1><p>我关注 Embodied AI、World Models、Robot Learning 与 Simulation，尝试把研究想法转化为能在真实世界中工作的具身系统。</p></header>
    <div className="archive-page-section archive-about">
      <section id="resume" aria-labelledby="resume-title"><p className="archive-kicker">PROFILE</p><h2 id="resume-title">简历与经历</h2><p>本站暂未发布单独的简历文件。当前可从研究项目、论文阅读与秋招记录了解我的公开工作与关注方向。</p><nav aria-label="公开经历入口"><Link href="/projects">研究项目</Link><Link href="/papers">论文阅读</Link><Link href="/jobs">秋招记录</Link></nav></section>
      <section id="contact" aria-labelledby="contact-title"><p className="archive-kicker">CONTACT</p><h2 id="contact-title">联系</h2><p>目前公开且可验证的联系入口是 GitHub 主页；本站不展示未经确认的邮箱或其他联系方式。</p><a href="https://github.com/guoyue0412" rel="me">访问 GitHub ↗</a></section>
    </div>
  </ResearchShell>;
}
