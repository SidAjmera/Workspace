import { accountOwner, accountStorage } from "./account-scope";
import {
  allCloudReviews,
  cloudProfile,
  pushProfile,
  pushReview,
  syncChoices,
  assertOwner,
  type SyncChoices,
} from "./practice-cloud";
import { planReviewSync, stableJSON, type CloudReview } from "./sync-model";
import {
  readProfile,
  rawSessions,
  putRawSession,
  removeRawSession,
  applyCloudReview,
  storeSyncedProfile,
} from "@musecoach/lib/storage";
import { validatePracticeProfile } from "@musecoach/lib/history-backup";
export type SyncResult = {
  uploaded: number;
  downloaded: number;
  conflicts: string[];
  profileConflict: boolean;
  choices: SyncChoices;
};
export function profileMarker(): { revision: number; baseline: string | null } {
  try {
    return (
      JSON.parse(
        accountStorage.getItem("musecoach-profile-sync") || "null",
      ) || { revision: 0, baseline: null }
    );
  } catch {
    return { revision: 0, baseline: null };
  }
}
export function markProfile(profile: unknown, revision: number) {
  accountStorage.setItem(
    "musecoach-profile-sync",
    JSON.stringify({ revision, baseline: stableJSON(profile) }),
  );
}
const flights = new Map<string, Promise<SyncResult>>();
export function syncPractice(): Promise<SyncResult> {
  const owner = accountOwner();
  if (owner === "guest")
    return Promise.reject(Error("Sign in to sync practice."));
  const running = flights.get(owner);
  if (running) return running;
  const task = perform(owner).finally(() => flights.delete(owner));
  flights.set(owner, task);
  return task;
}
async function perform(owner: string): Promise<SyncResult> {
  const choices = await syncChoices(),
    result: SyncResult = {
      uploaded: 0,
      downloaded: 0,
      conflicts: [],
      profileConflict: false,
      choices,
    };
  assertOwner(owner);
  if (choices.profile_sync) {
    const local = readProfile(),
      remote = await cloudProfile(),
      marker = profileMarker();
    assertOwner(owner);
    if (remote) {
      const clean = validatePracticeProfile(remote.data),
        same = local && stableJSON(local) === stableJSON(clean);
      const dirty = local && stableJSON(local) !== marker.baseline;
      if (same) {
        markProfile(local, remote.revision);
      } else if (!local || (!dirty && marker.revision > 0)) {
        if (stableJSON(readProfile()) !== stableJSON(local))
          throw Error(
            "Device profile changed during sync. Your edit was kept; retry sync.",
          );
        storeSyncedProfile(clean);
        markProfile(clean, remote.revision);
        result.downloaded++;
      } else if (marker.revision === remote.revision && marker.revision > 0) {
        const saved = await pushProfile(
          validatePracticeProfile(local),
          marker.revision,
        );
        assertOwner(owner);
        markProfile(local, saved.revision);
        result.uploaded++;
      } else result.profileConflict = true;
    } else if (local) {
      if (marker.revision > 0) result.profileConflict = true;
      else {
        const saved = await pushProfile(validatePracticeProfile(local), 0);
        assertOwner(owner);
        markProfile(local, saved.revision);
        result.uploaded++;
      }
    }
  }
  if (choices.review_sync) {
    const local = await rawSessions(),
      remote = await allCloudReviews();
    assertOwner(owner);
    const byId = new Map(remote.map((row) => [row.id, row]));
    for (const record of local) {
      assertOwner(owner);
      if (record.syncExcluded) continue;
      const row = byId.get(record.id) || null,
        plan = planReviewSync(record, row);
      try {
        if (plan === "upload") {
          const saved = await pushReview(record, record.cloudRevision || 0);
          assertOwner(owner);
          await applyCloudReview(saved, record);
          result.uploaded++;
        } else if (plan === "download" || plan === "same") {
          if (row) {
            await applyCloudReview(row, record);
            if (plan === "download") result.downloaded++;
          }
        } else if (plan === "conflict") {
          await putRawSession({ ...record, syncConflict: true });
          result.conflicts.push(record.id);
        } else if (plan === "deleted") {
          if (record.audio || record.syncPending)
            await putRawSession({
              ...record,
              cloudRevision: undefined,
              cloudAudioSaved: false,
              syncExcluded: true,
              syncConflict: false,
              storage: "local",
              audioSaved: !!record.audio,
            });
          else await removeRawSession(record.id);
        }
      } catch (e) {
        throw Error(
          `${e instanceof Error ? e.message : "Sync failed."} Device takes are kept for retry.`,
        );
      }
    }
    const existing = new Set(local.map((row) => row.id));
    for (const row of remote) {
      assertOwner(owner);
      if (!row.deleted_at && !existing.has(row.id)) {
        await applyCloudReview(row);
        result.downloaded++;
      }
    }
  }
  assertOwner(owner);
  accountStorage.setItem("musecoach-last-sync", new Date().toISOString());
  accountStorage.removeItem("musecoach-sync-error");
  window.dispatchEvent(
    new CustomEvent("musecoach-sync-complete", { detail: result }),
  );
  return result;
}
export async function resolveProfile(choice: "cloud" | "device") {
  const owner = accountOwner(),
    settings = await syncChoices();
  if (!settings.profile_sync) throw Error("Enable profile sync first.");
  const remote = await cloudProfile();
  assertOwner(owner);
  if (choice === "cloud") {
    if (!remote) throw Error("No cloud profile is available.");
    const clean = validatePracticeProfile(remote.data);
    storeSyncedProfile(clean);
    markProfile(clean, remote.revision);
  } else {
    const local = readProfile();
    if (!local) throw Error("No device profile is available.");
    const saved = await pushProfile(
      validatePracticeProfile(local),
      remote?.revision || 0,
    );
    assertOwner(owner);
    markProfile(local, saved.revision);
  }
  window.dispatchEvent(new Event("musecoach-sync-complete"));
}
