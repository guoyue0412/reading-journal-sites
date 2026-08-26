# 项目演示（完整画廊）

> 主页只展示代表作，本页收录全部演示。GIF 自动播放，**点击任意 GIF 可播放完整视频**（mp4）。  
> 返回 [主页](./README.md) · 完整证据库（含未放入仓库的大文件）见本地 `clean_2026/`。

---

## 北京人形 · Sim2Real / Real2Sim 动作数据闭环

天轶2.0+Robotiq 与松灵双臂两平台 8 个 case 运动复现，REAL | SIM 视频对时长误差 0.01s 级。

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href="./assets/evidence/humanoid-sim2real/tianyi_hangclothes_REAL_SIM.mp4"><img src="./assets/gifs/sim2real_tianyi_hangclothes.gif" width="45%"></a>
  <a href="./assets/evidence/humanoid-sim2real/tianyi_right_REAL_SIM.mp4"><img src="./assets/gifs/sim2real_tianyi_right.gif" width="45%"></a>
</div>

*天轶 2.0 + Robotiq：REAL | SIM 帧级对齐视频对（挂衣服 / 右臂动作）*

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href="./assets/evidence/humanoid-sim2real/blue_REAL_SIM.mp4"><img src="./assets/gifs/sim2real_blue.gif" width="30%"></a>
  <a href="./assets/evidence/humanoid-sim2real/purple_REAL_SIM.mp4"><img src="./assets/gifs/sim2real_purple.gif" width="30%"></a>
  <a href="./assets/evidence/humanoid-sim2real/tray_REAL_SIM.mp4"><img src="./assets/gifs/sim2real_tray.gif" width="30%"></a>
</div>

*松灵双臂：REAL | SIM 视频对（BLUE / PURPLE / TRAY 三个 case）*

---

## BAAI · WAM 多视角视频预测

多视角视频 latent 沿 width 维拼接联合预测，注入 FPS 条件与 3D RoPE。以下为 2×2 多视角画面，GT 与模型预测逐对对比。

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href="./assets/evidence/baai-wam/agibot_mobile_gt_2x2.mp4"><img src="./assets/gifs/agibot_mobile_gt_2x2.gif" width="45%"></a>
  <a href="./assets/evidence/baai-wam/agibot_mobile_pred_2x2.mp4"><img src="./assets/gifs/agibot_mobile_pred_2x2.gif" width="45%"></a>
</div>

*AgiBot 移动双臂：GT（左）vs WAM 预测（右）*

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href="./assets/evidence/baai-wam/robotwin_aloha_gt_2x2.mp4"><img src="./assets/gifs/robotwin_aloha_gt_2x2.gif" width="45%"></a>
  <a href="./assets/evidence/baai-wam/robotwin_aloha_pred_2x2.mp4"><img src="./assets/gifs/robotwin_aloha_pred_2x2.gif" width="45%"></a>
</div>

*RoboTwin aloha-agilex：GT（左）vs WAM 预测（右）*

---

## BAAI · OpenArms 双臂叠衣（DiT4DiT 跨本体后训练）

<a href="./assets/evidence/baai-dit4dit/openarm_demo.mp4"><img src="./assets/gifs/openarm_demo.gif" width="45%"></a>

*OpenArms 双臂叠衣 demo（LIBERO 8D → OpenArms 16D 动作迁移）*

---

## 道通 · VLA 真机操作（智元 G1 + OpenPI π₀.₅）

<a href="./assets/evidence/daotong-vla/vla_realrobot_test.mp4"><img src="./assets/gifs/vla_realrobot.gif" width="60%"></a>

*真机 VLA 测试（动态抓取成功率 40%+ → 70%+，policy infer 延迟约 75 ms）*

<a href="./assets/evidence/daotong-vla/vr_teleop_1.mp4"><img src="./assets/gifs/vr_teleop.gif" width="60%"></a>

*VR 遥操作数据采集*

<div style="display: flex; gap: 10px; flex-wrap: wrap;">
  <a href="./assets/evidence/daotong-vla/libero10_task00.mp4"><img src="./assets/gifs/libero10_task00.gif" width="30%"></a>
  <a href="./assets/evidence/daotong-vla/libero10_task02.mp4"><img src="./assets/gifs/libero10_task02.gif" width="30%"></a>
  <a href="./assets/evidence/daotong-vla/libero10_task06.mp4"><img src="./assets/gifs/libero10_task06.gif" width="30%"></a>
</div>

*LIBERO-10 仿真评测示例（平均成功率 96.6%）*

---

## 道通 · BPTT 可微仿真与 Sim-to-Real

<a href="./assets/evidence/daotong-bptt/变形飞车迁移.mp4"><img src="./assets/gifs/bptt_morph.gif" width="60%"></a>

*变形飞车迁移效果*

<a href="./assets/evidence/daotong-bptt/极限.mp4"><img src="./assets/gifs/bptt_extreme.gif" width="60%"></a>

*极限工况测试*

<a href="./assets/evidence/daotong-bptt/炸机.mp4"><img src="./assets/gifs/bptt_crash.gif" width="60%"></a>

*失败案例分析（炸机）*

---

## 人形机器人

<a href="./assets/evidence/humanoid/third_view.mp4"><img src="./assets/gifs/humanoid_third_view.gif" width="60%"></a>

*人形机器人第三视角*
