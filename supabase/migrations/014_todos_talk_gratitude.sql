-- Stage 1: shared to-do list, "Talks" (complain / say / ask / suggest + replies), gratitude notes, realtime.

-- ---------- To-do list ----------
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  assignee_id uuid references auth.users(id) on delete set null, -- null = both
  due_day date,
  done_at timestamptz,
  done_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists todos_couple_idx on public.todos(couple_id, created_at desc);
alter table public.todos enable row level security;
drop policy if exists "Members read todos" on public.todos;
create policy "Members read todos" on public.todos for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Members add todos" on public.todos;
create policy "Members add todos" on public.todos for insert to authenticated with check (created_by = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists "Members edit todos" on public.todos;
create policy "Members edit todos" on public.todos for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists "Members delete todos" on public.todos;
create policy "Members delete todos" on public.todos for delete to authenticated using (public.is_couple_member(couple_id));
grant select, insert, update, delete on public.todos to authenticated;

-- ---------- Talks ----------
create table if not exists public.talk_threads (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('complain','say','ask','suggest')),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists talk_threads_couple_idx on public.talk_threads(couple_id, created_at desc);
alter table public.talk_threads enable row level security;
drop policy if exists "Members read threads" on public.talk_threads;
create policy "Members read threads" on public.talk_threads for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Members start threads" on public.talk_threads;
create policy "Members start threads" on public.talk_threads for insert to authenticated with check (author_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists "Authors edit threads" on public.talk_threads;
create policy "Authors edit threads" on public.talk_threads for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "Authors delete threads" on public.talk_threads;
create policy "Authors delete threads" on public.talk_threads for delete to authenticated using (author_id = auth.uid());
grant select, insert, update, delete on public.talk_threads to authenticated;

create table if not exists public.talk_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.talk_threads(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists talk_replies_thread_idx on public.talk_replies(thread_id, created_at);
alter table public.talk_replies enable row level security;
drop policy if exists "Members read replies" on public.talk_replies;
create policy "Members read replies" on public.talk_replies for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Members reply" on public.talk_replies;
create policy "Members reply" on public.talk_replies for insert to authenticated with check (
  author_id = auth.uid() and public.is_couple_member(couple_id)
  and exists (select 1 from public.talk_threads t where t.id = thread_id and t.couple_id = talk_replies.couple_id));
drop policy if exists "Authors delete replies" on public.talk_replies;
create policy "Authors delete replies" on public.talk_replies for delete to authenticated using (author_id = auth.uid());
grant select, insert, delete on public.talk_replies to authenticated;

-- ---------- Gratitude ----------
create table if not exists public.gratitude_notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  text text not null check (char_length(trim(text)) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (couple_id, user_id, day)
);
alter table public.gratitude_notes enable row level security;
drop policy if exists "Members read gratitude" on public.gratitude_notes;
create policy "Members read gratitude" on public.gratitude_notes for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Members write own gratitude" on public.gratitude_notes;
create policy "Members write own gratitude" on public.gratitude_notes for insert to authenticated with check (user_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists "Members edit own gratitude" on public.gratitude_notes;
create policy "Members edit own gratitude" on public.gratitude_notes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Members delete own gratitude" on public.gratitude_notes;
create policy "Members delete own gratitude" on public.gratitude_notes for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.gratitude_notes to authenticated;

-- ---------- Realtime: partner's changes appear without reloading ----------
do $$
declare t text;
begin
  foreach t in array array['todos','talk_threads','talk_replies','gratitude_notes','calendar_events','mood_entries','habits','habit_checkins','wishlist_items','couples','couple_members']
  loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
