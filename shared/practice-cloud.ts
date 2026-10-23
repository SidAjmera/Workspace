import { accountOwner } from "./account-scope";
import { cloudClient, AUDIO_BUCKET } from "./cloud";
import { reviewPayload, type CloudReview } from "./sync-model";
import type { Profile, Session } from "@musecoach/lib/types";
export type SyncChoices = { profile_sync: boolean; review_sync: boolean };
export const noSync: SyncChoices = { profile_sync: false, review_sync: false };
export function assertOwner(owner: string) {
  if (accountOwner() !== owner)
    throw Error("Your account changed. Please retry.");
}
export function check(error: { message: string } | null) {
  if (error) throw Error("Cloud sync: " + error.message);
}
export async function syncChoices(): Promise<SyncChoices> {
  const { db, owner } = await cloudClient();
  const { data, error } = await db
    .from("musecoach_sync_settings")
    .select("profile_sync,review_sync")
    .eq("user_id", owner)
    .maybeSingle();
  check(error);
  assertOwner(owner);
  return data || noSync;
}
export async function saveSyncChoices(value: SyncChoices) {
  const { db, owner } = await cloudClient();
  const { error } = await db
    .from("musecoach_sync_settings")
    .upsert({
      user_id: owner,
      profile_sync: !!value.profile_sync,
      review_sync: !!value.review_sync,
    });
  check(error);
  assertOwner(owner);
}
export async function allCloudReviews(): Promise<CloudReview[]> {
  const { db, owner } = await cloudClient();
  const rows: CloudReview[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await db
      .from("musecoach_sessions")
      .select("id,data,audio_path,revision,deleted_at")
      .eq("user_id", owner)
      .order("id")
      .range(offset, offset + 99);
    check(error);
    rows.push(...(data || []));
    if (!data || data.length < 100) break;
  }
  assertOwner(owner);
  return rows;
}
export async function cloudReview(id: string): Promise<CloudReview | null> {
  const { db, owner } = await cloudClient();
  const { data, error } = await db
    .from("musecoach_sessions")
    .select("id,data,audio_path,revision,deleted_at")
    .eq("user_id", owner)
    .eq("id", id)
    .maybeSingle();
  check(error);
  assertOwner(owner);
  return data;
}
/** Only an explicit transfer can restore a deleted review; background sync never does. */
export async function restoreCloudReview(
  row: CloudReview,
  session: Session,
): Promise<CloudReview> {
  const { db, owner } = await cloudClient();
  const { data, error } = await db
    .from("musecoach_sessions")
    .update({
      data: reviewPayload(session),
      deleted_at: null,
      audio_path: null,
    })
    .eq("user_id", owner)
    .eq("id", row.id)
    .eq("revision", row.revision)
    .not("deleted_at", "is", null)
    .select("id,data,audio_path,revision,deleted_at")
    .maybeSingle();
  check(error);
  assertOwner(owner);
  if (!data)
    throw Error(
      "Cloud review changed. Device data was kept; refresh and retry.",
    );
  return data;
}
export async function pushReview(
  session: Session,
  revision: number,
): Promise<CloudReview> {
  const { db, owner } = await cloudClient();
  const { data, error } = await db.rpc("sync_musecoach_review", {
    review_id: session.id,
    payload: reviewPayload(session),
    expected_revision: revision,
  });
  check(error);
  assertOwner(owner);
  return data;
}
export type CloudProfile = { data: Profile; revision: number };
export async function cloudProfile(): Promise<CloudProfile | null> {
  const { db, owner } = await cloudClient();
  const { data, error } = await db
    .from("musecoach_profiles")
    .select("data,revision")
    .eq("user_id", owner)
    .maybeSingle();
  check(error);
  assertOwner(owner);
  return data;
}
export async function pushProfile(
  profile: Profile,
  revision: number,
): Promise<CloudProfile> {
  const { db, owner } = await cloudClient();
  const { data, error } = await db.rpc("sync_musecoach_profile", {
    payload: profile,
    expected_revision: revision,
  });
  check(error);
  assertOwner(owner);
  return data;
}
/** Attach a new immutable audio file only if the cloud review has not changed. */
export async function attachCloudAudio(
  row: CloudReview,
  audio: Blob,
): Promise<CloudReview> {
  const { db, owner } = await cloudClient();
  if (row.deleted_at) throw Error("This cloud review was deleted.");
  if (row.audio_path) return row;
  if (!audio.type.startsWith("audio/") || audio.size > 20 * 1024 * 1024)
    throw Error("Cloud audio must be an audio file of at most 20 MB.");
  const path = `${owner}/${row.id}-${crypto.randomUUID()}`;
  const uploaded = await db.storage
    .from(AUDIO_BUCKET)
    .upload(path, audio, {
      contentType: audio.type.split(";")[0],
      upsert: false,
    });
  check(uploaded.error);
  try {
    assertOwner(owner);
    const { data, error } = await db
      .from("musecoach_sessions")
      .update({ audio_path: path })
      .eq("user_id", owner)
      .eq("id", row.id)
      .eq("revision", row.revision)
      .is("deleted_at", null)
      .select("id,data,audio_path,revision,deleted_at")
      .maybeSingle();
    check(error);
    if (!data)
      throw Error(
        "The cloud take changed on another device. No device data was removed. Refresh and retry.",
      );
    assertOwner(owner);
    return data;
  } catch (e) {
    await db.storage.from(AUDIO_BUCKET).remove([path]);
    throw e;
  }
}
