# Local designer harness

Repeatable browser checks for the invitation designer that need no Supabase, Docker or sign-in.

1. Copy `fixture-page.tsx` to `apps/web/src/app/(shell)/(docs)/documentation/zz-fixture/page.tsx` (this path is public in the proxy and needs no login). It mounts the real `InvitationDesigner` with fictional event data. **Never commit it there**; add it to `.git/info/exclude`.
2. Run `pnpm dev` (port 3000), then `node batch1.mjs out.json` etc. They need Playwright (`import "playwright"`) and a Chromium (`executablePath` in `lib.mjs`).

Scope and limits: server actions are not mocked, so saving fails and the status shows "saving…". These batches therefore verify editing, selection, undo/redo, history and layout only. Save/reload, uploads and exported-file inspection are covered by the authenticated specs in `apps/web/e2e/` and were **not** re-run in this environment, which has no Docker or local Supabase. Results are Chromium on Linux, desktop 1440×900 unless a batch says otherwise.
