"use client";
import { useEffect, useState } from "react";
import { useSite } from "./site-context";
import { accountStorage } from "./account-scope";
import { previousPractice, importPreviousPractice } from "./legacy-practice";
export function PreviousPracticeImport({
  always = false,
}: {
  always?: boolean;
}) {
  const site = useSite();
  const [available, setAvailable] = useState(false),
    [dismissed, setDismissed] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    if (site.app !== "musecoach") return;
    if (!always && accountStorage.getItem("previous-practice-imported")) return;
    previousPractice()
      .then((value) => {
        if (live) setAvailable(value.records.length > 0 || !!value.profile);
      })
      .catch((error) => {
        if (live) setMessage(error.message);
      });
    return () => {
      live = false;
    };
  }, [site.app, always]);
  if (site.app !== "musecoach" || dismissed || (!available && !message))
    return null;
  return (
    <aside
      className={
        always
          ? "ws-previous-practice"
          : "ws-previous-practice ws-previous-floating"
      }
      aria-label="Earlier device practice"
    >
      <button
        className="ws-previous-dismiss"
        aria-label="Dismiss earlier practice notice"
        onClick={() => setDismissed(true)}
      >
        ×
      </button>
      <h2>Your earlier practice is still here.</h2>
      <p>
        Copy reviews and recordings from the previous MuseCoach site into this
        device’s current profile. Existing takes and originals are kept.
        Imported reviews stay out of automatic sync; recordings move to the
        cloud only when you choose. Your profile sync choice still applies.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await importPreviousPractice();
            setMessage(
              "Copied " +
                result.added +
                " takes; kept " +
                result.skipped +
                " existing takes; skipped " +
                result.invalid +
                " invalid records." +
                (result.profileRestored
                  ? " Profile copied too."
                  : " Current profile kept."),
            );
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Copying…" : "Import earlier device practice"}
      </button>
      {message && <p role="status">{message}</p>}
    </aside>
  );
}
