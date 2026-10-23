import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { setAccountOwner, accountStorage } from "../shared/account-scope";
import { defaultProfile, type Session } from "../modules/musecoach/lib/types";
const mock = vi.hoisted(() => ({
  choices: vi.fn(),
  localProfile: vi.fn(),
  remoteProfile: vi.fn(),
  pushProfile: vi.fn(),
  profilesave: vi.fn(),
  locals: vi.fn(),
  remotes: vi.fn(),
  push: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
  apply: vi.fn(),
}));
vi.mock("../shared/practice-cloud", () => ({
  syncChoices: mock.choices,
  cloudProfile: mock.remoteProfile,
  pushProfile: mock.pushProfile,
  allCloudReviews: mock.remotes,
  pushReview: mock.push,
  assertOwner: vi.fn(),
}));
vi.mock("@musecoach/lib/storage", () => ({
  readProfile: mock.localProfile,
  storeSyncedProfile: mock.profilesave,
  rawSessions: mock.locals,
  putRawSession: mock.put,
  removeRawSession: mock.remove,
  applyCloudReview: mock.apply,
}));
import { syncPractice, markProfile } from "../shared/practice-sync";
const take = {
  id: "take1",
  title: "Take",
  date: "2026-10-23T00:00:00Z",
  context: "free",
  analysis: { score: 80 },
  storage: "local",
  audioSaved: false,
} as Session;
const remote = {
  id: "take1",
  data: { ...take, title: "Newer" },
  audio_path: null,
  revision: 2,
  deleted_at: null,
};
const values = new Map<string, string>();
beforeEach(() => {
  vi.resetAllMocks();
  values.clear();
  setAccountOwner("alice");
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  mock.choices.mockResolvedValue({ profile_sync: false, review_sync: false });
  mock.localProfile.mockReturnValue(null);
  mock.remoteProfile.mockResolvedValue(null);
  mock.locals.mockResolvedValue([]);
  mock.remotes.mockResolvedValue([]);
  mock.push.mockResolvedValue({ ...remote, data: take });
  mock.pushProfile.mockResolvedValue({ data: defaultProfile, revision: 1 });
});
afterEach(() => vi.unstubAllGlobals());
it("does not upload profiles or read review content before opting in", async () => {
  await syncPractice();
  expect(mock.pushProfile).not.toHaveBeenCalled();
  expect(mock.remotes).not.toHaveBeenCalled();
  expect(mock.locals).not.toHaveBeenCalled();
});
it("uploads a first profile only after profile sync is enabled", async () => {
  mock.choices.mockResolvedValue({ profile_sync: true, review_sync: false });
  mock.localProfile.mockReturnValue(defaultProfile);
  const result = await syncPractice();
  expect(result.uploaded).toBe(1);
  expect(mock.pushProfile).toHaveBeenCalledWith(defaultProfile, 0);
  expect(accountStorage.getItem("musecoach-profile-sync")).toContain(
    "revision",
  );
});
it("preserves a first-device profile conflict without overwriting either side", async () => {
  mock.choices.mockResolvedValue({ profile_sync: true, review_sync: false });
  mock.localProfile.mockReturnValue(defaultProfile);
  mock.remoteProfile.mockResolvedValue({
    data: { ...defaultProfile, name: "Remote" },
    revision: 3,
  });
  const result = await syncPractice();
  expect(result.profileConflict).toBe(true);
  expect(mock.pushProfile).not.toHaveBeenCalled();
  expect(mock.profilesave).not.toHaveBeenCalled();
});
it("pulls a newer profile when the local copy matches its last synced baseline", async () => {
  mock.choices.mockResolvedValue({ profile_sync: true, review_sync: false });
  mock.localProfile.mockReturnValue(defaultProfile);
  markProfile(defaultProfile, 1);
  mock.remoteProfile.mockResolvedValue({
    data: { ...defaultProfile, name: "Remote" },
    revision: 2,
  });
  const result = await syncPractice();
  expect(result.downloaded).toBe(1);
  expect(mock.profilesave).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Remote" }),
  );
});
it("marks concurrent review changes as a conflict instead of overwriting them", async () => {
  mock.choices.mockResolvedValue({ profile_sync: false, review_sync: true });
  mock.locals.mockResolvedValue([
    { ...take, cloudRevision: 1, syncPending: true },
  ]);
  mock.remotes.mockResolvedValue([remote]);
  const result = await syncPractice();
  expect(result.conflicts).toEqual(["take1"]);
  expect(mock.put).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Take", syncConflict: true }),
  );
  expect(mock.push).not.toHaveBeenCalled();
  expect(mock.apply).not.toHaveBeenCalled();
});
it("downloads cloud reviews without downloading their audio", async () => {
  mock.choices.mockResolvedValue({ profile_sync: false, review_sync: true });
  mock.remotes.mockResolvedValue([
    { ...remote, audio_path: "alice/take1-file" },
  ]);
  const result = await syncPractice();
  expect(result.downloaded).toBe(1);
  expect(mock.apply).toHaveBeenCalledWith(
    expect.objectContaining({ audio_path: "alice/take1-file" }),
  );
});
it("keeps device audio when the corresponding cloud review was deleted", async () => {
  mock.choices.mockResolvedValue({ profile_sync: false, review_sync: true });
  mock.locals.mockResolvedValue([
    { ...take, audio: new Blob(["x"]), cloudRevision: 1 },
  ]);
  mock.remotes.mockResolvedValue([
    { ...remote, deleted_at: "2026-10-23T00:00:00Z" },
  ]);
  await syncPractice();
  expect(mock.put).toHaveBeenCalledWith(
    expect.objectContaining({
      syncExcluded: true,
      cloudAudioSaved: false,
      audioSaved: true,
    }),
  );
  expect(mock.remove).not.toHaveBeenCalled();
  expect(mock.push).not.toHaveBeenCalled();
});
it("removes a clean metadata cache after a cloud deletion", async () => {
  mock.choices.mockResolvedValue({ profile_sync: false, review_sync: true });
  mock.locals.mockResolvedValue([
    { ...take, cloudRevision: 1, syncPending: false },
  ]);
  mock.remotes.mockResolvedValue([
    { ...remote, deleted_at: "2026-10-23T00:00:00Z" },
  ]);
  await syncPractice();
  expect(mock.remove).toHaveBeenCalledWith("take1");
  expect(mock.push).not.toHaveBeenCalled();
});
it("leaves device records intact when syncing offline changes fails", async () => {
  mock.choices.mockResolvedValue({ profile_sync: false, review_sync: true });
  mock.locals.mockResolvedValue([{ ...take, syncPending: true }]);
  mock.push.mockRejectedValue(Error("Offline"));
  await expect(syncPractice()).rejects.toThrow(
    "Device takes are kept for retry",
  );
  expect(mock.remove).not.toHaveBeenCalled();
  expect(mock.put).not.toHaveBeenCalled();
});
it("coalesces concurrent sync requests within the same signed-in tab", async () => {
  const first = syncPractice(),
    second = syncPractice();
  expect(first).toBe(second);
  await first;
  expect(mock.choices).toHaveBeenCalledTimes(1);
});
