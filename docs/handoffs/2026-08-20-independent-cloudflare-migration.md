# Handoff: Independent Cloudflare hosting — code ready, infrastructure blocked

**Date:** 2026-08-20 · **Receiver:** next single coding/deployment Agent · **Data decision:** A, preserve all old D1/R2 data

## Goal and done-state

Run the public blog and owner web editor on Guo Yue's Cloudflare Worker, D1, R2 and Access without any runtime dependency on ChatGPT Sites or its identity headers. Completion requires a verified lossless old-data migration, anonymous/owner smoke tests and a deployment whose SHA matches GitHub `main`.

## Current state

- [x] Base application: `fed77ea58e35a258ca6badfb72986476a7e125a9`.
- [x] Approved design: `docs/superpowers/specs/2026-08-20-independent-cloudflare-hosting-design.md`.
- [x] Executable plan: `docs/superpowers/plans/2026-08-20-independent-cloudflare-hosting.md`.
- [x] P1: `app/owner-auth.ts` verifies Access RS256 JWT signature, issuer, audience, expiry and owner email; old GPT auth module and imports removed.
- [x] P2: root `wrangler.jsonc`, independent Vite config, D1/R2 scripts and docs; Sites manifest/plugin and unused image-optimization binding removed.
- [x] P3: same-origin/fetch-metadata checks on every editor write, `PUBLIC_ORIGIN`, and pre-write `MIGRATION_MODE` bootstrap guard.
- [x] P7: GitHub workflow always verifies lint/tests and uses immutable `cloudflare/wrangler-action@9acf94ace14e7dc412b076f2c5c20b8ce93c79cd`; deploy step skips when secrets are absent.
- [x] Verification: lint passes; production build passes; full suite is 250/250; `git diff --check` passes; no runtime ChatGPT/OpenAI/Sites references remain.
- [ ] P4: create Cloudflare resources and replace configuration sentinels.
- [ ] P5: export and verify old Sites D1/R2; source export remains unproven.
- [ ] P6: deploy staging and execute browser/data/security acceptance.

## Mandatory stop

Do not create resources or change `MIGRATION_MODE` until the user supplies/verifies:

- Cloudflare Account ID
- workers.dev subdomain
- Zero Trust team domain
- Access application audience
- owner email
- access to the old Sites editor or another lossless D1/R2 export path

Never invent these values and never commit credentials. The repository's UUIDs and `.invalid` origins are deliberate non-production sentinels.

## Next steps

1. Ask the user for the six items above and whether the old editor currently opens and shows the expected drafts/images.
2. Create staging D1 `reading-journal-d1-staging`, private R2 `reading-journal-assets-staging` and a Worker in the user's account.
3. Create Access protection for `/admin*`, `/editor*`, `/api/editor*`; do not protect public `/media/*`. Keep application-side JWT verification.
4. Replace only staging sentinels in `wrangler.jsonc`; store `BLOG_OWNER_EMAIL` as a secret; keep `MIGRATION_MODE=true`.
5. Apply both migrations in `drizzle/` without opening `/admin`.
6. Freeze old writes, export seven D1 tables and every unique R2 `object_key`, import and verify normalized hashes plus asset sizes/SHA-256.
7. Prove D1 is active with an old published article absent from the repository's static five-article fallback.
8. Deploy staging and run the design §7 anonymous, owner, invalid-JWT, CSRF, draft-media and responsive editor matrix.
9. Configure GitHub secrets only after manual staging succeeds; confirm GitHub release SHA equals the deployed Worker version.

**Start here →** Collect the Cloudflare identity values and verify old-site accessibility. No further source implementation is currently required.

## Key locations

- Repository: `https://github.com/guoyue0412/reading-journal-sites`
- Local release repository: `/Users/guoyue/Documents/Codex/2026-07-22/sites-plugin-sites-openai-bundled/.release-worktrees/reading-journal-sites`
- Auth: `app/owner-auth.ts`
- CSRF: `lib/blog/csrf.ts`
- Bootstrap guard: `lib/blog/bootstrap.ts`
- Worker config: `wrangler.jsonc`
- CI: `.github/workflows/deploy.yml`
- Tests: `tests/blog-auth.test.mjs`, `tests/csrf.test.mjs`, `tests/independent-hosting.test.mjs`

## Receiver prompt

> Read this handoff, the approved design and the implementation plan completely. Continue as a single Agent from GitHub `main`. Do not alter source code merely to replace sentinels until the user's Cloudflare identity values are verified. Preserve old data (decision A), keep migration mode enabled through import verification, never expose credentials, and report real command/API/browser evidence rather than assuming a successful deploy.
