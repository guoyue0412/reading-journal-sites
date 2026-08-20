# 独立 Cloudflare 托管设计规格

日期：2026-08-20 · 状态：用户已批准 · 数据决策：A，完整保留旧站 D1/R2 数据 · 执行约束：单一 Agent；代码经 GitHub 流转

## 1. 目标与完成条件

将完整博客从 ChatGPT Sites 迁移到郭跃自有的 Cloudflare Worker、D1、R2 和 Access。公开阅读、Markdown/LaTeX、图片、网页编辑、自动保存、导入导出和发布均需保留；运行时不得依赖 `chatgpt.site`、ChatGPT 登录或 `oai-authenticated-user-*` 请求头。

完成必须同时满足：独立基础设施、经验证的 owner 身份、旧数据无损迁移、完整功能回归、匿名与草稿隐私验证，以及 GitHub release SHA 与部署版本一致。

## 2. 架构

- 单个 Cloudflare Worker 承载现有 vinext 应用。
- 公开路由匿名访问；Access 保护 `/admin*`、`/editor*`、`/api/editor*`，但不覆盖公开 `/media/*`。
- 应用仍校验 `Cf-Access-Jwt-Assertion`：JWKS 签名、issuer、audience、expiry、email 全部通过后，再与 `BLOG_OWNER_EMAIL` 精确比较。
- D1 逻辑 binding 保持 `DB`；R2 逻辑 binding 保持 `BLOG_ASSETS`。
- 已发布图片继续通过 `/media/:id/:name` 公开读取；草稿图片由应用层 owner 校验，匿名请求返回 404。
- GitHub Actions 先执行 lint/test，只有 Cloudflare secrets 存在时才部署。

## 3. 信任与安全边界

不得信任 `oai-authenticated-user-email` 或未验证的 `Cf-Access-Authenticated-User-Email`。JWT 校验配置缺失、JWKS 不可用、token 格式错误、签名错误、issuer/audience/expiry 不符均 fail closed。

所有 mutating editor 请求必须经过 owner 校验和同源检查。允许同源 `Origin`；`Origin` 缺失时只接受 `Sec-Fetch-Site: same-origin` 或 `none`。跨站与来源不匹配返回 403。生产环境不得启用开发绕过。

`PUBLIC_ORIGIN` 是 canonical/OG URL 的事实源；只有未配置时才使用请求 host。目标 D1 未迁移完成时 `MIGRATION_MODE=true` 必须禁止 legacy bootstrap，避免空库被仓库内容污染。

## 4. 配置与部署

根级 `wrangler.jsonc` 是独立托管配置事实源，包含 staging/production 环境、`DB`、`BLOG_ASSETS`、`nodejs_compat` 和 Access 非秘密变量。资源 ID 在 Cloudflare 创建后写入；仓库不得包含 API token。

删除 `.openai/hosting.json`、Sites Vite 插件和生成包复制逻辑。当前应用没有 `next/image` 消费者，因此删除未绑定的 `IMAGES` 优化分支，静态资源由 `ASSETS`/vinext 处理。

## 5. 数据迁移

用户选择完整保留。目标库在源数据出口确认前不得 bootstrap。

迁移七张表：`posts`、`post_sections`、`section_templates`、`post_revisions`、`post_relations`、`blog_state`、`blog_assets`。R2 按唯一 `object_key` 复制，保留共享对象语义。冻结旧站写入后执行最终 D1 导出与 R2 增量同步。

验收包括表行数、主键排序后的规范化哈希、`published_revision_id` 完整性、模板/草稿/revision、`blog_bootstrapped`、R2 `size_bytes` 与 SHA-256。必须用一篇不在仓库静态公开 5 篇中的文章证明线上读取来自 D1，而非 fallback。

若旧 Sites 仍不可访问，P5 保持阻塞；不得把 GitHub Markdown 恢复描述为无损迁移。

## 6. 发布顺序与回滚

1. 代码改造与本地完整门禁。
2. 创建 staging Worker/D1/R2/Access，保持 migration guard。
3. 导出、迁移并验证旧数据。
4. 部署 `workers.dev` staging，完成匿名/owner smoke。
5. 配置 GitHub Secrets 后启用 main 部署。
6. 绑定自定义域名并设置旧域名 redirect/canonical。
7. 旧站只读保留一个回滚窗口；验收前不删除源资源。

## 7. 验收矩阵

- 匿名公开路由与已发布图片 200；后台、编辑 API、草稿图片不可访问。
- 伪造旧 GPT header、无效/过期/错误 issuer/audience JWT、非 owner 邮箱均失败。
- owner 可新建、保存、刷新、上传/粘贴图片、预览、Markdown 导入导出和发布。
- 图片、LaTeX、结构化组件在手机、平板和桌面保持一致。
- 同源写成功，跨站写 403；`MIGRATION_MODE=true` 不导入 legacy 内容。
- lint、完整 tests、production build、clean worktree 全部通过。
- 页面和跳转不再出现 ChatGPT/OpenAI 登录路径或 Sites 托管依赖。

## 8. 外部阻塞

P4–P6 需要用户的 Cloudflare Account ID、workers.dev subdomain、Zero Trust team domain、Access audience、owner email，以及旧 Sites 数据导出权限。这些值不得猜测或写进公开源码。
