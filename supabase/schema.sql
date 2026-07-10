-- Ruby — real-time shared lists
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: it drops and recreates policies.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '📝',
  owner_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.list_members (
  list_id uuid not null references public.lists on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists on delete cascade,
  text text not null,
  is_done boolean not null default false,
  position double precision not null default 0,
  created_by uuid references auth.users on delete set null,
  done_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists items_list_id_idx on public.items (list_id);
create index if not exists list_members_user_id_idx on public.list_members (user_id);

-- ---------------------------------------------------------------------------
-- Helper: is the current user allowed to see this list?
-- SECURITY DEFINER so it can read list_members without tripping the RLS
-- policies that themselves call this function (avoids infinite recursion).
-- ---------------------------------------------------------------------------

create or replace function public.is_list_member(_list_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from lists where id = _list_id and owner_id = auth.uid())
    or exists (select 1 from list_members where list_id = _list_id and user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- New auth user -> create a profile row, and add owner rows automatically
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- When a list is created, add the owner as a member so shared queries are uniform.
create or replace function public.handle_new_list()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.list_members (list_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_list_created on public.lists;
create trigger on_list_created
  after insert on public.lists
  for each row execute function public.handle_new_list();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.items enable row level security;

-- profiles: anyone signed in can read (needed to show member names/avatars),
-- but you can only write your own row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_upsert on public.profiles;
create policy profiles_upsert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid());

-- lists: members can read; only the owner can create/rename/delete.
drop policy if exists lists_select on public.lists;
create policy lists_select on public.lists
  for select to authenticated using (public.is_list_member(id));

drop policy if exists lists_insert on public.lists;
create policy lists_insert on public.lists
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists lists_update on public.lists;
create policy lists_update on public.lists
  for update to authenticated using (owner_id = auth.uid());

drop policy if exists lists_delete on public.lists;
create policy lists_delete on public.lists
  for delete to authenticated using (owner_id = auth.uid());

-- list_members: you can see membership rows for lists you belong to.
-- Only the list owner can add members; the owner or the member can remove.
drop policy if exists list_members_select on public.list_members;
create policy list_members_select on public.list_members
  for select to authenticated using (public.is_list_member(list_id));

drop policy if exists list_members_insert on public.list_members;
create policy list_members_insert on public.list_members
  for insert to authenticated with check (
    exists (select 1 from lists where id = list_id and owner_id = auth.uid())
  );

drop policy if exists list_members_delete on public.list_members;
create policy list_members_delete on public.list_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from lists where id = list_id and owner_id = auth.uid())
  );

-- items: any member of the list can do anything with its items.
drop policy if exists items_all on public.items;
create policy items_all on public.items
  for all to authenticated
  using (public.is_list_member(list_id))
  with check (public.is_list_member(list_id));

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes for lists and items to subscribed clients
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.list_members;
