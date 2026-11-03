-- Together MVP schema. Run once in Supabase Dashboard -> SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Пользователь',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists couple_members_user_id_idx on public.couple_members(user_id);
create index if not exists invitations_couple_id_idx on public.invitations(couple_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(coalesce(new.email, 'Пользователь'), '@', 1))
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.invitations enable row level security;

create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.couple_members where couple_id = p_couple_id and user_id = auth.uid());
$$;

create or replace function public.is_user_my_partner(p_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.couple_members mine
    join public.couple_members theirs on theirs.couple_id = mine.couple_id
    where mine.user_id = auth.uid() and theirs.user_id = p_other_user_id
  );
$$;

drop policy if exists "Profiles visible to self and partner" on public.profiles;
create policy "Profiles visible to self and partner" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_user_my_partner(id));

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Couple members can view their couple" on public.couples;
create policy "Couple members can view their couple" on public.couples
for select to authenticated
using (public.is_couple_member(couples.id));

drop policy if exists "Couple members can update their couple" on public.couples;
create policy "Couple members can update their couple" on public.couples
for update to authenticated
using (public.is_couple_member(couples.id))
with check (public.is_couple_member(couples.id));

drop policy if exists "Members can view own couple membership" on public.couple_members;
create policy "Members can view own couple membership" on public.couple_members
for select to authenticated
using (public.is_couple_member(couple_members.couple_id));

-- Invitation rows are intentionally not directly readable or writable by clients.
-- All invitation operations happen through the security-definer RPCs below.

create or replace function public.create_couple_with_invitation(p_start_date date, p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_couple_id uuid;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт.'; end if;
  if p_start_date > current_date then raise exception 'Дата начала отношений не может быть в будущем.'; end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Вы уже состоите в паре.';
  end if;
  if length(p_token_hash) <> 64 then raise exception 'Некорректное приглашение.'; end if;

  insert into public.couples (start_date) values (p_start_date) returning id into new_couple_id;
  insert into public.couple_members (couple_id, user_id) values (new_couple_id, auth.uid());
  insert into public.invitations (couple_id, created_by, token_hash) values (new_couple_id, auth.uid(), p_token_hash);
  return new_couple_id;
end;
$$;

create or replace function public.create_invitation(p_couple_id uuid, p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_invitation_id uuid;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт.'; end if;
  perform 1 from public.couples where id = p_couple_id for update;
  if not exists (select 1 from public.couple_members where couple_id = p_couple_id and user_id = auth.uid()) then
    raise exception 'У вас нет доступа к этой паре.';
  end if;
  if (select count(*) from public.couple_members where couple_id = p_couple_id) >= 2 then
    raise exception 'В паре уже есть два участника.';
  end if;
  if length(p_token_hash) <> 64 then raise exception 'Некорректное приглашение.'; end if;

  update public.invitations set status = 'revoked'
  where couple_id = p_couple_id and status = 'pending';
  insert into public.invitations (couple_id, created_by, token_hash)
  values (p_couple_id, auth.uid(), p_token_hash)
  returning id into new_invitation_id;
  return new_invitation_id;
end;
$$;

create or replace function public.accept_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.invitations%rowtype;
  member_count integer;
  target_couple_id uuid;
begin
  if auth.uid() is null then raise exception 'Сначала войдите в аккаунт.'; end if;
  if length(p_token_hash) <> 64 then raise exception 'Приглашение недействительно.'; end if;

  select couple_id into target_couple_id
  from public.invitations where token_hash = p_token_hash;
  if target_couple_id is null then raise exception 'Приглашение не найдено или недействительно.'; end if;

  -- Always lock the couple first. This serializes accept/create-invite operations
  -- and prevents a third member from joining during simultaneous requests.
  perform 1 from public.couples where id = target_couple_id for update;
  select * into invitation_row
  from public.invitations where token_hash = p_token_hash for update;

  if not found then raise exception 'Приглашение не найдено или недействительно.'; end if;
  if invitation_row.status <> 'pending' then raise exception 'Это приглашение уже использовано или отменено.'; end if;
  if invitation_row.expires_at <= now() then raise exception 'Срок действия приглашения истёк.'; end if;
  if invitation_row.created_by = auth.uid() then raise exception 'Нельзя принять собственное приглашение.'; end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'Вы уже состоите в другой паре.';
  end if;

  select count(*) into member_count from public.couple_members where couple_id = invitation_row.couple_id;
  if member_count >= 2 then raise exception 'В этой паре уже два участника.'; end if;

  insert into public.couple_members (couple_id, user_id) values (invitation_row.couple_id, auth.uid());
  update public.invitations set status = 'accepted', accepted_by = auth.uid() where id = invitation_row.id;
  return invitation_row.couple_id;
end;
$$;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.couples to authenticated;
grant select on public.couple_members to authenticated;

revoke all on function public.is_couple_member(uuid) from public;
revoke all on function public.is_user_my_partner(uuid) from public;
revoke all on function public.create_couple_with_invitation(date, text) from public;
revoke all on function public.create_invitation(uuid, text) from public;
revoke all on function public.accept_invitation(text) from public;
grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.is_user_my_partner(uuid) to authenticated;
grant execute on function public.create_couple_with_invitation(date, text) to authenticated;
grant execute on function public.create_invitation(uuid, text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
