# Apple Design 全站升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为阅读端和结构化编辑器提供一致、可访问、跨设备的 Apple Design 界面体验。

**Architecture:** 保持 React 路由和博客数据层不变；将视觉系统集中在 `app/globals.css` 的主题变量和语义类中，编辑器仅增加必要的语义 class 与状态属性。测试以静态源码断言保护响应式、无障碍和编辑器操作层。

**Tech Stack:** Next/Vinext、React、CSS、Node test。

## Global Constraints

- 不改动文章、模板、D1 或发布 API 的数据契约。
- 正文采用现有衬线字体，控件采用系统无衬线字体。
- 所有可触控控件最小高度 44px；动效尊重 reduced-motion、reduced-transparency 与高对比偏好。
- 不新增外部依赖或装饰性图片。

---

### Task 1: 建立全站材质与动效基础

**Files:**
- Modify: `app/globals.css`
- Test: `tests/editor-responsive.test.mjs`

- [ ] **Step 1: 写入失败测试**

断言样式包含 `--surface` 语义变量、`backdrop-filter` 工具层、`prefers-reduced-transparency` 和 `prefers-contrast: more`。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/editor-responsive.test.mjs`
Expected: FAIL，缺少 Apple Design 主题规则。

- [ ] **Step 3: 实施最小样式系统**

在 `:root` 添加纸张、实体表面、浮层和强调色变量；为按钮、链接、筛选器和导航补充即时按压反馈、焦点与跨偏好媒体查询。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/editor-responsive.test.mjs`
Expected: PASS。

### Task 2: 阅读端层级与响应式升级

**Files:**
- Modify: `app/globals.css`
- Test: `tests/rendered-html.test.mjs`

- [ ] **Step 1: 写入失败测试**

断言页面保留 `site-header`、文章内容和索引组件语义，并且 CSS 为阅读卡片/筛选提供材质、44px 控件与手机断点。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/rendered-html.test.mjs`
Expected: FAIL，缺少阅读端 Apple Design 样式钩子。

- [ ] **Step 3: 实施阅读端样式**

升级导航、模块卡片、索引筛选器、文章元数据与关联内容；维持正文宽度、LaTeX 横向滚动和现有页面结构。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/rendered-html.test.mjs`
Expected: PASS。

### Task 3: 结构化编辑器工作台升级

**Files:**
- Modify: `components/editor/structured-editor.tsx`
- Modify: `components/editor/section-editor.tsx`
- Modify: `components/editor/add-section-drawer.tsx`
- Modify: `app/globals.css`
- Test: `tests/editor-source.test.mjs`

- [ ] **Step 1: 写入失败测试**

断言工具栏、保存状态、编辑模块和抽屉拥有明确的语义 class/ARIA 状态，且移动端编辑/预览切换不隐藏键盘焦点。

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/editor-source.test.mjs`
Expected: FAIL，缺少工作台材质与即时反馈钩子。

- [ ] **Step 3: 实施编辑器升级**

增加工具栏、保存状态和模块的语义 class，优化控件分组、侧栏选择态、浮层抽屉与移动端工具栏；不触碰保存、导入或发布请求。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/editor-source.test.mjs`
Expected: PASS。

### Task 4: 完整验证与发布

**Files:**
- Verify: `tests/*.test.mjs`
- Verify: `app/globals.css`

- [ ] **Step 1: 执行完整构建和测试**

Run: `npm test`
Expected: build succeeds and all tests pass.

- [ ] **Step 2: 检查桌面、平板、手机 CSS 断点**

Run: `node --test tests/editor-responsive.test.mjs tests/rendered-html.test.mjs`
Expected: PASS。

- [ ] **Step 3: 发布已验证版本**

将精确通过验证的源码推送、打包并部署至现有 Sites 项目。
