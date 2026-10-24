"use client";
import { useEffect, useState } from "react";
import {
  rawSessions,
  readProfile,
  type StoredTake,
} from "@musecoach/lib/storage";
import { historyBackupJSON } from "@musecoach/lib/history-backup";
import { defaultProfile } from "@musecoach/lib/types";
import { AppDestinationLink, useSite } from "@/site-context";
import { workspaceOrigin } from "@/site-routing";
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function DeviceExport() {
  const site = useSite(),
    [takes, setTakes] = useState<StoredTake[]>([]),
    [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    rawSessions()
      .then((value) => {
        if (live) setTakes(value);
      })
      .catch((error) => {
        if (live) setMessage(error.message);
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <main className="ws-settings">
      <a href={workspaceOrigin(site.origin)}>← Workspace home</a>
      <h1>Recover previous device practice</h1>
      <p>
        Device-only data stays with the address where you saved it. Open this
        page at the old address, in the same browser, and sign in to the same
        account if applicable. Cloud data is already available through that
        account.
      </p>
      <section>
        <h2>Your device backup</h2>
        <p>
          {takes.length} saved device reviews are available here. The review
          backup includes your profile and notes, without audio or API keys.
          Download saved audio separately below.
        </p>
        <button
          onClick={() => {
            try {
              download(
                new Blob(
                  [historyBackupJSON(readProfile() || defaultProfile, takes)],
                  { type: "application/json" },
                ),
                "musecoach-device-backup.json",
              );
              setMessage("Backup prepared. Restore it in MuseCoach Progress.");
            } catch (error) {
              setMessage((error as Error).message);
            }
          }}
        >
          Download review backup
        </button>
        <AppDestinationLink
          className="ws-action"
          app="musecoach"
          path="/progress"
        >
          Open MuseCoach Progress ↗
        </AppDestinationLink>
      </section>
      <section>
        <h2>Original device recordings</h2>
        {takes.filter((take) => take.audio).length === 0 ? (
          <p>No audio is saved in this device’s current account scope.</p>
        ) : (
          takes
            .filter((take) => take.audio)
            .map((take) => (
              <p key={take.id}>
                <button
                  onClick={() => {
                    const audio = take.audio!;
                    const extension = audio.type.includes("wav")
                      ? "wav"
                      : audio.type.includes("mpeg")
                        ? "mp3"
                        : audio.type.includes("mp4")
                          ? "m4a"
                          : audio.type.includes("ogg")
                            ? "ogg"
                            : "webm";
                    download(
                      audio,
                      "musecoach-" +
                        take.id.replace(/[^a-zA-Z0-9_.-]/g, "_") +
                        "." +
                        extension,
                    );
                  }}
                >
                  Download {take.title || "take"}
                </button>
              </p>
            ))
        )}
      </section>
      {message && (
        <p role="status" className="ws-feedback">
          {message}
        </p>
      )}
    </main>
  );
}
