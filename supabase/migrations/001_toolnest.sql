-- Apply in the Supabase SQL editor. No user API credentials are stored here.
create table public.apps (
 id text primary key, name text not null, category text not null,
 data jsonb not null check (data->>'id'=id),
 search_document tsvector generated always as (to_tsvector('english',name||' '||category||' '||coalesce(data->>'description','')||' '||coalesce(data->>'keywords',''))) stored,
 updated_at timestamptz not null default now()
);
create index apps_search on public.apps using gin(search_document);
create table public.user_profiles(user_id uuid primary key references auth.users on delete cascade, theme text not null default 'system', created_at timestamptz not null default now());
create table public.user_preferences(user_id uuid primary key references auth.users on delete cascade,data jsonb not null);
create table public.consent_records(user_id uuid primary key references auth.users on delete cascade,personalization boolean not null default false,history boolean not null default false,analytics boolean not null default false,version text not null default '2026-10-21',updated_at timestamptz not null default now());
create table public.saved_apps(user_id uuid references auth.users on delete cascade,app_id text references public.apps on delete cascade,created_at timestamptz not null default now(),primary key(user_id,app_id));
create table public.search_history(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,kind text not null check(kind in ('search','comparison')),data jsonb not null,created_at timestamptz not null default now());
create table public.app_suggestions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,name text not null check(length(name)<=100),website text not null check(length(website)<=500),note text not null check(length(note)<=1000),created_at timestamptz not null default now());
create table public.deletion_requests(user_id uuid primary key references auth.users on delete cascade,created_at timestamptz not null default now(),status text not null default 'pending');
create table public.ai_usage(user_id uuid primary key references auth.users on delete cascade,window_start timestamptz not null default now(),requests integer not null default 0);
-- Normalized read-only projections of curated JSON records.
create view public.platforms with (security_invoker=true) as select a.id app_id,p.key platform,p.value support from public.apps a cross join lateral jsonb_each_text(a.data->'platforms') p;
create view public.features with (security_invoker=true) as select distinct p.key name from public.apps a cross join lateral jsonb_each_text(a.data->'features') p;
create view public.app_features with (security_invoker=true) as select a.id app_id,p.key feature,p.value support from public.apps a cross join lateral jsonb_each_text(a.data->'features') p;
create view public.pricing_plans with (security_invoker=true) as select id app_id,data->'price' monthly_usd_from,data->>'pricingNote' limitations from public.apps;
create view public.sources with (security_invoker=true) as select a.id app_id,s.value source from public.apps a cross join lateral jsonb_array_elements(a.data->'sources') s;
alter table public.apps enable row level security;
create policy "Public catalog" on public.apps for select using(true);
create policy "Administrators maintain catalog" on public.apps for all to authenticated using(((select auth.jwt())->'app_metadata'->>'role')='admin') with check(((select auth.jwt())->'app_metadata'->>'role')='admin');
do $$ declare t text; begin
 foreach t in array array['user_profiles','consent_records','saved_apps','deletion_requests'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy "Own records" on public.%I for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id)',t);
 end loop;
end $$;
alter table public.user_preferences enable row level security;
create policy "Read own preferences" on public.user_preferences for select to authenticated using((select auth.uid())=user_id);
create policy "Delete own preferences" on public.user_preferences for delete to authenticated using((select auth.uid())=user_id);
create policy "Consented preferences insert" on public.user_preferences for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.consent_records c where c.user_id=(select auth.uid()) and c.personalization));
create policy "Consented preferences update" on public.user_preferences for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id and exists(select 1 from public.consent_records c where c.user_id=(select auth.uid()) and c.personalization));
alter table public.search_history enable row level security;
create policy "Read own history" on public.search_history for select to authenticated using((select auth.uid())=user_id);
create policy "Delete own history" on public.search_history for delete to authenticated using((select auth.uid())=user_id);
create policy "Consented history" on public.search_history for insert to authenticated with check((select auth.uid())=user_id and exists(select 1 from public.consent_records c where c.user_id=(select auth.uid()) and c.history));
alter table public.app_suggestions enable row level security;
create policy "Read own suggestions or admin" on public.app_suggestions for select to authenticated using((select auth.uid())=user_id or ((select auth.jwt())->'app_metadata'->>'role')='admin');
create policy "Suggest as self" on public.app_suggestions for insert to authenticated with check((select auth.uid())=user_id);
create policy "Delete own suggestion" on public.app_suggestions for delete to authenticated using((select auth.uid())=user_id);
alter table public.ai_usage enable row level security;
create policy "Read own usage" on public.ai_usage for select to authenticated using((select auth.uid())=user_id);
create function public.search_catalog(search_query text) returns setof public.apps language sql stable security invoker set search_path=public as $$
 select * from public.apps where search_document @@ websearch_to_tsquery('english',left(search_query,2000)) or name ilike '%'||left(search_query,200)||'%' order by ts_rank(search_document,websearch_to_tsquery('english',left(search_query,2000))) desc limit 100;
$$;
create function public.update_personalization(choices jsonb,preferences jsonb) returns void language plpgsql security invoker set search_path=public as $$
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 insert into public.consent_records(user_id,personalization,history,analytics) values((select auth.uid()),(choices->>'personalization')::boolean,(choices->>'history')::boolean,(choices->>'analytics')::boolean)
 on conflict(user_id) do update set personalization=excluded.personalization,history=excluded.history,analytics=excluded.analytics,version='2026-10-21',updated_at=now();
 insert into public.user_profiles(user_id,theme) values((select auth.uid()),coalesce(preferences->>'theme','system')) on conflict(user_id) do update set theme=excluded.theme;
 if (choices->>'personalization')::boolean then
 insert into public.user_preferences(user_id,data) values((select auth.uid()),preferences) on conflict(user_id) do update set data=excluded.data;
 else delete from public.user_preferences where user_id=(select auth.uid()); end if;
 if not (choices->>'history')::boolean then delete from public.search_history where user_id=(select auth.uid()); end if;
end; $$;
-- Withdrawal works even through a direct PostgREST consent update.
create function public.purge_withdrawn_consent() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not new.personalization then delete from public.user_preferences where user_id=new.user_id; end if;
 if not new.history then delete from public.search_history where user_id=new.user_id; end if;
 return new;
end; $$;
create trigger withdraw_consent after insert or update on public.consent_records for each row execute function public.purge_withdrawn_consent();
-- Serialize per-user quota changes to work across serverless instances.
create function public.consume_ai_quota() returns void language plpgsql security definer set search_path=public as $$
declare u uuid=(select auth.uid()); n integer; begin
 if u is null then raise exception 'Authentication required'; end if;
 insert into public.ai_usage(user_id,requests) values(u,0) on conflict do nothing;
 select requests into n from public.ai_usage where user_id=u for update;
 update public.ai_usage set requests=case when window_start<now()-interval '1 hour' then 1 else requests+1 end,window_start=case when window_start<now()-interval '1 hour' then now() else window_start end where user_id=u returning requests into n;
 if n>30 then raise exception 'Hourly request limit reached'; end if;
end; $$;
create function public.request_data_deletion() returns void language plpgsql security invoker set search_path=public as $$
begin
 if (select auth.uid()) is null then raise exception 'Authentication required'; end if;
 delete from public.user_preferences where user_id=(select auth.uid());
 delete from public.search_history where user_id=(select auth.uid());
 delete from public.saved_apps where user_id=(select auth.uid());
 delete from public.app_suggestions where user_id=(select auth.uid());
 update public.consent_records set personalization=false,history=false,analytics=false,updated_at=now() where user_id=(select auth.uid());
 insert into public.deletion_requests(user_id) values((select auth.uid())) on conflict do nothing;
end; $$;
revoke execute on function public.consume_ai_quota() from public,anon;
revoke execute on function public.update_personalization(jsonb,jsonb) from public,anon;
revoke execute on function public.request_data_deletion() from public,anon;
grant execute on function public.consume_ai_quota(),public.update_personalization(jsonb,jsonb),public.request_data_deletion() to authenticated;
grant select on public.apps,public.platforms,public.features,public.app_features,public.sources,public.pricing_plans to anon,authenticated;
revoke all on public.user_profiles,public.user_preferences,public.consent_records,public.saved_apps,public.search_history,public.app_suggestions,public.deletion_requests,public.ai_usage from anon,authenticated;
grant select,insert,update,delete on public.user_profiles,public.user_preferences,public.consent_records,public.saved_apps,public.search_history,public.app_suggestions,public.deletion_requests to authenticated;
grant select on public.ai_usage to authenticated;
grant insert,update,delete on public.apps to authenticated;

create function public.purge_deleted_consent() returns trigger language plpgsql security definer set search_path=public as $$ begin delete from public.user_preferences where user_id=old.user_id;delete from public.search_history where user_id=old.user_id;return old;end; $$;
create trigger delete_consent after delete on public.consent_records for each row execute function public.purge_deleted_consent();

-- Ownership predicates and catalog foreign keys have matching indexes.
create index search_history_user_created_idx on public.search_history(user_id,created_at desc);
create index app_suggestions_user_idx on public.app_suggestions(user_id);
create index saved_apps_app_idx on public.saved_apps(app_id);
-- Trigger helpers cannot be invoked as application RPCs.
revoke execute on function public.purge_withdrawn_consent() from public,anon,authenticated;
revoke execute on function public.purge_deleted_consent() from public,anon,authenticated;
