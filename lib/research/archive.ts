export type ResearchEvidence =
  | { label: string; href: string }
  | { label: string; note: string };
export type ResearchProject = {
  id: string;
  field: string;
  title: string;
  question: string;
  contribution: string;
  evidence: ResearchEvidence[];
};
export type ResearchTopic = { label: string; href: string };

export const researchProfile = {
  name: "郭跃",
  latinName: "Guo Yue",
  field: "具身智能研究",
  statement: "关注视觉—语言—行动模型、世界模型、机器人学习与仿真，连接研究问题和可靠的具身系统。",
  currentQuestion: "如何让机器人从多模态经验中形成可执行、可迁移，并能在真实交互中持续校正的动作理解？",
  links: [
    { label: "GitHub", href: "https://github.com/guoyue0412" },
    { label: "简历", href: "/about#resume" },
    { label: "联系", href: "/about#contact" },
  ],
} as const;

export const researchProjects: ResearchProject[] = [
  {
    id: "lingbot-va",
    field: "VLA",
    title: "LingBot-VA",
    question: "如何让语言条件、视觉观测与机器人动作形成可靠的闭环策略？",
    contribution: "围绕语言驱动操作整理模型、数据与真实执行之间的系统连接。",
    evidence: [{ label: "查看 VLA 研究笔记", href: "/post/unitacvla-reading" }],
  },
  {
    id: "egoengine",
    field: "WORLD MODEL",
    title: "EgoEngine",
    question: "第一视角世界模型如何为交互提供可执行的预测，而不只生成视觉结果？",
    contribution: "围绕第一视角交互组织预测目标、动作条件与执行评估。",
    evidence: [{ label: "阶段档案", note: "暂无公开证据；后续补充可验证的论文、代码或实验产物。" }],
  },
  {
    id: "genwam",
    field: "SIMULATION",
    title: "GenWAM",
    question: "生成式环境如何同时服务机器人学习、系统验证与泛化评估？",
    contribution: "连接生成式环境、策略学习和可复核的评估流程。",
    evidence: [{ label: "阶段档案", note: "暂无公开证据；后续补充可验证的论文、代码或实验产物。" }],
  },
];

export const researchTopics: ResearchTopic[] = [
  { label: "VLA", href: "/search?q=VLA" },
  { label: "世界模型", href: "/search?q=世界模型" },
  { label: "动作与状态表征", href: "/search?q=动作表征" },
  { label: "灵巧操作", href: "/search?q=灵巧操作" },
  { label: "仿真与泛化", href: "/search?q=仿真" },
];
