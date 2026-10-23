# Workspace release status — 23 October 2026

Live site: https://sidajmera-workspace.vercel.app/
Private repository: https://github.com/SidAjmera/Workspace
Local project: C:/Users/ajmer/OneDrive/Documents/Coding/Workspace

## Implemented and checked

- Equal Toolnest and Musecoach modules under one public origin, with neutral home and app switcher.
- Shared Supabase sign-in, shared account appearance/display-name controls, account-scoped local data and logout.
- Per-take measurements-only, device-audio or private-cloud-audio choice; cloud reviews accompany cloud recordings.
- Private Supabase bucket with 20 MB audio limit and owner-only storage policies; owner-only workspace profile and review tables.
- Explicit guest-session import, legacy-site backup migration guidance, separate app/entire-workspace deletion and export controls.
- 509 unit/database tests passed, including both original suites and new account/cloud/RLS coverage.
- TypeScript and production builds passed, including an independent build after moving to the neutral folder.
- 16 local desktop/mobile browser checks and 16 live-site desktop/mobile checks passed. Browser recordings use synthetic WAV fixtures.
- Supabase security advisor reports the pre-existing intentional consume_ai_quota SECURITY DEFINER warning; no new workspace SECURITY DEFINER functions were added.
- Both original repositories remain unchanged and available for legacy browser-data export.

## Pending explicit approval

Automatic approval review blocked transmitting the new generated encryption secret to Vercel. It has not been uploaded or saved there. Its ignored local file is .env.vercel and contains only a new BYOK_SESSION_SECRET. The existing Toolnest deployment's secret was not copied to the new production project.

Finish these reviewed settings after approval:

1. Import .env.vercel into Vercel project sidajmera-workspace as a Secret named BYOK_SESSION_SECRET for Production and Preview, then redeploy. The public Supabase URL/key and ENABLE_EXPERIMENTAL_COREPACK=1 are already configured.
2. Set the existing Supabase project's Site URL to https://sidajmera-workspace.vercel.app and add the exact redirect https://sidajmera-workspace.vercel.app/auth/callback while retaining existing redirects. The local workspace callback http://127.0.0.1:3100/auth/callback may also be added for development.

Until then, Toolnest AI connection encryption is not configured on the new deployment, and new confirmation emails may return to the original Toolnest site. Existing confirmed account credentials can use the shared sign-in form; no real account password was used in the browser checks.

## Remaining real-account/device verification

Email delivery and confirmation, authenticated cloud upload/download/deletion across devices, physical microphones and real AI-provider calls need an actual account/device check. SQL/RLS tests execute with synthetic claims in embedded PostgreSQL, and cloud transport unit tests use mocks. Do not claim those are live authenticated upload verification.

The additive database SQL is supabase/workspace.sql and is already applied. The MCP migration-history call failed, so do not run the non-idempotent schema again or claim a recorded migration-history entry. Full account deletion is explicitly queued for operator processing after app data and cloud-file cleanup.
