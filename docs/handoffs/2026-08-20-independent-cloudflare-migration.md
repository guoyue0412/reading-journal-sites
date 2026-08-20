# Handoff: Migrate the personal blog away from ChatGPT Sites

**From:** Codex primary agent · **To:** A fresh coding/deployment agent · **Date:** 2026-08-20
**Assumptions:** The receiver has repository access but no conversation history. The user wants a genuinely independent website, not merely different branding or a custom domain in front of ChatGPT Sites.

## Goal & done-state

Move the complete personal blog and structured web editor from ChatGPT Sites to infrastructure owned by Guo Yue: Cloudflare Worker + D1 + R2, with Cloudflare Access protecting the editor. The migration is complete only when public reading, Markdown/LaTeX rendering, image delivery, web editing, autosave, import/export and publishing work on the independent host; no runtime path depends on ChatGPT Sites, ChatGPT sign-in, `chatgpt.site`, or forgeable `oai-authenticated-user-*` headers.

Do not call the work complete until old data has either been migrated and verified or the user has explicitly authorized a fresh start from GitHub content.

## Current state

- [x] Done: Release candidate is committed at `fed77ea58e35a258ca6badfb72986476a7e125a9` on local branch `codex/research-archive-redesign`.
- [x] Done: Working tree was clean when this handoff was generated.
- [x] Done: Code is pushed to the private repository `https://github.com/guoyue0412/reading-journal-sites`; GitHub `main` was verified at the same `fed77ea...` commit.
- [x] Done: Existing public rendering is already GPT-independent. Markdown, GFM, images and LaTeX/KaTeX are rendered inside the application.
- [x] Done: Read-only architecture and migration-risk audits selected Cloudflare Worker + D1 + R2 + Access as the smallest safe independent architecture.
- [x] Done: Existing logical resource bindings are known: D1 must remain `DB`; R2 must remain `BLOG_ASSETS` at the application boundary.
- [x] Done: Repository fallback content contains 8 Markdown articles: 5 published and 3 drafts. Those files contain no `/media/` references.
- [~] In progress: Design approval is blocked on the old-data decision below. No migration code or Cloudflare production configuration has been written.
- [ ] Untouched: Cloudflare account resources, Access application, production D1/R2, domain, deployment workflow and data migration.
- [ ] Unverified: A lossless export of the old ChatGPT Sites D1 and R2.

## Mandatory stop before implementation

Ask the user exactly one question before changing migration code or creating production resources:

> 是否必须完整保留旧 ChatGPT Sites 中网页端独有的草稿、历史版本、常用模块和上传图片？请选择：A 必须保留；B 以 GitHub Markdown 为准并接受旧站独有数据丢失；C 先盘点旧数据再决定。

Recommended choice: **A, preserve everything**. The current Sites project returns `NOT_FOUND` under the available identity, so preservation first requires restoring owner access or establishing a reliable export path. Do not silently downgrade A or C to a fresh database.

## Next steps (in order)

1. **Resolve the data decision with the user.** Record A/B/C in the design; do not create or bootstrap the target D1 before this is explicit.
2. **Write and commit the formal design** at `docs/superpowers/specs/2026-08-20-independent-cloudflare-hosting-design.md`. Cover architecture, trust boundaries, data migration, rollback and the full verification matrix. Self-review it, then ask the user to approve it.
3. **Write the implementation plan** only after design approval. Keep authentication, hosting configuration, media routing, data migration and deployment verification as independently testable phases.
4. **Replace Sites authentication.** Retire `app/chatgpt-auth.ts` in favor of a generic owner-auth module that verifies `Cf-Access-Jwt-Assertion` signature, issuer, audience, expiry and owner email. Never trust `Cf-Access-Authenticated-User-Email` or any `oai-authenticated-user-*` header without a verified JWT.
5. **Add independent deployment configuration.** Create a root `wrangler.jsonc` with real environment-specific D1/R2 bindings, compatibility flags and non-secret Access variables. Remove `.openai/hosting.json`, the Sites Vite plugin and placeholder production resource identifiers.
6. **Separate public and private media access.** Keep published `/media/:id/:name` anonymous. Serve draft media through an Access-protected editor route and prevent Access from covering all public media.
7. **Add write-request CSRF/origin protections.** Access authentication alone is not a sufficient CSRF control.
8. **Handle the unused `IMAGES` binding.** The smallest safe option is to remove the `/_vinext/image` optimization branch and use unoptimized images because the current app uses ordinary Markdown `<img>` elements.
9. **Create staging resources.** Create a new Worker, D1 and private R2 in the user's Cloudflare account. Apply both migrations from `drizzle/` but keep `/admin` inaccessible until the data decision is satisfied.
10. **Migrate data if A is selected.** Freeze writes; export all seven D1 tables; copy every unique R2 `object_key`; import and verify counts, primary-key-normalized hashes, published revision references, object sizes and SHA-256 values. Preserve `blog_state`, including `blog_bootstrapped`.
11. **Bootstrap only if B is selected.** Initialize the new D1 from the 8 repository Markdown files and explicitly report that web-only drafts, revisions, templates and uploaded assets were not recovered.
12. **Deploy first to a `workers.dev` staging URL.** Protect every alternate hostname so it cannot bypass Access. Bind a custom domain only after anonymous and owner smoke tests pass.
13. **Add GitHub deployment last.** Start with a manually verified deployment; only then add a pinned Cloudflare Wrangler GitHub Action.
14. **Run final gates.** Require lint, complete tests, production build, clean worktree, public route checks, owner editor workflow, forged/invalid JWT rejection, CSRF rejection, draft-media privacy and mobile/tablet/desktop checks.

**Start here →** Ask the A/B/C old-data preservation question and wait for the answer.

## Decisions already made (don't relitigate)

- Use **Cloudflare Worker + D1 + R2 + Cloudflare Access** — the application already targets Cloudflare bindings, so this preserves the editor without rewriting persistence.
- Keep the public site anonymous and protect only the editor/admin/API trust boundary — visitors must not need an account to read articles or published images.
- Validate the Access JWT inside the application — a copied identity header is not an authorization boundary.
- Keep logical binding names `DB` and `BLOG_ASSETS` — storage adapters already depend on those names.
- Deploy to `workers.dev` for staging before a custom domain — domain choice must not block functional migration.
- Treat GitHub as code and tracked-content storage, not as proof that the live database or images are backed up.
- Preserve the current locked vinext setup for the first migration — evaluating OpenNext is a later, separate upgrade and should not be combined with the hosting move.

## Abandoned paths (tried or ruled out)

- **GitHub Pages/static hosting** — cannot retain web editing, autosave, uploads, publishing APIs, D1 or R2.
- **Vercel migration** — would require rewriting `cloudflare:workers`, D1 storage, R2 storage and owner authentication; unnecessary risk for this migration.
- **Only bind a custom domain to the old Sites project** — changes the URL but leaves runtime and login dependent on ChatGPT Sites.
- **Deploy the generated `dist/server/wrangler.json` directly** — it contains an all-zero D1 ID and `site-creator-r2` placeholder bucket.
- **Trust `oai-authenticated-user-email` on the new host** — externally forgeable without the Sites proxy and therefore an authorization vulnerability.
- **Use Markdown export as a full backup** — it does not contain revision history, templates, D1 state or R2 bytes.
- **Open an empty target admin before migration** — can trigger legacy bootstrap and hide or complicate the real migration state.

## Open questions / risks

- **P0 — old runtime data:** The old Sites project ID is `appgprj_6a61a1f70c5881919c26ca0628f50ac7`, but it currently returns `NOT_FOUND` under the available identity. Lossless D1/R2 export is not proven.
- **P0 — identity:** Cloudflare account, Access team domain, Access audience, owner email configuration and domain ownership have not been verified. Do not invent or commit these values.
- **P0 — configuration:** The current generated Wrangler file contains placeholder resources and is not deployable production configuration.
- **P1 — static fallback:** Public pages may look healthy while reading the repository fallback instead of the target D1. Verify with an article that is not among the 5 static published entries.
- **P1 — data pairing:** D1 `blog_assets` and R2 objects must migrate together. Missing either side causes broken or inaccessible media.
- **P1 — local recovery:** `localStorage` recovery drafts are origin-specific and do not follow the user to the new domain.
- **P1 — alternate hostname bypass:** `workers.dev`, preview deployments and custom domains must share equivalent authentication controls.
- **P1 — CSRF:** Access session cookies do not replace origin/fetch-metadata validation on editor writes.
- **P2 — metadata origin:** Prefer a controlled `PUBLIC_ORIGIN` over blindly trusting forwarded host headers for canonical and OG URLs.
- **P2 — cutover:** Define old-domain redirect/canonical behavior and retain the old site read-only for a rollback window.

## Required acceptance matrix

### Public and privacy

- Anonymous `/`, `/papers`, `/blog`, `/post/...` and published `/media/...` return the expected content.
- Anonymous `/admin*`, `/api/editor*` and draft media cannot be accessed.
- A forged old GPT identity header has no effect.
- Missing, forged, expired, wrong-issuer and wrong-audience Access JWTs all fail closed.
- A valid Access identity with a non-owner email is rejected.

### Editor

- The owner can create, edit, autosave, refresh, import/export Markdown, upload/paste images and publish.
- Markdown images, inline/display LaTeX and structured blocks survive refresh and import/export.
- Version conflicts, recovery copies, upload/edit races and reading-summary validation retain their existing tested behavior.
- Mobile, tablet and desktop editing remain usable.

### Data

- All seven tables are accounted for: `posts`, `post_sections`, `section_templates`, `post_revisions`, `post_relations`, `blog_state`, `blog_assets`.
- Row counts and normalized hashes match where a lossless migration was selected.
- Every non-null `published_revision_id` resolves to its revision.
- Every unique R2 `object_key` exists and matches D1 `size_bytes` and `sha256`.
- `blog_bootstrapped`, custom templates, drafts and revisions are retained.

### Release

- `npm run lint`, complete `npm test` and production build pass.
- The worktree remains clean after tests/build.
- HTML and redirects no longer expose ChatGPT/OpenAI login routes or `chatgpt.site` runtime dependencies.
- GitHub source commit, deployed Worker version and verification report identify the same release SHA.

## Key locations

- **Repository:** `https://github.com/guoyue0412/reading-journal-sites` (private)
- **Local release worktree:** `/Users/guoyue/Documents/Codex/2026-07-22/sites-plugin-sites-openai-bundled/.release-worktrees/reading-journal-sites`
- **Branch / commit:** `codex/research-archive-redesign` at `fed77ea58e35a258ca6badfb72986476a7e125a9`; GitHub `main` was pushed to the same SHA.
- **Current Sites manifest:** `.openai/hosting.json`
- **Sites build coupling:** `vite.config.ts`, `build/sites-vite-plugin.ts`
- **Current owner auth:** `app/chatgpt-auth.ts`
- **Protected pages/APIs:** `app/admin/`, `app/api/editor/`
- **Public/draft media route:** `app/media/[id]/[name]/route.ts`
- **Worker entry:** `worker/index.ts`
- **D1/R2 adapters:** `lib/blog/d1-store.ts`, `lib/blog/d1-asset-store.ts`
- **Schema/migrations:** `db/schema.ts`, `drizzle/0000_conscious_captain_stacy.sql`, `drizzle/0001_dark_proudstar.sql`
- **Bootstrap/read fallback:** `lib/blog/bootstrap.ts`, `lib/blog/read-model.ts`
- **Current generated placeholder config:** `dist/server/wrangler.json`
- **Official references:**
  - Cloudflare Next.js on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
  - Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
  - Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
  - Access application paths: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
  - D1 import/export: https://developers.cloudflare.com/d1/best-practices/import-export-data/
  - R2 with rclone: https://developers.cloudflare.com/r2/examples/rclone/

## Copy-paste task for the receiving agent

> Read `docs/handoffs/2026-08-20-independent-cloudflare-migration.md` completely. Continue from commit `fed77ea58e35a258ca6badfb72986476a7e125a9`. First ask the user the A/B/C old-data preservation question in the Mandatory stop section. Do not edit migration code, create production resources, deploy, or bootstrap a target database until that answer and the formal design are approved. After approval, follow TDD and the ordered migration/verification gates in this handoff. Preserve unrelated changes and never commit credentials.
