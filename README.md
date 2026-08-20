# 郭跃的个人博客

记录研究项目、论文阅读、秋招、实习与个人随笔，并提供站长专用的结构化网页编辑器。

## 发布文章

1. 打开 `/editor`，通过站点的 Cloudflare Access 登录。
2. 新建或选择文章，填写结构化字段和 Markdown 模块。
3. 等待顶部显示“已保存”，检查预览中的图片与 LaTeX。
4. 点击“发布”。自动保存只修改私有草稿，公开正文只读取发布快照。

编辑器支持 Markdown 双向导入导出、本地图片上传/粘贴、KaTeX 公式、常用模块和移动端编辑。

## 本地开发

要求 Node.js `>=22.13.0`：

```bash
npm install
npm run db:migrate:local
npm run dev
```

在忽略提交的 `.env` 中设置 `BLOG_OWNER_EMAIL` 和 `OWNER_AUTH_DEV_BYPASS=true` 可进行本地 owner 调试。生产环境禁止身份绕过。

## 独立 Cloudflare 配置

`wrangler.jsonc` 是 Worker 配置事实源。应用固定使用：

- D1 binding：`DB`
- R2 binding：`BLOG_ASSETS`
- Access：`CF_ACCESS_TEAM_DOMAIN`、`CF_ACCESS_AUD`、`BLOG_OWNER_EMAIL`
- Canonical origin：`PUBLIC_ORIGIN`
- 迁移保护：`MIGRATION_MODE=true`

仓库中的资源 UUID 和 `.invalid` 地址是不可部署的安全哨兵。创建用户自有的 staging/production D1、R2 和 Access application 后再替换，并通过 Cloudflare Secrets 设置 owner email。

```bash
npm run db:migrate:staging
npm run deploy:staging
npm run db:migrate:production
npm run deploy
```

Access 应保护 `/admin*`、`/editor*` 和 `/api/editor*`，但不能覆盖公开 `/media/*`。应用仍会验证 Access JWT，不能只相信身份邮箱 header。

## 质量门禁

```bash
npm run lint
npm test
```

旧站数据采用完整保留策略。在旧 D1/R2 导出、导入和哈希验证完成前，保持 `MIGRATION_MODE=true`，不要打开空数据库后台触发内容初始化。
