-- Как вы называете партнёра. Видно только вам: у партнёра своё имя для вас, и настоящее имя в профиле не меняется.
create table if not exists public.partner_aliases (
  user_id uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid not null references public.profiles(id) on delete cascade,
  alias text not null check (char_length(btrim(alias)) between 1 and 40),
  updated_at timestamptz not null default now(),
  primary key (user_id, partner_id)
);
alter table public.partner_aliases enable row level security;

drop policy if exists "Own aliases read" on public.partner_aliases;
create policy "Own aliases read" on public.partner_aliases for select to authenticated using (user_id = auth.uid());
drop policy if exists "Own aliases insert" on public.partner_aliases;
create policy "Own aliases insert" on public.partner_aliases for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Own aliases update" on public.partner_aliases;
create policy "Own aliases update" on public.partner_aliases for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Own aliases delete" on public.partner_aliases;
create policy "Own aliases delete" on public.partner_aliases for delete to authenticated using (user_id = auth.uid());

revoke all on public.partner_aliases from anon, authenticated;
grant select, insert, update, delete on public.partner_aliases to authenticated;
