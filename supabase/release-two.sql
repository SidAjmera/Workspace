-- Release two: opt-in profile/review sync and revision-checked recording transfers.
create table public.musecoach_sync_settings(
 user_id uuid primary key references auth.users on delete cascade,
 profile_sync boolean not null default false,
 review_sync boolean not null default false
);
create table public.musecoach_profiles(
 user_id uuid primary key references auth.users on delete cascade,
 data jsonb not null check(jsonb_typeof(data)='object' and data ? 'name' and octet_length(data::text)<=65536),
 revision bigint not null default 1,
 updated_at timestamptz not null default now()
);
alter table public.musecoach_sessions add column revision bigint not null default 1;
alter table public.musecoach_sessions add column updated_at timestamptz not null default now();
alter table public.musecoach_sessions add column deleted_at timestamptz;
alter table public.musecoach_sync_settings enable row level security;
alter table public.musecoach_profiles enable row level security;
create policy "Own practice sync choices" on public.musecoach_sync_settings for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy "Read own practice profile" on public.musecoach_profiles for select to authenticated using((select auth.uid())=user_id);
create policy "Delete own practice profile" on public.musecoach_profiles for delete to authenticated using((select auth.uid())=user_id);
create policy "Opted in practice profile insert" on public.musecoach_profiles for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.musecoach_sync_settings s where s.user_id=(select auth.uid()) and s.profile_sync));
create policy "Opted in practice profile update" on public.musecoach_profiles for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id and exists(select 1 from public.musecoach_sync_settings s where s.user_id=(select auth.uid()) and s.profile_sync));
revoke all on public.musecoach_sync_settings,public.musecoach_profiles from anon,authenticated;
grant select,insert,update,delete on public.musecoach_sync_settings,public.musecoach_profiles to authenticated;
create function public.bump_practice_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.revision:=old.revision+1;new.updated_at:=clock_timestamp();return new;end;
$$;
revoke all on function public.bump_practice_revision() from public,anon,authenticated;
create trigger practice_review_revision before update on public.musecoach_sessions for each row execute function public.bump_practice_revision();
create trigger practice_profile_revision before update on public.musecoach_profiles for each row execute function public.bump_practice_revision();
create function public.sync_musecoach_profile(payload jsonb,expected_revision bigint) returns jsonb language plpgsql security invoker set search_path='' as $$
declare caller uuid:=(select auth.uid());current_row public.musecoach_profiles;
begin
 if caller is null then raise exception 'Authentication required';end if;
 if not exists(select 1 from public.musecoach_sync_settings s where s.user_id=caller and s.profile_sync) then raise exception 'Profile sync is off';end if;
 if jsonb_typeof(payload) is distinct from 'object' or not(payload ? 'name') then raise exception 'Invalid practice profile';end if;
 select * into current_row from public.musecoach_profiles where user_id=caller for update;
 if found then
  if expected_revision is distinct from current_row.revision then raise exception 'Profile changed on another device. Choose which version to keep.' using errcode='40001';end if;
  update public.musecoach_profiles set data=payload where user_id=caller returning * into current_row;
 else
  if expected_revision is distinct from 0::bigint then raise exception 'Cloud profile was deleted. Choose which version to keep.' using errcode='40001';end if;
  insert into public.musecoach_profiles(user_id,data) values(caller,payload) returning * into current_row;
 end if;
 return to_jsonb(current_row);
end;
$$;
create function public.sync_musecoach_review(review_id text,payload jsonb,expected_revision bigint) returns jsonb language plpgsql security invoker set search_path='' as $$
declare caller uuid:=(select auth.uid());current_row public.musecoach_sessions;
begin
 if caller is null then raise exception 'Authentication required';end if;
 if not exists(select 1 from public.musecoach_sync_settings s where s.user_id=caller and s.review_sync) then raise exception 'Review sync is off';end if;
 if jsonb_typeof(payload) is distinct from 'object' or (payload->>'id') is distinct from review_id then raise exception 'Invalid practice review';end if;
 select * into current_row from public.musecoach_sessions where user_id=caller and id=review_id for update;
 if found then
  if current_row.deleted_at is not null or expected_revision is distinct from current_row.revision then raise exception 'Review changed on another device. Resolve the conflict before syncing.' using errcode='40001';end if;
  update public.musecoach_sessions set data=payload where user_id=caller and id=review_id returning * into current_row;
 else
  if expected_revision is distinct from 0::bigint then raise exception 'Cloud review was deleted. Device copy is kept.' using errcode='40001';end if;
  insert into public.musecoach_sessions(user_id,id,data) values(caller,review_id,payload) returning * into current_row;
 end if;
 return to_jsonb(current_row);
end;
$$;
revoke all on function public.sync_musecoach_profile(jsonb,bigint),public.sync_musecoach_review(text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.sync_musecoach_profile(jsonb,bigint),public.sync_musecoach_review(text,jsonb,bigint) to authenticated;
create or replace function public.clear_workspace_app(target text) returns void language plpgsql security invoker set search_path='' as $$
declare caller uuid:=(select auth.uid());
begin
 if caller is null then raise exception 'Authentication required';end if;
 if target not in ('toolnest','musecoach','workspace') or target is null then raise exception 'Invalid deletion scope';end if;
 if target in ('toolnest','workspace') then
  delete from public.consent_records where user_id=caller;delete from public.user_preferences where user_id=caller;delete from public.search_history where user_id=caller;delete from public.saved_apps where user_id=caller;delete from public.app_suggestions where user_id=caller;
 end if;
 if target in ('musecoach','workspace') then
  update public.musecoach_sessions set data=jsonb_build_object('id',id),audio_path=null,deleted_at=now() where user_id=caller and deleted_at is null;
  delete from public.musecoach_profiles where user_id=caller;
  insert into public.musecoach_sync_settings(user_id,profile_sync,review_sync) values(caller,false,false) on conflict(user_id) do update set profile_sync=false,review_sync=false;
 end if;
 if target='workspace' then delete from public.workspace_profiles where user_id=caller;delete from public.user_profiles where user_id=caller;end if;
end;
$$;
