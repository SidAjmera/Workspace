# Workspace

One Supabase account for **Toolnest** and **Musecoach**, maintained as equal sibling modules under a neutral workspace.

**Live:** https://sidajmera-workspace.vercel.app/

**Private source:** https://github.com/SidAjmera/Workspace

## Release two (1.1.0)

- Independent opt-in controls for Musecoach profile sync and review sync, both off by default.
- Profile sync includes coach choices, goals, comfortable range and favourites. Review sync includes existing and future measured reviews, session names and notes, including takes without saved audio.
- Enabled sync runs on opening/returning to the workspace, reconnection and local changes. Device edits remain available if a request fails. Sync errors are visible and can be retried from Account & settings.
- Revision checks prevent stale writes. Conflicts keep both versions: choose a cloud profile/review or explicitly upload the device profile; device review edits can be kept as a separate take.
- Four recording choices: measurements only, device audio, cloud review without audio, or private cloud audio with its review.
- Each saved review provides Copy/Move to cloud and Copy/Move to device. Copy keeps both locations. Move saves the destination before removing source audio; failure messages report when a destination copy succeeded but source cleanup failed.
- Moving a take to device excludes it from automatic re-upload. An explicit later transfer can restore its cloud copy; background sync cannot resurrect a deleted review.

Review sync never uploads device audio. Audio downloads occur for requested playback or explicit transfers, not as part of bulk review sync. API keys, conversations, designed-exercise drafts and solo-song guide audio are not synchronized.

## Equal app structure

- `/`: workspace home and app switcher.
- `/toolnest`: software discovery, 159-app catalog, comparisons and bookmarks.
- `/musecoach`: singing practice, analysis, exercises and reviews.
- `/settings`: shared Supabase sign-in, display name/appearance, optional sync, export and scoped deletion.
- `/privacy`: implemented data flows and storage choices.
- `modules/toolnest` and `modules/musecoach`: independent feature modules with separate aliases, scoped styles and API routes.
- `shared`: identity, account-scoped browser storage, sync coordination, conflict planning and recording transfers.

The original projects remain [SidAjmera/AppScout](https://github.com/SidAjmera/AppScout) and [SidAjmera/Musecoach](https://github.com/SidAjmera/Musecoach). Neither is the parent product. The original Musecoach site remains available for exporting older browser records. Both original READMEs describe the shared releases and distinguish them from standalone behavior.

## Run and verify

Use Node 24 and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, copy `.env.example` to `.env.local`, configure the public Supabase URL/key and the server-only BYOK secret, then run `pnpm run dev`. Local address: `http://127.0.0.1:3100`.

Run `pnpm run typecheck`, `pnpm run test`, `pnpm run build` and `pnpm run test:e2e`. Browser checks use installed Microsoft Edge and generated WAV files, without a physical microphone. Unit suites include both imported apps, actual SQL/RLS execution in embedded PostgreSQL, sync consent, stale revisions, conflict planning, deletion markers and failed-transfer source preservation. Sync/transfer transport tests use mocks; they are not live authenticated-account verification. See `RELEASE_STATUS.md` for executed checks and outstanding real-device/account checks.

## Supabase setup

The shared site reuses the original Singapore project, retaining existing Toolnest account IDs and catalog. A fresh database needs these SQL files in order; an existing database must only apply upgrades it does not already have:

1. `supabase/migrations/001_appscout.sql`: original Toolnest schema.
2. `supabase/workspace.sql`: shared account profile, private recording bucket and cloud reviews.
3. `supabase/release-two.sql`: optional sync choices, practice profiles, revision checks and deletion markers.

Every added table uses RLS. Cloud objects are private, owner-scoped and limited to 20 MB per audio file. Profile writes require profile-sync opt-in; metadata-sync RPCs require the corresponding sync choice and expected revision. All new functions use SECURITY INVOKER. Immutable audio uploads get unique object names and do not require Storage UPDATE permission.

The schema scripts are explicit one-time upgrades. Connected migration-history requests failed, so do not infer migration-history entries from the SQL files or blindly rerun them. The previously intentional `consume_ai_quota` SECURITY DEFINER function can still appear in the security advisor; Workspace adds no new SECURITY DEFINER functions.

The approved Vercel server secret is configured for Production and Preview. Supabase's Site URL is `https://sidajmera-workspace.vercel.app`, with its exact `/auth/callback` allowed alongside earlier callbacks. Local email-redirect tests need the exact `http://127.0.0.1:3100/auth/callback` allowlisted separately. Keep email confirmation enabled and custom SMTP configured; real email delivery still needs account verification.

## Consent, device storage and migration

Profile and review sync start off independently. Enabling them explicitly includes existing relevant device data. Turning them off stops future sync and does not delete existing cloud copies; app-data deletion removes those copies separately. A device audio copy remains local unless the user selects a cloud recording destination or a transfer action.

All browser storage and IndexedDB data are separated by account. Changing accounts stops the app views and reloads the document before establishing a new local owner. Guest sessions and saved audio are copied into an account only through the explicit import control, without uploading audio.

The older Musecoach website's storage cannot be read from the new origin. Export review backups there and restore them in Workspace Progress. Download original audio individually, then upload it explicitly into the new site. Review backups exclude audio, API keys and conversations.

## Export and deletion

Workspace JSON exports include account metadata, profiles, sync choices, cloud reviews and recording references. Original audio downloads are available individually from reviews. Musecoach Progress exports/restores review backups; audio is excluded.

App-specific deletion keeps the shared identity. Musecoach cloud deletion removes its audio and profile/review content, disables sync, and leaves minimal review IDs/revisions/deletion timestamps to prevent stale devices from resurrecting deleted reviews. On sync, clean metadata caches disappear; explicit device audio copies or unsynced edits can remain on their device, excluded from automatic re-upload.

Cloud files are removed through the Storage API. Full workspace identity deletion is explicitly queued for the operator after app-data/file cleanup and is not represented as immediately complete. Operators must revoke sessions, verify storage cleanup and finish pending Auth deletions. Device data on other browsers must be cleared there. Completed identity deletion cascades database records and deletion markers.

Toolnest AI keys remain encrypted in temporary account-bound HttpOnly cookies. Musecoach keys remain in tab memory by default, with an explicit unencrypted device-remembering option. Logout disconnects both. Audio is never sent to AI providers.

## Deployment

This is a separate Next.js Vercel project on the existing Hobby plan, serving one public origin. Use Node 24 and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, server-only `BYOK_SESSION_SECRET` and `ENABLE_EXPERIMENTAL_COREPACK=1`. No service-role key is required. API timeouts are declared in `vercel.json`. Hosting/storage quotas remain subject to the existing plans.
