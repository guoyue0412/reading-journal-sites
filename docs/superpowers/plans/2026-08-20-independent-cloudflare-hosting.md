# Independent Cloudflare Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove ChatGPT Sites runtime dependencies while preserving the complete public blog and owner-only web editor on Cloudflare Worker, D1, R2 and Access.

**Architecture:** Keep the vinext Worker and existing D1/R2 stores. Replace Sites headers with verified Cloudflare Access JWT identity, add same-origin write protection and a migration bootstrap guard, then deploy through a gated GitHub workflow.

**Tech Stack:** Next 16, React 19, vinext 0.0.50, Cloudflare Workers/D1/R2/Access, TypeScript, Node test runner, GitHub Actions.

## Global Constraints

- Work in the isolated release repository and preserve unrelated changes.
- Use one Agent only, as requested by the user.
- Use TDD for behavior changes: observe RED before production edits.
- Keep D1/R2 binding names `DB` and `BLOG_ASSETS`.
- Never trust unverified identity headers and never commit credentials.
- Old-data decision is A: target bootstrap remains disabled until verified migration.
- P4–P6 stop when Cloudflare identity or source export access is unavailable.

---

### Task 1: Recover the approved specification and plan

**Files:**
- Create: `docs/superpowers/specs/2026-08-20-independent-cloudflare-hosting-design.md`
- Create: `docs/superpowers/plans/2026-08-20-independent-cloudflare-hosting.md`

**Interfaces:**
- Consumes: user-provided migration handoff.
- Produces: the committed authority for Tasks 2–6.

- [ ] Write both documents with the fixed architecture, migration decision A, trust boundaries and acceptance matrix.
- [ ] Run `git diff --check`; expect exit 0.
- [ ] Commit only the two documents with `docs: recover independent hosting design`.

### Task 2: Replace ChatGPT identity with Cloudflare Access identity

**Files:**
- Create: `app/owner-auth.ts`
- Delete: `app/chatgpt-auth.ts`
- Modify: `app/admin/page.tsx`, `app/admin/posts/page.tsx`, `app/media/[id]/[name]/route.ts`, `lib/blog/http.ts`, all `app/api/editor/**/route.ts`
- Modify: `tests/blog-auth.test.mjs`, `tests/editor-source.test.mjs`, `tests/editor-api-source.test.mjs`

**Interfaces:**
- Produces: `OwnerUser`, `BlogAuthError`, `getOwnerUser()`, `requireBlogOwner()`, `assertBlogOwner()`, `isBlogOwner()`.
- Configuration: `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `BLOG_OWNER_EMAIL`; ignored local `OWNER_AUTH_DEV_BYPASS=true` only outside production.

- [ ] Add tests that create signed RS256 JWTs and assert valid owner acceptance plus rejection of missing token, forged signature, wrong issuer, wrong audience, expiry, wrong email and old GPT headers.
- [ ] Run `node --experimental-strip-types --test tests/blog-auth.test.mjs`; expect failures because `owner-auth.ts` is absent.
- [ ] Implement compact JWT parsing, JWKS lookup/import with Web Crypto, claim validation and fail-closed owner checks.
- [ ] Replace imports and UI labels without changing editor/store behavior.
- [ ] Run auth and editor source tests; expect all pass.
- [ ] Commit scoped files with `feat: replace Sites auth with Access JWT`.

### Task 3: Add independent Worker configuration

**Files:**
- Create: `wrangler.jsonc`
- Modify: `vite.config.ts`, `worker/index.ts`, `package.json`, `README.md`, `db/index.ts`
- Delete: `.openai/hosting.json`, `build/sites-vite-plugin.ts`
- Test: `tests/independent-hosting.test.mjs`

**Interfaces:**
- Consumes: logical bindings `DB`, `BLOG_ASSETS`.
- Produces: deployable configuration shape with explicit non-secret resource sentinels for staging/production.

- [ ] Add source-contract tests rejecting `.openai`, Sites plugin, ChatGPT paths, zero D1 IDs, `site-creator-*` names and the unused `IMAGES` branch; require the two logical bindings and migration directory.
- [ ] Run the focused test; expect the old configuration assertions to fail.
- [ ] Add root Wrangler configuration, make Vite read it, remove Sites packaging, remove image optimization branch, add migration/deploy scripts and rewrite README deployment guidance.
- [ ] Run focused tests and production build; expect pass.
- [ ] Commit scoped files with `build: add independent Cloudflare hosting`.

### Task 4: Enforce same-origin writes, canonical origin and migration guard

**Files:**
- Create: `lib/blog/csrf.ts`
- Modify: mutating `app/api/editor/**/route.ts`, `app/layout.tsx`, `lib/blog/bootstrap.ts`
- Test: `tests/editor-api-source.test.mjs`, `tests/rendered-html.test.mjs`, `tests/legacy-bootstrap.test.mjs`, `tests/csrf.test.mjs`

**Interfaces:**
- Produces: `assertSameOrigin(request: Request): void`, `BlogCsrfError`, `PUBLIC_ORIGIN` metadata preference, `MIGRATION_MODE=true` bootstrap refusal.

- [ ] Add tests for matching origin, cross-origin rejection, missing origin with same-origin/none fetch metadata, public-origin metadata and migration guard.
- [ ] Run focused tests; expect failures because the new guard is absent.
- [ ] Implement the guard and call it before every mutating handler body, including asset upload.
- [ ] Prefer validated `PUBLIC_ORIGIN` in metadata and fail before legacy import when migration mode is active.
- [ ] Run focused and complete tests; expect pass.
- [ ] Commit scoped files with `feat: harden independent editor writes`.

### Task 5: Add gated GitHub deployment

**Files:**
- Create: `.github/workflows/deploy.yml`
- Test: `tests/independent-hosting.test.mjs`

**Interfaces:**
- Consumes: GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Produces: mandatory verify job and conditional deploy job on `main`.

- [ ] Extend the source-contract test to require lint/test verification and a Wrangler action pinned to an immutable commit SHA; require deployment to be skipped when secrets are absent.
- [ ] Run the focused test; expect failure because the workflow is absent.
- [ ] Add the workflow with Node 22, `npm ci`, lint/test, and a secret-gated deploy step.
- [ ] Run focused test, lint, full tests and production build; expect pass.
- [ ] Commit with `ci: add gated Cloudflare deployment`.

### Task 6: External staging and lossless migration

**Files:**
- Modify after values exist: `wrangler.jsonc`
- Produce locally/securely: migration inventory and verification report; never commit credentials or raw private data.

**Interfaces:**
- Requires: Account ID, workers.dev subdomain, team domain, Access audience, owner email, source D1/R2 export access.
- Produces: staging Worker/D1/R2/Access, verified imported data and smoke-test evidence.

- [ ] Stop and request missing Cloudflare identity values; do not invent them.
- [ ] Create staging D1/R2 and apply both `drizzle/` migrations with migration guard enabled.
- [ ] Freeze old writes, export seven tables, copy every unique R2 object, import and compare normalized hashes/asset hashes.
- [ ] Deploy staging and verify anonymous, owner, invalid identity, CSRF, draft media and editor workflow matrices.
- [ ] Configure GitHub secrets and confirm a `main` push deploys the same release SHA.
- [ ] Only after approval, bind the custom domain and retain the old site read-only for rollback.
