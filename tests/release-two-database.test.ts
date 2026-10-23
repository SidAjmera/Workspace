import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
let db: PGlite;
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222";
async function user(id: string) {
  await db.exec("reset role;set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;grant usage on schema auth,public to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`,
  );
  for (const file of [
    "supabase/migrations/001_appscout.sql",
    "supabase/workspace.sql",
    "supabase/release-two.sql",
  ])
    await db.exec(readFileSync(file, "utf8"));
  await db.exec(
    `insert into auth.users values('${alice}'),('${bob}');insert into public.apps(id,name,category,data) values('notes','Notes','Productivity','{"id":"notes"}');`,
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec(
    "reset role;truncate public.musecoach_sync_settings,public.musecoach_profiles,public.musecoach_sessions,public.saved_apps;",
  );
  await user(alice);
});
async function optIn() {
  await db.query(
    "insert into public.musecoach_sync_settings(user_id,profile_sync,review_sync) values($1,true,true)",
    [alice],
  );
}
async function profile(name: string, revision: number | null = 0) {
  return db.query<{ value: { revision: number; data: { name: string } } }>(
    "select public.sync_musecoach_profile($1::jsonb,$2) as value",
    [JSON.stringify({ name }), revision],
  );
}
async function review(title: string, revision: number | null = 0) {
  return db.query<{
    value: {
      revision: number;
      data: { title: string };
      audio_path: string | null;
    };
  }>("select public.sync_musecoach_review($1,$2::jsonb,$3) as value", [
    "take1",
    JSON.stringify({ id: "take1", title }),
    revision,
  ]);
}
it("requires explicit profile and review opt-in", async () => {
  await expect(profile("Alice")).rejects.toThrow("Profile sync is off");
  await expect(review("First")).rejects.toThrow("Review sync is off");
  await expect(
    db.query(
      "insert into public.musecoach_profiles(user_id,data) values($1,$2)",
      [alice, '{"name":"Alice"}'],
    ),
  ).rejects.toMatchObject({ code: "42501" });
});
it("uses profile revisions to prevent stale overwrites", async () => {
  await optIn();
  expect((await profile("Alice")).rows[0].value.revision).toBe(1);
  expect((await profile("New name", 1)).rows[0].value.revision).toBe(2);
  await expect(profile("Stale name", 1)).rejects.toMatchObject({
    code: "40001",
  });
  expect(
    (
      await db.query<{ data: { name: string } }>(
        "select data from public.musecoach_profiles",
      )
    ).rows[0].data.name,
  ).toBe("New name");
});
it("isolates sync choices and profiles between accounts", async () => {
  await optIn();
  await profile("Private");
  await user(bob);
  expect(
    (await db.query("select * from public.musecoach_sync_settings")).rows,
  ).toHaveLength(0);
  expect(
    (await db.query("select * from public.musecoach_profiles")).rows,
  ).toHaveLength(0);
  await expect(
    db.query(
      "insert into public.musecoach_sync_settings(user_id,profile_sync) values($1,true)",
      [alice],
    ),
  ).rejects.toMatchObject({ code: "42501" });
});
it("preserves cloud audio when syncing review metadata", async () => {
  await optIn();
  await db.query(
    "insert into public.musecoach_sessions(user_id,id,data,audio_path) values($1,$2,$3,$4)",
    [alice, "take1", '{"id":"take1","title":"Before"}', alice + "/take1-file"],
  );
  const saved = (await review("After", 1)).rows[0].value;
  expect(saved.revision).toBe(2);
  expect(saved.audio_path).toBe(alice + "/take1-file");
  await expect(review("Stale", 1)).rejects.toMatchObject({ code: "40001" });
});
it("supports cloud reviews without requiring an audio file", async () => {
  await optIn();
  const saved = (await review("Measurements")).rows[0].value;
  expect(saved.audio_path).toBeNull();
  expect(saved.data.title).toBe("Measurements");
});
it("does not let clients choose their own next revision", async () => {
  await optIn();
  await profile("Alice");
  await db.exec(
    "update public.musecoach_profiles set revision=999,data='{" +
      '"name":"Changed"' +
      "}'",
  );
  expect(
    (
      await db.query<{ revision: number }>(
        "select revision from public.musecoach_profiles",
      )
    ).rows[0].revision,
  ).toBe(2);
});
it("keeps deletion markers and rejects resurrection by stale devices", async () => {
  await optIn();
  await review("Private notes");
  await db.exec(
    "update public.musecoach_sessions set deleted_at=now(),data=jsonb_build_object('id',id),audio_path=null",
  );
  await expect(review("Resurrect", 1)).rejects.toMatchObject({ code: "40001" });
  expect(
    (
      await db.query<{ data: unknown }>(
        "select data from public.musecoach_sessions",
      )
    ).rows[0].data,
  ).toEqual({ id: "take1" });
});
it("stops writes after sync is disabled without silently deleting cloud copies", async () => {
  await optIn();
  await profile("Alice");
  await db.exec(
    "update public.musecoach_sync_settings set profile_sync=false,review_sync=false",
  );
  await expect(profile("Changed", 1)).rejects.toThrow("Profile sync is off");
  expect(
    (await db.query("select * from public.musecoach_profiles")).rows,
  ).toHaveLength(1);
});
it("Musecoach deletion clears profile/content, disables sync and preserves Toolnest", async () => {
  await optIn();
  await profile("Alice");
  await review("Private title");
  await db.query(
    "insert into public.saved_apps(user_id,app_id) values($1,$2)",
    [alice, "notes"],
  );
  await db.exec("select public.clear_workspace_app('musecoach')");
  expect(
    (await db.query("select * from public.musecoach_profiles")).rows,
  ).toHaveLength(0);
  expect(
    (
      await db.query<{ profile_sync: boolean; review_sync: boolean }>(
        "select profile_sync,review_sync from public.musecoach_sync_settings",
      )
    ).rows[0],
  ).toEqual({ profile_sync: false, review_sync: false });
  expect(
    (
      await db.query<{ data: unknown; deleted_at: string }>(
        "select data,deleted_at from public.musecoach_sessions",
      )
    ).rows[0],
  ).toMatchObject({ data: { id: "take1" }, deleted_at: expect.any(Date) });
  expect((await db.query("select * from public.saved_apps")).rows).toHaveLength(
    1,
  );
});
it("rejects anonymous and null-revision synchronization calls", async () => {
  await optIn();
  await expect(profile("Null", null)).rejects.toMatchObject({ code: "40001" });
  await db.exec("reset role;set role anon;");
  await expect(
    db.exec(
      "select public.sync_musecoach_review('take1','{\"id\":\"take1\"}',0)",
    ),
  ).rejects.toMatchObject({ code: "42501" });
});
