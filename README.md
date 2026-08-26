# 郭跃

**具身世界模型 / World-Action Model 算法方向**

📍 深圳 · 📧 [your-email@example.com] · 📱 [your-phone-number]  
[论文阅读](./content/papers/) · [实习记录](./content/internship/) · [秋招复盘](./content/jobs/) · [日常思考](./content/reflections/)

---

## 关于我

我关注的问题是：**如何让生成式世界模型成为可部署、可泛化的机器人策略**。  
硕士阶段围绕 **Cosmos-Predict2.5-2B、DiT4DiT、OpenPI π₀.₅** 开展 Video2World、future latent prediction、跨本体动作适配及真机部署，具备多源机器人数据统一、开源模型后训练与多机多卡训练实践。

> 这个主页同时是我的简历、项目证据索引与阅读笔记入口。如果你是我的面试官或合作者，建议从下方的「快速入口」开始看。

---

## 快速入口 Fast Entry

| 项目 | 关键词 | 我做了什么 | 关键结果 | 证据 |
|---|---|---|---|---|
| **BAAI · WAM 预训练** | Cosmos-Predict2.5-2B, PolicyDiT, ActionExpert | 搭建 Video2World → PolicyDiT → ActionExpert 三阶段 WAM；统一 DROID/EgoDex/AgiBot/RoboTwin 动作空间到 head-camera frame | 策略路径无需完整视频去噪，单次前向解码 30-step action chunk | `clean_2026/02-internship/baai-wam/`（训练日志与可视化待补） |
| **BAAI · DiT4DiT / OpenArms** | DiT4DiT, LeRobot v3, 跨本体 | 冻结 DiT backbone，新增 embodiment 适配层，完成 LIBERO 8D → OpenArms 16D 动作迁移与双臂叠衣后训练 | 多视角预测与双臂协调动作序列生成 | 见下方「项目演示」/ `clean_2026/02-internship/baai-dit4dit/` |
| **道通 · VLA 真机落地** | OpenPI π₀.₅, 智元 G1, ROS2 | 负责数据清洗 → 8 卡 A800 全量微调 → ROS2 端云部署的完整闭环 | 动态抓取成功率 **40%+ → 70%+**；LIBERO-10 平均 **96.6%** | 见下方「项目演示」/ `clean_2026/02-internship/daotong-vla/` |
| **道通 · BPTT 可微仿真** | JAX, BPTT, Sim-to-Real | 构建 JAX 可微动力学引擎与残差模型，建立 1h 内多轮调参验证体系 | 公司首个实践验证的 RL 控制器，**获 10 万元项目奖金** | 见下方「项目演示」/ `clean_2026/02-internship/daotong-bptt/` |
| **道通 · 残差动力学管线** | PyTorch, Transformer, WebDataset | 设计 Transformer 动力学与残差双头预测，重构数据管线 | 平移动力学预测精度 **提升 10 倍**；训练吞吐 **提升 1000%** | `clean_2026/02-internship/daotong-residual/`（可视化待补） |
| **Colugo** | VLA, Multi-Scale Latent World Model | 参与 slow/fast future 建模与 flow-based Action DiT 调制；完成多平台消融 | LIBERO-Long / CALVIN ABC→D / AgileX Nero 消融评测 | `clean_2026/03-research/colugo/` |

> **边界说明**：WAM 与 Colugo 为团队共建项目；道通 VLA/BPTT/残差动力学、BAAI DiT4DiT 中我主导了从算法到落地的完整链路或关键子模块。

---

## 项目演示

> 以下视频可直接在 GitHub 上播放。完整证据库（含未放入仓库的大文件）见 `clean_2026/`。

### BAAI · OpenArms 双臂叠衣与多视角预测

<video src="./assets/evidence/baai-dit4dit/openarm_demo.mp4" controls width="60%"></video>

*OpenArms 双臂叠衣 demo*

<video src="./assets/evidence/baai-dit4dit/agibot_multiview_pred.mp4" controls width="60%"></video>

*AgiBot 多视角视频预测*

<video src="./assets/evidence/baai-dit4dit/robotwin_multiview_pred.mp4" controls width="60%"></video>

*RoboTwin 多视角视频预测*

### 道通 · VLA 真机操作（智元 G1 + OpenPI π₀.₅）

<video src="./assets/evidence/daotong-vla/vla_realrobot_test.mp4" controls width="60%"></video>

*真机 VLA 测试（动态抓取成功率 40%+ → 70%+）*

<video src="./assets/evidence/daotong-vla/vr_teleop_1.mp4" controls width="60%"></video>

*VR 遥操作数据采集*

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <video src="./assets/evidence/daotong-vla/libero10_task00.mp4" controls width="30%"></video>
  <video src="./assets/evidence/daotong-vla/libero10_task02.mp4" controls width="30%"></video>
  <video src="./assets/evidence/daotong-vla/libero10_task06.mp4" controls width="30%"></video>
</div>

*LIBERO-10 仿真评测示例（平均成功率 96.6%）*

### 道通 · BPTT 可微仿真与 Sim-to-Real

<video src="./assets/evidence/daotong-bptt/变形飞车迁移.mp4" controls width="60%"></video>

*变形飞车迁移效果*

<video src="./assets/evidence/daotong-bptt/极限.mp4" controls width="60%"></video>

*极限工况测试*

<video src="./assets/evidence/daotong-bptt/炸机.mp4" controls width="60%"></video>

*失败案例分析（炸机）*

### 人形机器人

<video src="./assets/evidence/humanoid/third_view.mp4" controls width="60%"></video>

*人形机器人第三视角*

---

## 教育经历

| 时间 | 学校 | 学院 | 学位 | GPA |
|---|---|---|---|---|
| 2024.08 – 2027.06（预计） | 哈尔滨工业大学（深圳） | 机器人与先进制造学院 | 硕士（保研） | 3.639 / 4.0 |
| 2020.09 – 2024.06 | 吉林大学 | 汽车工程学院 | 本科 | 3.826 / 4.0 |

---

## 实习经历

### 智源人工智能研究院（BAAI）· 认知大模型组
**世界模型与机器人策略算法实习生 · 2026.04 – 至今**

参与 World-Action Model 预训练与跨本体后训练，核心课题是让视频生成模型作为策略教师，同时避免策略路径承担完整的多步视频去噪开销。

- **Head Camera-Frame WAM 训练栈**（Cosmos-Predict2.5-2B, PolicyDiT, ActionExpert, DeepSpeed）
  - 搭建 Video2World 2B DiT → PolicyDiT → ActionExpert/ActionDecoderDiT 三阶段 WAM；以 Cosmos-Predict2.5-2B 为教师，在固定低噪声时刻对齐 condition-frame hidden states，聚合 future-aware 表征。
  - PolicyDiT 单次前向预测，ActionExpert 解码 30-step action chunk（2 s），策略路径无需完整多步去噪，缓解 train-inference 输入不一致。
  - 将 DROID、EgoDex、AgiBot、RoboTwin 动作空间统一变换到 head-camera frame，以带 action_mask/confidence 的 48D EE pose delta 兼容异构本体。
  - 多视角视频 latent 沿 width 维拼接联合预测，注入 FPS 条件与 3D RoPE，统一不同采样率下的时间尺度与空间位置编码。

- **OpenArms 双臂叠衣跨本体后训练**（DiT4DiT, LeRobot v3.0）
  - 冻结 DiT backbone，新增 OpenArms embodiment 适配层，将 LIBERO 8D 单臂动作空间迁移到 OpenArms 16D 双臂动作序列。
  - 接入 LeRobot v3 多视角 RGB、本体状态与语言指令，完成双臂叠衣任务的跨本体后训练与协调动作序列生成。

### 深圳市道通智能航空技术股份有限公司
**强化学习算法工程师 · 前沿预研 · 2025.11 – 2026.04**

- **VLA 真机具身操作落地预研**（智元 G1 + OpenPI π₀.₅，OpenPI / ROS2 / LeRobot/OXE）
  - 基于 8 卡 A800 全量微调 OpenPI π₀.₅ Flow Matching VLA；完成 VR 遥操轨迹清洗、quantile normalization 与 LeRobot/OXE 格式转换。
  - 完成 224×224 图像输入、Action Chunk 下发及 ROS2 端云推理，**智元 G1 动态抓取成功率由 40%+ 提升至 70%+**。

- **高动态 BPTT 可微仿真与 Sim-to-Real**（JAX, BPTT, TensorRT）
  - 构建 JAX 可微动力学引擎与二阶阻力模型，使用 Surrogate Gradients 缓解长时域梯度发散；以 Transformer 残差模型补偿仿真-实飞动力学差异。
  - 训练 200–1000 轮获得可控控制器，约 2000 轮达到较小轨迹跟踪误差，建立 1h 内多轮调参验证体系；**获 10 万元项目奖金**。

- **残差动力学模型与高吞吐数据管线**（PyTorch, Transformer, WebDataset）
  - 构建 Transformer 动力学与残差双头预测，结合可微物理链式求导隐式监督和残差置信度建模，**平移动力学预测精度提升 10 倍，残差误差降至 < 5%**。
  - 以轨迹池预生成、WebDataset 块级打散和自动课程学习替代 DataLoader，**训练吞吐提升 1000%**。

---

## 科研与项目经历

### Colugo：多尺度潜在世界模型引导的 VLA 机器人操作研究
**协作研究 · 2026**

- 参与 Multi-Scale Latent World Modeling：以 learnable slow/fast queries 从 VLM hidden states 预测 latent futures，通过 dual cross-attention + MLP fusion 调制 flow-based Action DiT。
- 训练采用 sparse slow-future targets 与 dense future reconstruction，推理阶段移除 reconstruction decoder。
- 在 LIBERO-Long、CALVIN ABC→D 及 AgileX Nero + RealSense D455 上完成 no future / slow only / fast only / slow+fast 消融评测。

### 复合机器人月球探索
**项目负责人 · 2025.05 – 2025.07**

- 负责全向底盘 + 5-DOF 机械臂系统研发，融合 RGB-D / LiDAR / IMU 实现自主建图、动态避障与目标夹取。
- 获中国机器人及人工智能大赛**国家级一等奖**及**全场最快成绩**。

### 无人机抗风性能优化及底层控制
**项目负责人 · 2024.10 – 2025.08**

- 构建 DNN/CNN 气动代理、PPO 调参智能体与 C++ 模糊 PID，将扰动下轨迹追踪误差**降低 76.6%**。
- 项目获评优秀开题。

---

## 核心技能

| 方向 | 具体内容 |
|---|---|
| 视频生成/预测与策略建模 | Video2World、Diffusion / Flow Matching、VLA、future latent / latent dynamics、跨本体动作空间适配 |
| 训练与数据工程 | PyTorch、JAX、DeepSpeed、多机多卡与 bf16 混合精度；WebDataset、LeRobot/OXE、多源机器人数据统一与加权采样 |
| 评测与部署 | LIBERO / CALVIN 消融评测、JAX BPTT 与 Sim-to-Real；ROS2 端云推理、TensorRT/ONNX 部署 |
| 语言 | 英语 CET-4 545 / CET-6 464 |

---

## 荣誉奖项

- 国家奖学金（2 / 145）
- 黑龙江省优秀学生
- 哈尔滨工业大学（深圳）特等学业奖学金
- 中国大学生工程实践与创新能力大赛「智能+」赛道**金奖**（组长）
- 中国机器人及人工智能大赛**国家一等奖**（全场最快成绩）
- 2024 届吉林大学优秀毕业生
- 黎明人才奖学金 × 3（10 / 455）
- 苏州育才奖学金
- 吉林大学汽车工程学院十佳大学生

---

## 项目证据索引

> 本地完整证据库位于 `/Users/guoyue/gy_2026/clean_2026/`；部分精选视频已放入本仓库 `assets/evidence/`，可在 GitHub 直接播放。完整索引与缺失清单见 [`clean_2026/evidence-index.md`](/Users/guoyue/gy_2026/clean_2026/evidence-index.md)。

| 简历条目 | 本仓库视频 | 完整证据目录 |
|---|---|---|
| BAAI · OpenArms 双臂叠衣 | `assets/evidence/baai-dit4dit/`（3 段） | `clean_2026/02-internship/baai-dit4dit/` |
| 道通 · VLA 真机操作 | `assets/evidence/daotong-vla/`（5 段） | `clean_2026/02-internship/daotong-vla/` |
| 道通 · BPTT 可微仿真 | `assets/evidence/daotong-bptt/`（3 段） | `clean_2026/02-internship/daotong-bptt/` |
| 人形机器人 | `assets/evidence/humanoid/third_view.mp4` | `clean_2026/04-projects/humanoid/` |
| 科研 · Colugo | — | `clean_2026/03-research/colugo/` |
| 奖项 · 黑龙江省优秀学生 | — | `clean_2026/05-awards/` |
| 各版本简历 | — | `clean_2026/06-resume/` |

**缺失待补**：BAAI WAM 独立 demo 视频、道通残差动力学可视化、复合机器人月球探索比赛视频/证书、无人机抗风飞行 demo、多数奖项高清证书扫描件。

---

## 精选笔记

> 从 `content/` 目录中挑选的几篇记录。

- [UniTacVLA：触觉如何进入动作生成](./content/papers/unitacvla-reading.md) —— 从动作条件化视角理解视觉、语言与触觉如何共同影响策略输出。
- [实习第 47 天：第一次把一个模型真正跑进业务](./content/internship/day-47-model-in-production.md) —— 离线指标之外，模型进入真实业务链路时学到的事。
- [秋招不是一场考试，而是一段重新认识自己的旅程](./content/jobs/autumn-recruiting-journey.md) —— 投递、面试与选择背后的思考。

## 内容目录

- **论文阅读** → [`content/papers/`](./content/papers/)
- **秋招记录** → [`content/jobs/`](./content/jobs/)
- **实习日记** → [`content/internship/`](./content/internship/)
- **个人感悟** → [`content/reflections/`](./content/reflections/)
