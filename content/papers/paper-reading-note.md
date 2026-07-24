---
title: 论文阅读标题
slug: paper-reading-note
type: papers
date: 2026-07-23
summary: 一句话概括论文的核心问题。
tags: [论文阅读]
related: []
status: draft
read_at: 2026-07-23
authors: []
venue: arXiv
year: 2026
paper_url: https://example.com/paper
reading_methods: [skim]
reading_status: in_progress
topics: []
---

## 粗读记录

### 核心问题

模型只负责归一化的输入和输出，而反归一化则需要给予别的类进行外层包装即可

如何创建一个合格的基类：

- 如何获取数据
- 如何计算损失
- 如何反传梯度（优化器）
- 训练循环/梯度积累/混合精度等辅助函数

### 继承类

开放四个方法

- forward
- get_action
- lazy_joint_video_action
- prepare_input

### Python 语法补充

#### BatchFeature

HuggingFace transformers 库提供的一个数据容器类，能自动把 list/numpy 转成 tensor。

```python
from transformers.feature_extraction_utils import BatchFeature

# 本质上就是一个 dict，但多了自动类型转换能力
batch = BatchFeature({
    "loss": torch.tensor(0.5),
    "action_pred": torch.randn(4, 24, 14),
    "video_pred": torch.randn(4, 33, 16),
})
```

#### @abstractmethod 装饰器

强制子类必须实现特定的方法。
