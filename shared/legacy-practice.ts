import { accountOwner, accountStorage } from "./account-scope";
import { assertOwner } from "./practice-cloud";
import {
  rawSession,
  putRawSession,
  readProfile,
  saveProfile,
  signalLocalChange,
} from "@musecoach/lib/storage";
import {
  validatePracticeProfile,
  validatePracticeSession,
} from "@musecoach/lib/history-backup";
import type { Profile } from "@musecoach/lib/types";
export async function previousPractice(): Promise<{
  records: unknown[];
  profile: Profile | null;
}> {
  let profile: Profile | null = null;
  try {
    const raw = window.localStorage.getItem("musecoach-profile");
    if (raw) profile = validatePracticeProfile(JSON.parse(raw));
  } catch {
    /* An invalid old profile does not block review recovery. */
  }
  const records = await new Promise<unknown[]>((resolve, reject) => {
    const request = indexedDB.open("musecoach-v1");
    let absent = false;
    request.onupgradeneeded = () => {
      absent = true;
      request.transaction?.abort();
    };
    request.onerror = () =>
      absent
        ? resolve([])
        : reject(
            Error(
              "Could not read earlier device practice. Close other MuseCoach tabs and retry.",
            ),
          );
    request.onblocked = () =>
      reject(Error("Close other MuseCoach tabs before importing."));
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("sessions")) {
        db.close();
        resolve([]);
        return;
      }
      const tx = db.transaction("sessions", "readonly"),
        read = tx.objectStore("sessions").getAll();
      tx.oncomplete = () => {
        db.close();
        resolve(read.result);
      };
      tx.onerror = () => {
        db.close();
        reject(Error("Could not read earlier device reviews."));
      };
    };
  });
  return { records, profile };
}
export async function importPreviousPractice() {
  const owner = accountOwner(),
    source = await previousPractice();
  assertOwner(owner);
  let added = 0,
    skipped = 0,
    invalid = 0,
    profileRestored = false;
  for (const raw of source.records) {
    assertOwner(owner);
    let session;
    try {
      session = validatePracticeSession(raw);
    } catch {
      invalid++;
      continue;
    }
    if (await rawSession(session.id)) {
      skipped++;
      continue;
    }
    assertOwner(owner);
    const original = raw as { audio?: unknown };
    const audio = original.audio instanceof Blob ? original.audio : undefined;
    await putRawSession({
      ...session,
      storage: "local",
      audioSaved: !!audio,
      audio,
      cloudAudioSaved: false,
      syncExcluded: true,
      syncPending: false,
    });
    added++;
  }
  assertOwner(owner);
  if (source.profile && !readProfile()) {
    saveProfile(source.profile);
    profileRestored = true;
  }
  accountStorage.setItem("previous-practice-imported", "1");
  signalLocalChange();
  return { added, skipped, invalid, profileRestored };
}
