# 郭跃 · Yue Guo

**具身世界模型 · World-Action Model · 机器人学习**

哈尔滨工业大学（深圳）硕士，机器人与先进制造学院，CAIA 实验室，预计 2027 年 6 月毕业。

我关注如何把视频预测与机器人动作连接起来：用统一的视觉动作表示连接不同本体，用多流建模整合多视角与多模态观测，再通过数据、评测和真机反馈迭代模型。

[个人主页](https://guoyue0412.github.io/reading-journal-sites/) · [WAM 原生页面](https://guoyue0412.github.io/reading-journal-sites/wam.html) · [演示画廊](https://guoyue0412.github.io/reading-journal-sites/gallery.html) · [GitHub](https://github.com/guoyue0412) · [论文阅读](./content/papers/)

## 关于我

我的工作集中在具身世界模型、World-Action Model 和视觉—动作联合建模，目标是让生成式模型连接多模态观测、机器人动作和真实执行反馈。

## 科研与项目经历

### RoboDojo · 大小脑协同框架

**在研 · VLM 任务决策与进度监控 × WAM 动作执行**

面向长程机器人操作，研究由上层任务决策与下层动作预测协同的分层框架。

- **大脑（VLM）：** 结合整体任务与当前、历史多视角观测，维护子目标和执行进度，对小脑提出的动作候选进行高层判断。
- **小脑（WAM / OminiEWM）：** 以任务指令、观测历史和本体状态为条件，预测短时动作序列。
- **协同反馈：** 将执行后的实测观测纳入历史，为后续的进度判断与动作预测提供反馈。

[查看个人主页中的大小脑框架](https://guoyue0412.github.io/reading-journal-sites/#robodojo)

### Dream4ACT · 跨本体视觉动作接口

*Dream4ACT: A Shared Visual Action Interface for Multi-Embodiment Video-Action Modeling*

**ICLR 2027 · 已投稿（Submitted）**

基于 URDF 将异构关节配置表示为四视角动作视频，复用视频骨干联合建模观测与动作；通过 training-free 多视角几何匹配恢复可执行关节轨迹，无需本体专属动作解码头或真实相机外参对齐。

- RoboTwin2.0 全部 50 项任务在 Clean / Randomized 设置下的平均成功率为 **88.98%**；两种设置分别为 90.50% 与 87.46%，每项任务每种设置 100 次试验。
- 全 50 任务评测与跨本体验证使用不同 checkpoint。跨本体验证以固定权重支持四种真机平台，放置与擦拭两项共同任务的平台平均成功率为 **85%–90%**；这不是未见本体零样本泛化或整体榜单声明。

### WEAVE-0.5 · 多流具身世界模型

*WEAVE-0.5: Weaving Multi-stream Observations into Embodied World Models*

**ICLR 2027 · 已投稿（Submitted）**

通过原生分辨率独立编码、共享虚拟画布与跨流注意力，统一可变视角、混合分辨率及多模态观测，支持未来预测、跨视角补全和模态互转。

- 参与模型训练与数据消融，搭建评测平台，开展 bad case 分析与数据回流；建设 YouTube 视频管线和 Sim–Real 成对数据生产链路。
- MV-261 上联合生成深度流时，主视角 PSNR 从 **15.74 提升至 17.87 dB（+2.13 dB）**；RBench 第一、TriWorldBench 第二均为论文报告的评测快照。

### WAM · 未来表征蒸馏与动作预测

智源 BAAI · 框架设计与实现

以 Cosmos-Predict2.5-2B 为视频教师，通过 PolicyDiT 学习未来相关表征，再由 ActionExpert 解码动作序列。视频教师仅由 `L_video` 更新；学生的 `L_align` 与 `L_action` 均不回传教师。统一 DROID、AgiBot、RoboTwin 与 EgoDex 的动作表示为头部相机坐标系下、相对固定当前帧 `t₀` 的 EE pose delta，并结合多流 RoPE 与视角特征向量开展多视角建模。部署时移除视频教师，PolicyDiT 一次前向生成表征，动作模块仍需多步采样。

WAM 在 Franka 平台完成 **100 次 rollout，成功率约 80%**；另以新本体后训练学习曲线的坡度开展消融验证。详见 [WAM 原生页面](https://guoyue0412.github.io/reading-journal-sites/wam.html)。

### Colugo · 多尺度潜在世界模型引导 VLA

**协作研究 · 2026.04.26–2026.06.04**

参与以 learnable slow / fast queries 预测 latent futures，通过 dual cross-attention 与 MLP fusion 调制 flow-based Action DiT；在 LIBERO-Long、CALVIN ABC→D 和 AgileX Nero + RealSense D455 上完成消融与真机验证，推理阶段移除 reconstruction decoder。

## 实习经历

### 北京人形机器人创新中心 · 大模型组

**具身智能算法实习生 · 2026.07.31–至今**

<a id="weave-05"></a>

#### Weave 0.5｜多流具身世界模型预训练

参与 WEAVE-0.5、Dream4ACT 相关研究，搭建 Isaac Sim 轨迹回放、域随机化与 Sim2Real / Real2Sim 数据链路，建设 YouTube 与 Sim–Real 成对数据基建，结合评测和 bad case 分析推进数据迭代。项目模型的 RBench 第一为论文报告快照。

### 智源人工智能研究院（BAAI）· 认知大模型组

**世界模型与机器人策略算法实习生 · 2026.04–2026.07.28**

负责 WAM 框架设计与实现，开展异构动作表征统一、Ego 数据处理及教师–学生蒸馏。在 Franka 平台完成 100 次 rollout，成功率约 80%，并开展新本体后训练学习曲线坡度消融。

负责酒店场景中 DiT4DiT 的数据采集、模型训练与 OpenArm 真机部署，实现证件交互；OpenArms 双臂叠衣属于复现验证。

### 道通智能 · 前沿预研

**强化学习算法工程师 · 2025.11–2026.04**

负责 OpenPI π₀.₅ SFT 与 ROS2 真机部署；将真机纠偏与恢复数据回流用于纠偏 SFT，使工厂抓取放置任务的真机成功率由 **40% 提升至 70%**；LIBERO-10 仿真评测平均成功率为 **96.6%**。构建 JAX BPTT 可微仿真与残差动力学管线，训练吞吐达到原来的 **10 倍**，动力学预测误差降至原来的 **十分之一**。

## 项目演示

以下页面保留可播放的原有媒体，并标注演示与研究成果的边界：

- [原生演示画廊](https://guoyue0412.github.io/reading-journal-sites/gallery.html)：Sim–Real 成对数据、WAM 多视角预测、OpenArms 叠衣复现、道通真机与 BPTT 视频。
- [Markdown 演示索引](./projects.md)：兼容 GitHub 的视频与 GIF 入口。

## 教育经历

| 时间 | 学校 | 学院 | 学位 / 专业 | GPA |
|---|---|---|---|---|
| 2024.08–2027.06（预计） | 哈尔滨工业大学（深圳） | 机器人与先进制造学院 | 硕士 · 动力工程（保研，专业学位） | 3.639 / 4.0（前 5%） |
| 2020.09–2024.06 | 吉林大学 | 汽车工程学院 | 本科 · 动力工程（已保研） | 3.826 / 4.0（前 5%） |

硕士实验室 / 导师：CAIA / Bernd Noack。

## 核心技能

- **模型与训练：** PyTorch、JAX、DeepSpeed；DiT、Diffusion / Flow Matching、VLM / VLA、多机多卡训练。
- **数据与仿真：** LeRobot / OXE、DROID、EgoDex、AgiBot、RoboTwin；Isaac Sim、MuJoCo；Sim-to-Real / Real-to-Sim 场景搭建。
- **评测与部署：** LIBERO、CALVIN、RoboTwin、RoboDojo；ROS2、TensorRT / ONNX；bad case 分析与真机迭代。
- **编程：** Python、ROS、MATLAB，C++ 入门；具备 RLT 等在线强化学习方法复现实践。

## 荣誉奖项

- 中国机器人及人工智能大赛国家级一等奖（全场最快成绩）。
- 中国大学生工程实践与创新能力大赛「智能+」赛道全国总决赛金奖（组长）。
- 国家奖学金、黑龙江省优秀学生、哈工大（深圳）特等学业奖学金等。

## 内容入口

- [论文阅读](./content/papers/)
- [实习记录](./content/internship/)
- [秋招复盘](./content/jobs/)
- [日常思考](./content/reflections/)

*最后更新：2026-10-22*
