# 郭跃 · Yue Guo

**具身世界模型预训练 · World-Action Model · 视觉—动作联合建模**

哈尔滨工业大学（深圳）硕士。关注如何将视频生成模型、多模态数据和机器人动作连接起来，让世界模型服务机器人预测与执行。

[项目主页与完整经历](https://github.com/guoyue0412/reading-journal-sites) · [演示画廊](https://github.com/guoyue0412/reading-journal-sites/blob/main/projects.md) · [论文阅读](https://github.com/guoyue0412/reading-journal-sites/tree/main/content/papers)

## 当前工作

**北京人形机器人创新中心 · Weave 0.5｜2026.08–至今**

参与多流具身世界模型预训练：基于 Wan2.2-5B DiT，以独立 stream 统一多视角 RGB、稠密视觉模态与骨架视频动作表示，在共享权重下实现跨流信息交互与多任务建模。项目模型取得 **RBench 榜单第一名**。

建设 **YouTube 视频管线与 Sim–Real 成对数据生产基建**：以统一轨迹语义和时间轴连接真实执行与仿真复现，结合 VLM judge、人工 bad case 筛检及指标可视化驱动数据回流。

## 此前经历

| 经历 | 主要工作 |
|---|---|
| 智源 BAAI · 2026.04–2026.08 | WAM 未来表征预测、EgoDex → Ego2Robot 转换、DiT4DiT 跨本体后训练与 OpenArms 双臂叠衣 |
| 道通智能 · 2025.11–2026.04 | OpenPI π₀.₅ 真机部署、JAX BPTT 可微仿真、残差动力学与高吞吐数据管线 |

## 技术方向

PyTorch · JAX · DiT / Flow Matching · 多机多卡训练 · LeRobot / OXE · ROS2 · Isaac Sim · MuJoCo

项目方法、个人贡献与对应演示集中维护在 [reading-journal-sites](https://github.com/guoyue0412/reading-journal-sites)。
