# React Bits 局部增强全站排版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有博客的首页、索引、文章与编辑器中实现一致、克制且无障碍的互动排版。

**Architecture:** 复用现有页面和内容模型，仅增加语义类名与全局视觉令牌。所有视觉反馈由 CSS 处理，避免引入动画依赖或修改保存、发布、Markdown、D1 数据链路。

**Tech Stack:** Next.js、React 19、Tailwind 导入层、原生 CSS、Node test。

## Global Constraints

- 不修改文章数据、D1 schema、Markdown 导入导出、LaTeX 和发布接口。
- 保留桌面、平板、手机断点与编辑器的保存行为。
- 支持 `prefers-reduced-motion`、`prefers-reduced-transparency`、`prefers-contrast`。
- 不新增第三方运行时依赖；只借鉴 React Bits 的交互模式。

---

### Task 1: 建立统一的站点外壳与环境层

**Files:**
- Modify: `components/site-shell.tsx`
- Modify: `app/globals.css`
- Test: `tests/react-bits-layout.test.mjs`

- [x] 为站点外壳增加 `site-shell` 与两个非交互环境层，使用 `aria-hidden="true"`。
- [x] 在 CSS 中定义 `--accent`, `--accent-soft`, `--ambient`, `--panel-border`，并实现静态可读的环境光、点阵、浮层和按压反馈。
- [x] 测试外壳具有环境层且减少动态偏好会关闭环境动画。

### Task 2: 对首页、索引和文章应用同一层级语言

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/content-index.tsx`
- Modify: `components/paper-index.tsx`
- Modify: `components/markdown-article.tsx`
- Modify: `app/globals.css`
- Test: `tests/react-bits-layout.test.mjs`

- [x] 为首页首屏、模块卡、索引头部、筛选区域、文章头部和关联文章补充稳定的语义类名。
- [x] 复用同一描边、圆角、投影、悬停和焦点规则；正文内容不添加滚动或循环动画。
- [x] 测试文章正文未被标为动画面板，论文筛选和文章头部具有预期标记。

### Task 3: 将写作工作台纳入相同设计系统

**Files:**
- Modify: `components/editor/structured-editor.tsx`
- Modify: `app/globals.css`
- Test: `tests/react-bits-layout.test.mjs`

- [x] 为工具栏、保存状态、侧栏、表单、预览和模块卡应用共享材质类。
- [x] 保持 `aria-live` 状态提示与原有发布、自动保存逻辑不变。
- [x] 验证编辑器仍有桌面三栏、平板双栏和手机编辑/预览切换规则。

### Task 4: 验证并发布

**Files:**
- Test: `tests/*.test.mjs`

- [x] 运行 lint、构建和全部 Node 测试。
- [x] 对桌面、平板与手机断点进行浏览器验证，检查页面无横向溢出且编辑器操作区可达。
- [ ] 将通过验证的源代码发布到现有博客地址。
