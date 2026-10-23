import type { Session } from "@musecoach/lib/types";
export type CloudReview = {
  id: string;
  data: Session;
  audio_path: string | null;
  revision: number;
  deleted_at: string | null;
};
export function reviewPayload(s: Session) {
  return {
    id: s.id,
    date: s.date,
    title: s.title,
    context: s.context,
    analysis: s.analysis,
    ...(s.notes !== undefined ? { notes: s.notes } : {}),
    ...(s.restored ? { restored: true } : {}),
  };
}
export function stableJSON(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]]),
        )
      : item,
  );
}
export function sameReview(a: Session, b: Session) {
  return stableJSON(reviewPayload(a)) === stableJSON(reviewPayload(b));
}
export type SyncPlan = "upload" | "download" | "same" | "conflict" | "deleted";
export function planReviewSync(
  local: Session,
  remote: CloudReview | null,
): SyncPlan {
  if (remote?.deleted_at) return "deleted";
  if (!remote) return local.cloudRevision === undefined ? "upload" : "deleted";
  if (sameReview(local, remote.data)) return "same";
  if (local.cloudRevision === undefined) return "conflict";
  if (local.cloudRevision === remote.revision)
    return local.syncPending ? "upload" : "download";
  if (local.cloudRevision < remote.revision)
    return local.syncPending ? "conflict" : "download";
  return "conflict";
}
