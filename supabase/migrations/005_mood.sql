-- Daily mood check-in shared by the two members of a couple.
create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  mood text not null check (mood in ('great','good','calm','tired','sad','stressed')),
  note text check (note is null or char_length(note) <= 240),
  created_at timestamptz not null default now(),
  unique (couple_id, user_id, day)
);
create index if not exists mood_entries_couple_day_idx on public.mood_entries(couple_id, day desc);
alter table public.mood_entries enable row level security;
drop policy if exists "Couple members can read daily moods" on public.mood_entries;
create policy "Couple members can read daily moods" on public.mood_entries for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Members can add own mood" on public.mood_entries;
create policy "Members can add own mood" on public.mood_entries for insert to authenticated with check (user_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists "Members can update own mood" on public.mood_entries;
create policy "Members can update own mood" on public.mood_entries for update to authenticated using (user_id = auth.uid() and public.is_couple_member(couple_id)) with check (user_id = auth.uid() and public.is_couple_member(couple_id));
grant select, insert, update on public.mood_entries to authenticated;
