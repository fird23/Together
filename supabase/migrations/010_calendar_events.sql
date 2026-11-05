-- Calendar marks: one or several days, shared by both members of a couple.
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 60),
  note text check (note is null or char_length(note) <= 240),
  color text not null default 'rose' check (color in ('rose','amber','green','blue','violet','orange','teal','gray')),
  start_day date not null,
  end_day date not null,
  created_at timestamptz not null default now(),
  constraint calendar_events_range_check check (end_day >= start_day and end_day - start_day <= 366)
);
create index if not exists calendar_events_couple_days_idx on public.calendar_events(couple_id, start_day, end_day);
alter table public.calendar_events enable row level security;

drop policy if exists "Members read calendar events" on public.calendar_events;
create policy "Members read calendar events" on public.calendar_events
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Members add calendar events" on public.calendar_events;
create policy "Members add calendar events" on public.calendar_events
  for insert to authenticated with check (created_by = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists "Members edit calendar events" on public.calendar_events;
create policy "Members edit calendar events" on public.calendar_events
  for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists "Members delete calendar events" on public.calendar_events;
create policy "Members delete calendar events" on public.calendar_events
  for delete to authenticated using (public.is_couple_member(couple_id));
grant select, insert, update, delete on public.calendar_events to authenticated;
