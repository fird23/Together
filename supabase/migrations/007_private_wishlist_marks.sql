-- Private completion marks: each member can see only their own mark.
create table if not exists public.wishlist_private_marks (
  wishlist_item_id uuid not null references public.wishlist_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wishlist_item_id, user_id)
);
alter table public.wishlist_private_marks enable row level security;
drop policy if exists "Users read own private wishlist marks" on public.wishlist_private_marks;
create policy "Users read own private wishlist marks" on public.wishlist_private_marks
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Members add own private wishlist marks" on public.wishlist_private_marks;
create policy "Members add own private wishlist marks" on public.wishlist_private_marks
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.wishlist_items wi
      where wi.id = wishlist_item_id
        and wi.owner_id <> auth.uid()
        and public.is_couple_member(wi.couple_id)
    )
  );
drop policy if exists "Users remove own private wishlist marks" on public.wishlist_private_marks;
create policy "Users remove own private wishlist marks" on public.wishlist_private_marks
  for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.wishlist_private_marks to authenticated;
