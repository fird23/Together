-- Support requests: ideas, bugs, questions. Users see only their own tickets and your replies.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  display_name text,
  kind text not null check (kind in ('idea','bug','question','other')),
  message text not null check (char_length(trim(message)) between 10 and 2000),
  meta jsonb,
  status text not null default 'new' check (status in ('new','in_progress','done','declined')),
  admin_reply text check (admin_reply is null or char_length(admin_reply) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on public.support_tickets(user_id, created_at desc);
alter table public.support_tickets enable row level security;

drop policy if exists "Users read own tickets" on public.support_tickets;
create policy "Users read own tickets" on public.support_tickets
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users create own tickets" on public.support_tickets;
create policy "Users create own tickets" on public.support_tickets
  for insert to authenticated with check (user_id = auth.uid() and status = 'new' and admin_reply is null);
grant select, insert on public.support_tickets to authenticated;

-- Spam guard: at most 5 tickets per hour per user.
create or replace function public.limit_support_tickets()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if (select count(*) from public.support_tickets
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Слишком много обращений за последний час. Попробуйте позже.';
  end if;
  return new;
end;
$$;
drop trigger if exists support_tickets_limit on public.support_tickets;
create trigger support_tickets_limit before insert on public.support_tickets
  for each row execute function public.limit_support_tickets();
