import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { setAccountOwner } from "../shared/account-scope";
import type { Session } from "../modules/musecoach/lib/types";
const mock = vi.hoisted(() => ({
  raw: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
  apply: vi.fn(),
  cloud: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  deleteCloud: vi.fn(),
  attach: vi.fn(),
  restore: vi.fn(),
}));
vi.mock("@musecoach/lib/storage", () => ({
  rawSession: mock.raw,
  putRawSession: mock.put,
  removeRawSession: mock.remove,
  applyCloudReview: mock.apply,
  signalLocalChange: vi.fn(),
}));
vi.mock("../shared/practice-cloud", () => ({
  cloudReview: mock.cloud,
  attachCloudAudio: mock.attach,
  restoreCloudReview: mock.restore,
  assertOwner: (owner: string) => {
    if (owner !== "alice") throw Error("Account changed");
  },
}));
vi.mock("../shared/cloud", () => ({
  saveCloudSession: mock.upload,
  cloudAudio: mock.download,
  deleteCloudSession: mock.deleteCloud,
}));
import {
  sendTakeToCloud,
  bringTakeToDevice,
} from "../shared/recording-transfer";
const audio = new Blob(["fixture"], { type: "audio/wav" }),
  take = {
    id: "take1",
    title: "Practice",
    date: "2026-10-23T00:00:00Z",
    context: "free",
    analysis: { score: 80 },
    audioSaved: true,
    storage: "local",
  } as Session;
let local: (Session & { audio?: Blob }) | undefined;
const snapshot = () => local;
const remote = {
  id: "take1",
  data: take,
  audio_path: "alice/take1-file",
  revision: 1,
  deleted_at: null,
};
beforeEach(() => {
  vi.clearAllMocks();
  setAccountOwner("alice");
  vi.stubGlobal("window", new EventTarget());
  local = { ...take, audio };
  mock.raw.mockImplementation(async () => local);
  mock.put.mockImplementation(async (value) => {
    local = value;
  });
  mock.cloud.mockResolvedValue(remote);
  mock.upload.mockResolvedValue(undefined);
  mock.download.mockResolvedValue(audio);
  mock.deleteCloud.mockResolvedValue(undefined);
  mock.attach.mockResolvedValue(remote);
  mock.restore.mockResolvedValue({ ...remote, audio_path: null });
  mock.apply.mockImplementation(async (row) => {
    local = {
      ...local!,
      cloudRevision: row.revision,
      cloudAudioSaved: !!row.audio_path,
      syncPending: false,
    };
  });
});
afterEach(() => vi.unstubAllGlobals());
it("keeps the device source if uploading fails", async () => {
  mock.cloud.mockResolvedValue(null);
  mock.upload.mockRejectedValue(Error("Upload failed"));
  await expect(sendTakeToCloud("take1", true)).rejects.toThrow("Upload failed");
  expect(snapshot()?.audio).toBe(audio);
  expect(mock.put).not.toHaveBeenCalled();
});
it("copy to cloud keeps device audio", async () => {
  await sendTakeToCloud("take1");
  expect(snapshot()?.audio).toBe(audio);
  expect(mock.deleteCloud).not.toHaveBeenCalled();
});
it("move to cloud removes device audio only after the destination is verified", async () => {
  await sendTakeToCloud("take1", true);
  expect(mock.apply).toHaveBeenCalled();
  expect(snapshot()?.audio).toBeUndefined();
  expect(snapshot()?.cloudAudioSaved).toBe(true);
});
it("does not overwrite conflicting cloud metadata during transfer", async () => {
  mock.cloud.mockResolvedValue({
    ...remote,
    data: { ...take, title: "Other device" },
  });
  await expect(sendTakeToCloud("take1", true)).rejects.toThrow("differ");
  expect(snapshot()?.audio).toBe(audio);
  expect(snapshot()?.syncConflict).toBe(true);
  expect(mock.upload).not.toHaveBeenCalled();
});
it("keeps the cloud source when downloading fails", async () => {
  local = undefined;
  mock.download.mockRejectedValue(Error("Download failed"));
  await expect(bringTakeToDevice("take1", true)).rejects.toThrow(
    "Download failed",
  );
  expect(mock.put).not.toHaveBeenCalled();
  expect(mock.deleteCloud).not.toHaveBeenCalled();
});
it("keeps the cloud source when saving the device copy fails", async () => {
  local = undefined;
  mock.put.mockRejectedValue(Error("Storage full"));
  await expect(bringTakeToDevice("take1", true)).rejects.toThrow(
    "Storage full",
  );
  expect(mock.deleteCloud).not.toHaveBeenCalled();
});
it("preserves a successful device copy if cloud cleanup fails", async () => {
  local = undefined;
  mock.deleteCloud.mockRejectedValue(Error("Offline"));
  await expect(bringTakeToDevice("take1", true)).rejects.toThrow(
    "Device copy saved",
  );
  expect(snapshot()?.audio).toBe(audio);
});
it("move to device excludes the take from automatic re-upload", async () => {
  local = undefined;
  await bringTakeToDevice("take1", true);
  expect(mock.deleteCloud).toHaveBeenCalledWith("take1", false, 1);
  expect(snapshot()?.audio).toBe(audio);
  expect(snapshot()?.syncExcluded).toBe(true);
  expect(snapshot()?.cloudRevision).toBeUndefined();
});
it("keeps the cloud source if the review changes during download", async () => {
  local = undefined;
  mock.cloud
    .mockResolvedValueOnce(remote)
    .mockResolvedValueOnce({ ...remote, revision: 2 });
  await expect(bringTakeToDevice("take1", true)).rejects.toThrow(
    "changed during download",
  );
  expect(mock.put).not.toHaveBeenCalled();
  expect(mock.deleteCloud).not.toHaveBeenCalled();
});
it("allows an explicitly moved device take to be transferred back to cloud", async () => {
  local = { ...take, audio, syncExcluded: true };
  mock.cloud.mockResolvedValue({
    ...remote,
    deleted_at: "2026-10-23T00:00:00Z",
    data: { id: "take1" },
  });
  await sendTakeToCloud("take1");
  expect(mock.restore).toHaveBeenCalled();
  expect(mock.attach).toHaveBeenCalled();
  expect(snapshot()?.audio).toBe(audio);
});
