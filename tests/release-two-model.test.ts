import { it, expect } from "vitest";
import {
  planReviewSync,
  sameReview,
  reviewPayload,
  type CloudReview,
} from "../shared/sync-model";
import type { Session } from "../modules/musecoach/lib/types";
const take = {
  id: "take1",
  date: "2026-10-23T00:00:00.000Z",
  title: "Practice",
  context: "free",
  analysis: { version: "fixture", score: 80 },
  audioSaved: true,
  storage: "local",
} as Session;
const cloud = (data: Session = take, revision = 1): CloudReview => ({
  id: take.id,
  data,
  audio_path: null,
  revision,
  deleted_at: null,
});
it("compares JSONB reviews independently of property order and storage location", () => {
  const reordered = {
    ...take,
    analysis: { score: 80, version: "fixture" },
    storage: "cloud",
    audioSaved: false,
  } as Session;
  expect(sameReview(take, reordered)).toBe(true);
});
it("uploads a new review without including audio or local sync fields", () => {
  const withAudio = {
    ...take,
    audio: new Blob(["x"]),
    syncPending: true,
    cloudRevision: 8,
  };
  expect(planReviewSync(take, null)).toBe("upload");
  expect(reviewPayload(withAudio)).not.toHaveProperty("audio");
  expect(reviewPayload(withAudio)).not.toHaveProperty("cloudRevision");
  expect(reviewPayload(withAudio)).not.toHaveProperty("storage");
});
it("refuses to overwrite an unrelated cloud version without a common revision", () => {
  expect(
    planReviewSync(take, cloud({ ...take, title: "Another device" })),
  ).toBe("conflict");
});
it("uploads only when a device edit is based on the current cloud revision", () => {
  expect(
    planReviewSync(
      { ...take, cloudRevision: 1, syncPending: true },
      cloud({ ...take, title: "Previous" }),
    ),
  ).toBe("upload");
});
it("pulls a newer cloud edit when the device has no pending edits", () => {
  expect(
    planReviewSync(
      { ...take, cloudRevision: 1, syncPending: false },
      cloud({ ...take, title: "Updated" }, 2),
    ),
  ).toBe("download");
});
it("preserves both edits when the device and cloud changed concurrently", () => {
  expect(
    planReviewSync(
      { ...take, cloudRevision: 1, syncPending: true },
      cloud({ ...take, title: "Updated" }, 2),
    ),
  ).toBe("conflict");
});
it("recognizes a deletion marker instead of resurrecting stale data", () => {
  expect(
    planReviewSync(
      { ...take, cloudRevision: 1 },
      {
        ...cloud(),
        deleted_at: "2026-10-23T00:00:00Z",
        data: { id: take.id } as Session,
      },
    ),
  ).toBe("deleted");
  expect(planReviewSync({ ...take, cloudRevision: 1 }, null)).toBe("deleted");
});
it("adopts a current revision when the actual review content already agrees", () => {
  expect(
    planReviewSync(
      { ...take, cloudRevision: 1, syncPending: true },
      cloud(take, 5),
    ),
  ).toBe("same");
});
