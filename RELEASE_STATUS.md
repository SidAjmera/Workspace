# Workspace release status — 23 October 2026

Live site: https://workspaceapps.vercel.app/
Public repository: https://github.com/SidAjmera/Workspace
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

Release two version 1.1.0 is live. Commit e2d7ac9 deployed successfully as Vercel deployment 4SmtgM6HS4a9rBbXCmEWz2kNnwx7. The final unit/database suite passed 547 tests. TypeScript and production builds passed. All 22 local and all 22 hosted desktop/mobile checks passed, including the 159-app catalog, equal app navigation, device-audio review reload, shared account screens, guest cloud restrictions and protected API responses.

Release-two SQL is supabase/release-two.sql. Embedded PostgreSQL tests verify opt-in enforcement, RLS isolation, stale-write rejection, audio-pointer preservation and deletion behavior. Migration-history and connected schema-write requests returned invalid request-state errors. The reviewed upgrade was applied transactionally through the Supabase SQL editor, then the new tables were verified to have RLS and all three new functions were verified to be SECURITY INVOKER. No new security-advisor findings were added. Do not claim a recorded migration-history entry or rerun the one-time schema blindly.

## Real account/device checks still required

Email delivery and confirmation, signed-in profile/history sync across actual devices, authenticated audio upload/download/transfers/deletion, physical microphones and real AI-provider calls still need an actual account/device check. Browser recordings use synthetic WAV fixtures; transport tests use mocks and SQL tests supply synthetic claims in embedded PostgreSQL. These are not live authenticated-upload verification.

Full account deletion is queued for operator processing after file/app-data cleanup. Both original standalone sites remain available for legacy browser-data export.

## Neutral domain and visual redesign

The new production address and exact authentication callback are configured in Vercel and Supabase. The previous address remains connected for device-data export, with a migration notice linking to the new home. A full shared-home redesign adds illustrated equal app cards, ivory/evergreen styling, improved navigation and account/privacy surfaces. Commit 2acae57 deployed successfully as Vercel deployment 4DRLs2PE8UtoKS3xKfWVJXqgVFKG. TypeScript and the production build passed. All 22 local and 22 hosted desktop/mobile checks passed against the redesigned site. Additional layout checks at 320px, 390px and 1280px found no horizontal overflow on home, settings, privacy or either app. Dark mode, the visible waveform and the live legacy-origin migration notice were also verified.

## Blue studio theme and expandable Workspace Apps address

The public home is now https://workspaceapps.vercel.app/. workspace-apps.vercel.app was unavailable. Shared light/dark palettes follow Musecoach, with a header theme toggle available before sign-in. Previous addresses remain available for exporting browser-only data and link to the new home. Commit d854087 deployed successfully as Vercel deployment HhwqJR7wtJcF8bLUpRTa9FapzhHY. TypeScript and the production build passed; all 22 local and 22 live desktop/mobile checks passed. Additional 320px, 390px and 1280px checks confirmed theme switching, reload persistence and no horizontal overflow across home, both apps, settings and privacy. Live light/dark switching, the new exact Supabase callback, and the former-domain migration link were also verified. Both original READMEs were updated and pushed.

## Active app headers and All Apps sidebar

The shared header identifies the current app, with a modal All Apps sidebar replacing the top app tabs. Prefix breadcrumbs, fixed two-app wording and the existing-Toolnest-account sign-in claim were removed. Sidebar focus, Escape, responsive layout and production rollout checks are in progress.
