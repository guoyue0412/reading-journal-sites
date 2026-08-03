import { ResearchShell } from "@/components/research-shell";

export default function ProjectsPage() {
  return <ResearchShell><section className="research-intro"><p>SELECTED WORK</p><h1>Research projects.</h1><span>将视觉语言行动模型、世界模型、机器人学习与仿真连接到可靠的具身系统。</span></section><section className="project-grid"><article><p>VLA</p><h2>LingBot-VA</h2><span>面向语言驱动机器人操作的视觉—语言—行动研究。</span></article><article><p>WORLD MODEL</p><h2>EgoEngine</h2><span>第一视角世界建模与可执行的预测能力。</span></article><article><p>SIMULATION</p><h2>GenWAM</h2><span>用生成式环境模型连接仿真、学习与评估。</span></article></section></ResearchShell>;
}
