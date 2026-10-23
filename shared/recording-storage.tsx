"use client";
import { useEffect, useState } from "react";
import { useAccount } from "./auth";
import { rawSession } from "@musecoach/lib/storage";
import type { Session } from "@musecoach/lib/types";
import {
  sendTakeToCloud,
  bringTakeToDevice,
  resolveReview,
} from "./recording-transfer";
export function RecordingStorage({
  session,
  onChange,
}: {
  session: Session;
  onChange: () => Promise<void>;
}) {
  const { user } = useAccount(),
    [device, setDevice] = useState(false),
    [deviceAudio, setDeviceAudio] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    let live = true;
    void rawSession(session.id).then((value) => {
      if (live) {
        setDevice(!!value);
        setDeviceAudio(!!value?.audio);
      }
    });
    return () => {
      live = false;
    };
  }, [session]);
  async function work(fn: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      await onChange();
      setMessage(success);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Transfer failed. Source data is kept.",
      );
      try {
        await onChange();
      } catch {
        /* Keep the original operation's error visible. */
      }
    } finally {
      setBusy(false);
    }
  }
  const cloud = !!session.cloudRevision,
    cloudAudio =
      !!session.cloudAudioSaved ||
      (session.storage === "cloud" && session.audioSaved);
  return (
    <section className="panel recording-storage">
      <span className="eyebrow">YOUR STORAGE CHOICES</span>
      <h3>Keep this take where you want it</h3>
      <p className="small muted">
        {deviceAudio ? "Device audio saved. " : ""}
        {cloudAudio ? "Private cloud audio saved. " : ""}
        {!deviceAudio && !cloudAudio ? "No saved audio. " : ""}
        {cloud
          ? "Review is in your cloud account."
          : "Review is on this device."}
        {session.syncPending ? " Device review changes are pending sync." : ""}
      </p>
      {user ? (
        <>
          <div className="storage-actions">
            <button
              className="button secondary"
              disabled={busy || !device}
              onClick={() =>
                void work(
                  () => sendTakeToCloud(session.id),
                  "Cloud copy saved. Device data kept.",
                )
              }
            >
              Copy to cloud
            </button>
            <button
              className="button secondary"
              disabled={busy || !device}
              onClick={() =>
                void work(
                  () => sendTakeToCloud(session.id, true),
                  "Moved to cloud. Device audio removed only after the cloud copy was saved.",
                )
              }
            >
              Move to cloud
            </button>
            <button
              className="button secondary"
              disabled={busy || !cloud}
              onClick={() =>
                void work(
                  () => bringTakeToDevice(session.id),
                  "Device copy saved. Cloud copy kept.",
                )
              }
            >
              Copy to device
            </button>
            <button
              className="button secondary"
              disabled={busy || !cloud}
              onClick={() =>
                void work(
                  () => bringTakeToDevice(session.id, true),
                  "Moved to device. Cloud copy removed after the device copy was saved. This take is excluded from automatic re-upload.",
                )
              }
            >
              Move to device
            </button>
          </div>
          <p className="small muted">
            Copy keeps both locations. Move saves the destination before
            removing the source audio. Cloud uploads use your private account
            storage and have a 20 MB limit.
          </p>
          {session.syncConflict && (
            <div>
              <p>
                Your device and cloud reviews differ. Neither has been
                overwritten.
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void work(
                    () => resolveReview(session.id, "cloud"),
                    "Cloud review selected. Device audio kept.",
                  )
                }
              >
                Use cloud review
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void work(
                    () => resolveReview(session.id, "device"),
                    "Device review kept as a separate take.",
                  )
                }
              >
                Keep device review as a new take
              </button>
            </div>
          )}
        </>
      ) : (
        <a href="/settings">Sign in to copy or move this take to the cloud.</a>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
