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


-- ============================================================
-- Часть 2 (миграция 002): онбординг, предпросмотр и отмена приглашений, расформирование
-- ============================================================

-- Together: миграция 002 — онбординг, предпросмотр и отмена приглашений, расформирование пары.
-- Запустите один раз: Supabase Dashboard -> SQL Editor -> New query -> вставить -> Run.
-- Скрипт можно запускать повторно, он ничего не ломает.

-- 1. Предпросмотр приглашения. Доступен и без входа: человек должен увидеть,
--    кто его зовёт, ещё до регистрации. Токен длиной 256 бит знает только получатель.
create or replace function public.get_invitation_preview(p_token_hash text)
returns table (state text, inviter_name text, start_date date, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
  computed_state text;
begin
  if p_token_hash is null or length(p_token_hash) <> 64 then
    return query select 'not_found'::text, null::text, null::date, null::timestamptz;
    return;
  end if;

  select * into inv from public.invitations where token_hash = p_token_hash;
  if not found then
    return query select 'not_found'::text, null::text, null::date, null::timestamptz;
    return;
  end if;

  if inv.status = 'accepted' then
    computed_state := 'used';
  elsif inv.status = 'revoked' then
    computed_state := 'revoked';
  elsif inv.status = 'expired' or inv.expires_at <= now() then
    computed_state := 'expired';
  elsif (select count(*) from public.couple_members where couple_id = inv.couple_id) >= 2 then
    computed_state := 'used';
  elsif auth.uid() is not null and inv.created_by = auth.uid() then
    computed_state := 'own';
  elsif auth.uid() is not null and exists (select 1 from public.couple_members where user_id = auth.uid()) then
    computed_state := 'in_couple';
  else
    computed_state := 'valid';
  end if;

  -- Имя и дату показываем только тому, у кого есть рабочая ссылка.
  if computed_state in ('valid', 'own', 'in_couple') then
    return query
      select computed_state,
             (select p.display_name from public.profiles p where p.id = inv.created_by),
             (select c.start_date from public.couples c where c.id = inv.couple_id),
             inv.expires_at;
  else
    return query select computed_state, null::text, null::date, null::timestamptz;
  end if;
end;
$$;

-- 2. Когда истекает активная ссылка моей пары (null — активной нет).
create or replace function public.my_pending_invitation()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select i.expires_at
  from public.invitations i
  join public.couple_members m on m.couple_id = i.couple_id and m.user_id = auth.uid()
  where i.status = 'pending' and i.expires_at > now()
  order by i.created_at desc
  limit 1;
$$;

-- 3. Отмена приглашения создателем (любым участником пары).
create or replace function public.revoke_invitation()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_couple_id uuid;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт.'; end if;
  select couple_id into my_couple_id from public.couple_members where user_id = auth.uid();
  if my_couple_id is null then raise exception 'Вы не состоите в паре.'; end if;

  perform 1 from public.couples where id = my_couple_id for update;
  update public.invitations set status = 'revoked'
  where couple_id = my_couple_id and status = 'pending';
end;
$$;

-- 4. Расформирование пары. Удаляет пару, участников и приглашения (каскадом).
create or replace function public.dissolve_couple()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  my_couple_id uuid;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт.'; end if;
  select couple_id into my_couple_id from public.couple_members where user_id = auth.uid();
  if my_couple_id is null then raise exception 'Вы не состоите в паре.'; end if;

  perform 1 from public.couples where id = my_couple_id for update;
  delete from public.couples where id = my_couple_id;
end;
$$;

-- 5. Дата начала не должна считаться «будущей» из-за часовых поясов: допускаем +1 день к UTC.
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
  if p_start_date > current_date + 1 then raise exception 'Дата начала отношений не может быть в будущем.'; end if;
  if p_start_date < date '1950-01-01' then raise exception 'Укажите дату не раньше 1950 года.'; end if;
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

-- 6. Права. Вызывать функции могут только вошедшие пользователи,
--    кроме предпросмотра приглашения (его видит и гость).
revoke all on function public.get_invitation_preview(text) from public;
revoke all on function public.my_pending_invitation() from public, anon;
revoke all on function public.revoke_invitation() from public, anon;
revoke all on function public.dissolve_couple() from public, anon;
revoke all on function public.create_couple_with_invitation(date, text) from public, anon;
revoke all on function public.create_invitation(uuid, text) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
revoke all on function public.is_couple_member(uuid) from public, anon;
revoke all on function public.is_user_my_partner(uuid) from public, anon;

grant execute on function public.get_invitation_preview(text) to anon, authenticated;
grant execute on function public.my_pending_invitation() to authenticated;
grant execute on function public.revoke_invitation() to authenticated;
grant execute on function public.dissolve_couple() to authenticated;
grant execute on function public.create_couple_with_invitation(date, text) to authenticated;
grant execute on function public.create_invitation(uuid, text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.is_couple_member(uuid) to authenticated;
grant execute on function public.is_user_my_partner(uuid) to authenticated;

-- Запретить пользователю менять email в профиле: это зеркало auth.users, его правит только триггер.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, updated_at) on public.profiles to authenticated;


-- ============================================================
-- Часть 3 (миграция 003): аватары
-- ============================================================

-- Together: миграция 003 — аватары.
-- Запустите один раз: Supabase Dashboard -> SQL Editor -> New query -> вставить -> Run.
-- Скрипт можно запускать повторно.

-- 1. Хранилище. Бакет публичный (картинки открываются по ссылке без входа),
--    но писать в него можно только в собственную папку, а размер и тип ограничены.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 1048576,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 2. Политики. Загружать можно только файл строго вида "<мой id>/<имя>.jpg|png|webp":
--    никаких вложенных папок и «..» в пути. Читать и удалять — только в своей папке.
drop policy if exists "Users read own avatar files" on storage.objects;
create policy "Users read own avatar files" on storage.objects
for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users upload own avatar files" on storage.objects;
create policy "Users upload own avatar files" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and name ~ ('^' || auth.uid()::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$')
);

drop policy if exists "Users update own avatar files" on storage.objects;
create policy "Users update own avatar files" on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (
  bucket_id = 'avatars'
  and name ~ ('^' || auth.uid()::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$')
);

drop policy if exists "Users delete own avatar files" on storage.objects;
create policy "Users delete own avatar files" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3. В profiles.avatar_url хранится ТОЛЬКО путь вида "<id пользователя>/<имя>.jpg".
--    Так в профиль нельзя записать внешнюю ссылку (иначе она загружалась бы
--    в браузере партнёра и выдавала бы его IP-адрес).
alter table public.profiles drop constraint if exists profiles_avatar_path_check;
alter table public.profiles add constraint profiles_avatar_path_check
  check (avatar_url is null or avatar_url ~ ('^' || id::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$'));
