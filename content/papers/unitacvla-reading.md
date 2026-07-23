---
title: UniTacVLA：触觉如何进入动作生成
slug: unitacvla-reading
type: papers
date: 2026-05-09
read_at: 2026-05-10
summary: 从动作条件化视角理解视觉、语言与触觉如何共同影响策略输出。
tags: [VLA, 触觉, 机器人学习]
related: [2026-07-22]
status: published
authors: [UniTacVLA Team]
venue: arXiv
year: 2026
paper_url: https://arxiv.org/
reading_status: reviewed
topics: [multimodal-policy, tactile-sensing, action-generation]
---

UniTacVLA 最值得追问的并不是“多加了一种模态”，而是触觉信息在什么时间尺度上改变动作生成。策略可以写成 $\pi(a_t\mid o_{\le t})$，但这里的观测已经不只是图像和指令，还包含接触发生之后才出现的局部反馈。

如果把视觉理解为接触前的全局先验，触觉更像接触后的高频校正信号。两者需要在动作序列中承担不同职责：

$$
a_t = f_\theta(v_{\le t}, l, \tau_{\le t})
$$

这也意味着评估不能只看任务是否最终完成，还要观察接触后的恢复动作、力控制稳定性，以及触觉缺失时策略的退化方式。

| 信号 | 策略职责 | 典型时间尺度 |
| --- | --- | --- |
| 视觉 | 接触前的全局先验 | 低频 |
| 触觉 | 接触后的局部校正 | 高频 |

```text
observation -> multimodal policy -> action sequence -> tactile correction
```
