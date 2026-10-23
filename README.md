# Workspace

One account for **Toolnest** and **Musecoach**, maintained as equal sibling modules. Neither app is the parent product.

## Structure

- `/`: neutral workspace home and app switcher.
- `/toolnest`: software discovery, catalog, comparisons and account bookmarks.
- `/musecoach`: singing practice, analysis, exercises and recording reviews.
- `/settings`: shared Supabase sign-in, account identity, appearance, export and scoped deletion.
- `/privacy`: implemented data flows, including optional private cloud audio.
- `modules/toolnest` and `modules/musecoach`: imported app features, with separate aliases, scoped CSS and API routes.
- `shared`: identity, navigation, account-scoped browser storage and cloud recording operations.

The original projects are [SidAjmera/AppScout](https://github.com/SidAjmera/AppScout) and [SidAjmera/Musecoach](https://github.com/SidAjmera/Musecoach). This workspace preserves their catalog and singing features, rather than making one application depend on the other.

## Local development

Use Node 24 and pnpm 11.25.0. Run `pnpm install --frozen-lockfile`, copy `.env.example` to `.env.local`, configure Supabase public URL/key and the server-only BYOK secret, then run `pnpm dev`. The workspace opens at `http://127.0.0.1:3100`.

Run `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:e2e`. Browser checks use installed Microsoft Edge and generated WAV audio, without a physical microphone. Tests include both imported unit suites, actual SQL/RLS execution in embedded PostgreSQL, account-scoped storage, cloud-upload rollback and desktop/mobile integration flows. Cloud operation unit tests mock the storage transport; they are not a live authenticated-upload test.

## Supabase

Reuse the existing Singapore Supabase project so existing Toolnest accounts retain their IDs. The original schema is `supabase/migrations/001_appscout.sql`; an existing installation already has it and must not run it again. `supabase/workspace.sql` is the additive workspace schema, with:

- `workspace_profiles`: shared display name and appearance.
- `musecoach_sessions`: cloud reviews and private audio references.
- `musecoach-recordings`: private audio bucket, 20 MB per file and audio MIME allowlist.
- RLS restricting every new record and audio object to its owner.
- `clear_workspace_app`: app-specific data deletion without deleting the shared identity.

The additive SQL was applied to the existing project through the connected SQL tool after embedded PostgreSQL verification. The migration-history tool rejected its request and the CLI download timed out, so this upgrade is preserved as an explicit SQL file rather than claiming a migration-history entry that was not created.

Add the exact deployed `/auth/callback` URL and `http://127.0.0.1:3100/auth/callback` to Supabase Auth redirect allowlists. Keep email confirmation enabled and configure custom SMTP. This release does not verify email delivery by bypassing confirmation or marking a test email confirmed.

## Storage and account boundaries

Musecoach analyses audio locally. Each take offers measurements only, audio on this device, or private cloud audio. Cloud takes include their measurements and appear across devices for that account. Cloud files use authenticated downloads, never public URLs. Upload or quota failures are surfaced, and the take remains available for retry; the app does not silently switch to another storage destination.

Device data, profiles, conversations, generated exercises, song guides and optionally remembered Musecoach keys are namespaced by account. IndexedDB databases are namespaced too. Changing accounts stops app views and reloads the document before establishing a different local-data owner. Guest practice is never silently claimed. Shared settings can explicitly copy guest sessions and saved audio into the current account’s device history without uploading them.

The original Musecoach origin’s browser storage cannot be read from the new origin. Keep the original site available for downloading review backups and original audio. Restore review backups in the new Musecoach Progress screen; re-upload audio separately. Existing Toolnest cloud bookmarks remain accessible through the unchanged account ID.

Workspace export includes account metadata and cloud records, with audio references but no embedded binary audio. Local review backups are available from Musecoach Progress, and original audio can be downloaded per review.

Delete Toolnest data, Musecoach data, or request full workspace account deletion separately. Cloud files are removed through the Storage API before database cleanup. Full identity deletion is explicitly queued for the operator after cleanup; it is not represented as immediately complete. Device data on other browsers must be deleted there. Operators processing account deletion must revoke sessions and finish the pending Auth deletion after confirming storage cleanup.

Toolnest AI credentials remain encrypted in an account-bound, temporary HttpOnly cookie. Musecoach credentials remain in tab memory by default, with an explicit unencrypted device-remembering option. Workspace logout disconnects both. Audio is not sent to AI providers.

## Deployment

Deploy this repository as its own Next.js Vercel project on the existing Hobby plan. It uses one public origin for all paths. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `BYOK_SESSION_SECRET`, and `ENABLE_EXPERIMENTAL_COREPACK=1`; select Node 24. No service-role key is required for this release. App-specific API timeouts are declared in `vercel.json`.

Do not redirect away from the original Musecoach storage origin until users can export their device data. Cloud storage and hosting quotas remain subject to the existing provider plans. The prior intentionally privileged per-user `consume_ai_quota` function is flagged by Supabase’s security advisor; the workspace adds no SECURITY DEFINER functions.
