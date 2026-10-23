"use client";
import { useEffect, useState } from "react";
import { useAccount } from "./auth";
import { accountStorage } from "./account-scope";
import {
  syncPractice,
  resolveProfile,
  profileMarker,
  type SyncResult,
} from "./practice-sync";
import { rawSessions, readProfile } from "@musecoach/lib/storage";
import { stableJSON } from "./sync-model";
import {
  noSync,
  syncChoices,
  saveSyncChoices,
  type SyncChoices,
} from "./practice-cloud";
export function PracticeSyncManager() {
  const { user } = useAccount();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    let live = true,
      timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      if (!live || !navigator.onLine) return;
      void syncPractice()
        .then(async (result) => {
          if (!live) return;
          setError("");
          let pending = false;
          if (result.choices.review_sync)
            pending = (await rawSessions()).some(
              (take) =>
                take.syncPending && !take.syncConflict && !take.syncExcluded,
            );
          if (
            result.choices.profile_sync &&
            !result.profileConflict &&
            readProfile()
          )
            pending =
              pending || stableJSON(readProfile()) !== profileMarker().baseline;
          if (live && pending) schedule();
        })
        .catch((error) => {
          if (live) {
            const text =
              error instanceof Error
                ? error.message
                : "Sync failed. Device data is kept.";
            setError(text);
            accountStorage.setItem("musecoach-sync-error", text);
            window.dispatchEvent(new Event("musecoach-sync-status"));
          }
        });
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(run, 800);
    };
    window.addEventListener("musecoach-local-change", schedule);
    window.addEventListener("online", run);
    window.addEventListener("focus", run);
    run();
    return () => {
      live = false;
      clearTimeout(timer);
      window.removeEventListener("musecoach-local-change", schedule);
      window.removeEventListener("online", run);
      window.removeEventListener("focus", run);
    };
  }, [user?.id]);
  return error ? (
    <aside className="ws-sync-notice" role="status">
      <p>{error}</p>
      <a href="/settings">Manage sync</a>
      <button onClick={() => setError("")} aria-label="Dismiss sync error">
        Dismiss
      </button>
    </aside>
  ) : null;
}
export function PracticeSyncSettings() {
  const { user } = useAccount();
  const [choices, setChoices] = useState<SyncChoices>(noSync),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [result, setResult] = useState<SyncResult | null>(null);
  useEffect(() => {
    if (!user) return;
    let live = true;
    void syncChoices()
      .then((value) => {
        if (live) setChoices(value);
      })
      .catch((e) => {
        if (live) setMessage(e.message);
      });
    const done = (event: Event) => {
      if ((event as CustomEvent<SyncResult>).detail)
        setResult((event as CustomEvent<SyncResult>).detail);
    };
    window.addEventListener("musecoach-sync-complete", done);
    return () => {
      live = false;
      window.removeEventListener("musecoach-sync-complete", done);
    };
  }, [user?.id]);
  if (!user) return null;
  async function work(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Sync failed. Device data is kept.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function run() {
    const value = await syncPractice();
    setChoices(value.choices);
    setResult(value);
    setMessage(
      `Sync finished: ${value.uploaded} uploaded, ${value.downloaded} downloaded. ${value.conflicts.length} review conflicts left unchanged.${value.profileConflict ? " Choose which profile to keep." : ""}`,
    );
  }
  return (
    <section>
      <h2>Musecoach sync</h2>
      <p>
        Both choices start off. Profile sync includes your coach, goals, range
        and favourites. Review sync includes existing and future device
        measurements, review titles and notes. Audio moves only when you
        explicitly choose cloud recording or use transfer controls.
      </p>
      <label>
        <input
          type="checkbox"
          checked={choices.profile_sync}
          onChange={(e) =>
            setChoices({ ...choices, profile_sync: e.target.checked })
          }
          disabled={busy}
        />{" "}
        Sync my Musecoach profile
      </label>
      <label>
        <input
          type="checkbox"
          checked={choices.review_sync}
          onChange={(e) =>
            setChoices({ ...choices, review_sync: e.target.checked })
          }
          disabled={busy}
        />{" "}
        Sync my practice reviews
      </label>
      <button
        disabled={busy}
        onClick={() =>
          void work(async () => {
            await saveSyncChoices(choices);
            await run();
          })
        }
      >
        Save sync choices
      </button>
      <button disabled={busy} onClick={() => void work(run)}>
        Sync now
      </button>
      <p>
        Enabled sync runs when you open the workspace, return to it, reconnect,
        or save a change. Offline device edits stay available for retry. Turning
        sync off stops future sync; existing cloud copies remain until you
        delete them.
      </p>
      {message && (
        <p role="status" className="ws-feedback">
          {message}
        </p>
      )}
      {result?.profileConflict && (
        <div>
          <p>Your device and cloud profiles differ. Neither was overwritten.</p>
          <button
            disabled={busy}
            onClick={() =>
              void work(async () => {
                await resolveProfile("cloud");
                await run();
              })
            }
          >
            Use cloud profile
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void work(async () => {
                await resolveProfile("device");
                await run();
              })
            }
          >
            Upload device profile
          </button>
        </div>
      )}
      {!!result?.conflicts.length && (
        <p>
          Open the affected reviews in Musecoach Progress to choose the cloud
          review or keep the device version as a separate take.
        </p>
      )}
    </section>
  );
}
