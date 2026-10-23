# Workspace release status — 23 October 2026

Live site: https://sidajmera-workspace.vercel.app/
Private repository: https://github.com/SidAjmera/Workspace
Local project: C:/Users/ajmer/OneDrive/Documents/Coding/Workspace

## Release one production setup completed

The user explicitly approved the remaining settings. BYOK_SESSION_SECRET was imported as a Vercel Secret for Production and Preview, and production redeployment 8K43rYcdahBJ7tzP9anDN1SGaXD3 reached Ready. Supabase's Site URL is the neutral workspace address, and its exact /auth/callback was added while retaining the previous three redirects. No secret values are committed or printed in these notes.

## Release two implementation

- Optional, independently controlled profile and review sync, both off by default.
- Automatic sync on opening/returning, reconnection and saved device changes, with manual Sync now and visible failures.
- Cloud reviews without saved audio, preserving independent recording choices.
- Revisions and explicit conflict-resolution controls, without silently overwriting concurrent edits.
- Copy/move recordings between device and private cloud storage, with destination-first save, failure recovery and explicit return transfers.
- Deletion markers that prevent background resurrection, and device-only exclusions after moving out of cloud.
- Export/deletion/privacy updates for new cloud profiles, choices and markers.
- Both original app READMEs and the neutral Workspace README updated with scoped behavior and implementation status.

## Validation and rollout

The final unit/database suite passed 547 tests. TypeScript and production builds passed. The expanded local desktop/mobile suite passed all 22 checks. Production rollout and the final hosted checks are in progress.

Release-two SQL is supabase/release-two.sql. Embedded PostgreSQL tests verify opt-in enforcement, RLS isolation, stale-write rejection, audio-pointer preservation and deletion behavior. Migration-history and connected schema-write requests returned invalid request-state errors. The reviewed upgrade was applied transactionally through the Supabase SQL editor, then the new tables were verified to have RLS and all three new functions were verified to be SECURITY INVOKER. No new security-advisor findings were added. Do not claim a recorded migration-history entry or rerun the one-time schema blindly.

## Real account/device checks still required

Email delivery and confirmation, signed-in profile/history sync across actual devices, authenticated audio upload/download/transfers/deletion, physical microphones and real AI-provider calls still need an actual account/device check. Browser recordings use synthetic WAV fixtures; transport tests use mocks and SQL tests supply synthetic claims in embedded PostgreSQL. These are not live authenticated-upload verification.

Full account deletion is queued for operator processing after file/app-data cleanup. Both original standalone sites remain available for legacy browser-data export.
