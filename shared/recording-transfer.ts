import { accountOwner } from "./account-scope";
import { saveCloudSession, cloudAudio, deleteCloudSession } from "./cloud";
import {
  cloudReview,
  attachCloudAudio,
  restoreCloudReview,
  assertOwner,
} from "./practice-cloud";
import { sameReview } from "./sync-model";
import {
  rawSession,
  putRawSession,
  removeRawSession,
  applyCloudReview,
  signalLocalChange,
} from "@musecoach/lib/storage";
export async function sendTakeToCloud(id: string, move = false) {
  const owner = accountOwner();
  if (owner === "guest") throw Error("Sign in before transferring recordings.");
  const local = await rawSession(id);
  if (!local) throw Error("No device take is available to transfer.");
  let remote = await cloudReview(id);
  assertOwner(owner);
  if (remote?.deleted_at) remote = await restoreCloudReview(remote, local);
  if (remote && !sameReview(local, remote.data)) {
    await putRawSession({ ...local, syncConflict: true });
    window.dispatchEvent(new Event("musecoach-sync-complete"));
    throw Error(
      "Device and cloud reviews differ. Resolve the review conflict before transferring.",
    );
  }
  if (!remote) {
    await saveCloudSession(local, local.audio);
    remote = await cloudReview(id);
  } else if (local.audio && !remote.audio_path)
    remote = await attachCloudAudio(remote, local.audio);
  assertOwner(owner);
  if (!remote || remote.deleted_at || (local.audio && !remote.audio_path))
    throw Error("Could not verify the cloud copy. Device data was kept.");
  // Do not remove a take that the user edited while upload was running.
  const current = await rawSession(id);
  assertOwner(owner);
  if (!current || !sameReview(current, local))
    throw Error(
      "The device take changed during transfer. Both copies are kept; sync before retrying.",
    );
  await applyCloudReview(remote, local);
  if (move) {
    const copy = await rawSession(id);
    assertOwner(owner);
    if (copy && !sameReview(copy, local))
      throw Error("Device take changed during transfer. Both copies are kept.");
    if (copy)
      await putRawSession({
        ...copy,
        audio: undefined,
        storage: remote.audio_path ? "cloud" : "local",
        audioSaved: !!remote.audio_path,
        cloudAudioSaved: !!remote.audio_path,
      });
  }
  window.dispatchEvent(new Event("musecoach-sync-complete"));
}
export async function bringTakeToDevice(id: string, move = false) {
  const owner = accountOwner();
  if (owner === "guest") throw Error("Sign in before transferring recordings.");
  const remote = await cloudReview(id);
  if (!remote || remote.deleted_at)
    throw Error("The cloud take is no longer available.");
  const local = await rawSession(id);
  if (local && !sameReview(local, remote.data)) {
    await putRawSession({ ...local, syncConflict: true });
    window.dispatchEvent(new Event("musecoach-sync-complete"));
    throw Error(
      "Device and cloud reviews differ. Resolve the conflict before transferring.",
    );
  }
  const audio = remote.audio_path ? await cloudAudio(id) : local?.audio;
  assertOwner(owner);
  if (remote.audio_path && !audio)
    throw Error(
      "Cloud audio could not be downloaded. The cloud copy was kept.",
    );
  const latest = await cloudReview(id);
  assertOwner(owner);
  if (!latest || latest.deleted_at || latest.revision !== remote.revision)
    throw Error("Cloud take changed during download. The cloud copy was kept.");
  const current = await rawSession(id);
  if (current && local && !sameReview(current, local))
    throw Error("Device take changed during download. Both versions are kept.");
  await putRawSession({
    ...remote.data,
    id,
    audio,
    storage: "local",
    audioSaved: !!audio,
    cloudAudioSaved: !!remote.audio_path,
    cloudRevision: remote.revision,
    syncPending: false,
    syncConflict: false,
    syncExcluded: false,
  });
  if (move) {
    try {
      await deleteCloudSession(id, false, remote.revision);
    } catch (e) {
      throw Error(
        `Device copy saved, but cloud cleanup did not finish. ${e instanceof Error ? e.message : "Retry the move."}`,
      );
    }
    assertOwner(owner);
    const saved = await rawSession(id);
    if (saved)
      await putRawSession({
        ...saved,
        cloudRevision: undefined,
        cloudAudioSaved: false,
        syncExcluded: true,
        storage: "local",
        audioSaved: !!saved.audio,
      });
  }
  window.dispatchEvent(new Event("musecoach-sync-complete"));
}
export async function resolveReview(id: string, choice: "cloud" | "device") {
  const owner = accountOwner(),
    local = await rawSession(id),
    remote = await cloudReview(id);
  assertOwner(owner);
  if (choice === "cloud") {
    if (!remote || remote.deleted_at)
      throw Error("No cloud version is available.");
    await applyCloudReview(remote);
    const current = await rawSession(id);
    if (current)
      await putRawSession({
        ...remote.data,
        id,
        audio: current.audio,
        storage: current.audio
          ? "local"
          : remote.audio_path
            ? "cloud"
            : "local",
        audioSaved: !!current.audio || !!remote.audio_path,
        cloudAudioSaved: !!remote.audio_path,
        cloudRevision: remote.revision,
        syncPending: false,
        syncConflict: false,
        syncExcluded: false,
      });
  } else {
    if (!local) throw Error("No device version is available.");
    const clone = {
      ...local,
      id: crypto.randomUUID(),
      title: (local.title + " · device copy").slice(0, 80),
      cloudRevision: undefined,
      cloudAudioSaved: false,
      syncPending: true,
      syncConflict: false,
      syncExcluded: false,
      storage: "local" as const,
      audioSaved: !!local.audio,
    };
    await putRawSession(clone);
    assertOwner(owner);
    await removeRawSession(id);
    signalLocalChange();
  }
  window.dispatchEvent(new Event("musecoach-sync-complete"));
}
