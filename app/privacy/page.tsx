export default function Privacy() {
  return (
    <main className="ws-settings">
      <a href="/">← Workspace home</a>
      <h1>Your workspace data</h1>
      <p>
        Updated 23 October 2026. Toolnest and Musecoach share one Supabase
        account. Email, authentication, workspace appearance and the account
        identifier support both apps.
      </p>
      <section>
        <h2>Toolnest</h2>
        <p>
          Saved apps belong to your account. Saved personalization and search
          history require separate optional consent. They can be disabled in
          Toolnest’s Preferences & privacy. There is no active analytics
          collector.
        </p>
        <a href="/toolnest/privacy">Toolnest’s detailed data policy</a>
      </section>
      <section>
        <h2>Musecoach sync choices</h2>
        <p>
          Profile sync and review sync start off and are controlled
          independently in Account & settings. Profile sync stores your singing
          profile, coach choices, goals, comfortable range and favourites.
          Review sync stores measured reviews, pitch graphs, session names and
          notes, including takes whose audio was never saved.
        </p>
        <p>
          Enabled sync runs when you open or return to the workspace, reconnect,
          or save a change. Offline device edits stay available for retry. A
          conflicting device/cloud edit is kept for you to resolve instead of
          being silently overwritten. Turning sync off stops future
          synchronization; existing cloud copies remain until you delete them.
        </p>
        <p>
          API keys, coach conversations, designed-exercise drafts and solo-song
          guide audio do not join profile or review sync.
        </p>
      </section>
      <section>
        <h2>Recording storage and transfers</h2>
        <p>
          Pitch analysis runs on your device. Each take offers measurements
          only, device audio, a private cloud review without audio, or private
          cloud audio with its review. Review sync never uploads device audio
          automatically. Cloud records and recordings use the existing Supabase
          project in Singapore and are restricted to your authenticated account.
        </p>
        <p>
          Saved reviews include explicit Copy and Move controls for device/cloud
          storage. Copy keeps both locations. Move saves the destination before
          removing the source audio. Moving a take from cloud to device excludes
          it from automatic re-upload. Cloud audio has a 20 MB per-file limit.
        </p>
        <p>
          Device data is separated by account. Guest sessions are copied into an
          account only when you choose Import guest sessions. Original Musecoach
          browser records at its older website address require explicit backup
          import or audio upload because browser storage is isolated by website
          origin.
        </p>
      </section>
      <section>
        <h2>AI connections</h2>
        <p>
          Each app uses your own provider key. Toolnest keeps its connection in
          an encrypted, temporary HttpOnly cookie bound to your account.
          Musecoach keeps a key in tab memory by default; its optional Remember
          control saves the key unencrypted in this browser’s account-scoped
          storage. Workspace sign-out clears the active Musecoach key and
          disconnects Toolnest AI.
        </p>
        <p>
          AI features send requested text context to your selected provider.
          They do not send recordings to AI providers. Provider policies apply
          to submitted text.
        </p>
      </section>
      <section>
        <h2>Export and deletion</h2>
        <p>
          Account & settings exports cloud records, sync choices and profiles.
          Musecoach Progress exports or restores review backups without audio.
          Download original recordings individually from their reviews.
        </p>
        <p>
          Delete an app’s data separately or request deletion of the entire
          workspace account. Musecoach cloud deletion removes audio, profile
          content and review content and disables sync. Minimal review
          identifiers, revision numbers and deletion timestamps remain as
          deletion markers to prevent stale devices from restoring deleted
          reviews. Unmodified metadata caches are removed on sync; an explicit
          device audio copy or an unsynced edit can remain on its device,
          excluded from automatic re-upload.
        </p>
        <p>
          Full workspace identity deletion is queued for operator processing
          after app and cloud-file cleanup. Queued deletion is not completed
          account deletion. Device data on other browsers must be cleared there;
          completed identity deletion also removes its database deletion
          markers.
        </p>
      </section>
      <a className="ws-action" href="/settings">
        Account & settings
      </a>
    </main>
  );
}
