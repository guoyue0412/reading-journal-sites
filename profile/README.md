# 郭跃 · Yue Guo

**具身世界模型预训练 · World-Action Model · 视觉—动作联合建模**

哈尔滨工业大学（深圳）硕士，预计 2027 年 6 月毕业。关注如何将视频生成模型、多模态数据和机器人动作连接起来，让世界模型服务机器人预测与执行。

[个人主页](https://guoyue0412.github.io/reading-journal-sites/) · [WAM 原生页面](https://guoyue0412.github.io/reading-journal-sites/wam.html) · [演示画廊](https://guoyue0412.github.io/reading-journal-sites/gallery.html) · [论文阅读](../content/papers/)

## 当前工作

**北京人形机器人创新中心 · Weave 0.5｜2026.07.31–至今**

参与多流具身世界模型预训练：基于 Wan2.2-5B DiT，以独立 stream 统一多视角 RGB、稠密视觉模态与骨架视频动作表示，在共享权重下实现跨流信息交互与多任务建模。建设 YouTube 视频管线与 Sim–Real 成对数据生产基建，结合 VLM judge、人工 bad case 筛检及指标可视化驱动数据回流。RBench 第一为论文报告快照。

## 此前经历

| 经历 | 主要工作 |
|---|---|
| 智源 BAAI · 2026.04–2026.07.28 | WAM 框架设计与实现、异构动作表征统一、Ego 数据处理及教师–学生蒸馏；负责酒店场景 DiT4DiT 数据采集、训练与 OpenArm 真机证件交互，OpenArms 双臂叠衣为复现验证 |
| 道通智能 · 2025.11–2026.04 | OpenPI π₀.₅ 纠偏 SFT 与 ROS2 真机部署，工厂抓取放置真机成功率 40%→70%；LIBERO-10 平均 96.6%；JAX BPTT 与残差动力学管线吞吐 10 倍、动力学预测误差降至十分之一 |

## 研究成果

- **Dream4ACT**：RoboTwin2.0 全 50 项任务平均成功率 88.98%；全任务与跨本体验证使用不同 checkpoint。
- **WEAVE-0.5**：MV-261 主视角 PSNR 提升 2.13 dB；RBench 第一、TriWorldBench 第二均为论文评测快照。
- **WAM**：Franka 平台 100 次 rollout，成功率约 80%；详见 [WAM 原生页面](https://guoyue0412.github.io/reading-journal-sites/wam.html)。

## 技术方向

PyTorch · JAX · DeepSpeed · DiT / Flow Matching · VLM / VLA · LeRobot / OXE · ROS2 · Isaac Sim · MuJoCo · LIBERO · RoboTwin · TensorRT / ONNX

项目方法、个人贡献与演示集中维护在 [reading-journal-sites](https://github.com/guoyue0412/reading-journal-sites)。
