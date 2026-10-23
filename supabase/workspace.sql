-- Additive upgrade for the existing Toolnest database. Audio is private and opt-in.
create table public.workspace_profiles (
 user_id uuid primary key references auth.users on delete cascade,
 display_name text not null default '' check(length(display_name)<=80),
 theme text not null default 'system' check(theme in ('light','dark','system'))
);
create table public.musecoach_sessions (
 user_id uuid not null references auth.users on delete cascade,
 id text not null check(id ~ '^[a-zA-Z0-9-]{1,100}$'),
 data jsonb not null check(jsonb_typeof(data)='object' and data->>'id'=id and octet_length(data::text)<=1048576),
 audio_path text,
 created_at timestamptz not null default now(),
 primary key(user_id,id),
 constraint own_audio_path check(audio_path is null or (left(audio_path,length(user_id::text)+1)=user_id::text||'/' and left(split_part(audio_path,'/',2),length(id)+1)=id||'-' and array_length(string_to_array(audio_path,'/'),1)=2))
);
alter table public.workspace_profiles enable row level security;
alter table public.musecoach_sessions enable row level security;
create policy "Own workspace profile" on public.workspace_profiles for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Own practice sessions" on public.musecoach_sessions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.workspace_profiles,public.musecoach_sessions from anon,authenticated;
grant select,insert,update,delete on public.workspace_profiles,public.musecoach_sessions to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('musecoach-recordings','musecoach-recordings',false,20971520,array['audio/wav','audio/x-wav','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/webm','audio/flac'])
on conflict(id) do nothing;
create policy "Read own practice audio" on storage.objects for select to authenticated using(bucket_id='musecoach-recordings' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Upload own practice audio" on storage.objects for insert to authenticated with check(bucket_id='musecoach-recordings' and (storage.foldername(name))[1]=(select auth.uid())::text and array_length(string_to_array(name,'/'),1)=2);
create policy "Delete own practice audio" on storage.objects for delete to authenticated using(bucket_id='musecoach-recordings' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- Immutable uploads use unique names, so no UPDATE permission is needed.
create function public.clear_workspace_app(target text) returns void language plpgsql security invoker set search_path='' as $$
declare caller uuid := (select auth.uid());
begin
 if caller is null then raise exception 'Authentication required'; end if;
 if target not in ('toolnest','musecoach','workspace') or target is null then raise exception 'Invalid deletion scope'; end if;
 if target in ('toolnest','workspace') then
  delete from public.consent_records where user_id=caller;
  delete from public.user_preferences where user_id=caller;
  delete from public.search_history where user_id=caller;
  delete from public.saved_apps where user_id=caller;
  delete from public.app_suggestions where user_id=caller;
 end if;
 if target in ('musecoach','workspace') then delete from public.musecoach_sessions where user_id=caller; end if;
 if target='workspace' then delete from public.workspace_profiles where user_id=caller;delete from public.user_profiles where user_id=caller;end if;
end;
$$;
revoke all on function public.clear_workspace_app(text) from public,anon,authenticated;
grant execute on function public.clear_workspace_app(text) to authenticated;
