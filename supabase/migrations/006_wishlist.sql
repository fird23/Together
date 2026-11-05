-- Shared couple wishlists. Each member owns their own items; the partner can mark an item as fulfilled.
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  details text check (details is null or char_length(details) <= 240),
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wishlist_items_couple_created_idx on public.wishlist_items(couple_id, created_at desc);
alter table public.wishlist_items enable row level security;
drop policy if exists "Couple members can read wishlists" on public.wishlist_items;
create policy "Couple members can read wishlists" on public.wishlist_items for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists "Members can add own wishes" on public.wishlist_items;
create policy "Members can add own wishes" on public.wishlist_items for insert to authenticated with check (owner_id = auth.uid() and completed_by is null and public.is_couple_member(couple_id));
drop policy if exists "Owners or partner can update wishes" on public.wishlist_items;
create policy "Owners or partner can update wishes" on public.wishlist_items for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists "Owners can delete own wishes" on public.wishlist_items;
create policy "Owners can delete own wishes" on public.wishlist_items for delete to authenticated using (owner_id = auth.uid() and public.is_couple_member(couple_id));
grant select, insert, update, delete on public.wishlist_items to authenticated;

-- A partner may only set/clear the completion marker; only the owner edits item text.
create or replace function public.guard_wishlist_item_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() <> old.owner_id then
    if new.id is distinct from old.id
      or new.couple_id is distinct from old.couple_id
      or new.owner_id is distinct from old.owner_id
      or new.title is distinct from old.title
      or new.details is distinct from old.details
      or new.created_at is distinct from old.created_at
      or (new.completed_by is not null and new.completed_by <> auth.uid()) then
      raise exception 'Partners can only mark a wish as fulfilled';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists wishlist_item_update_guard on public.wishlist_items;
create trigger wishlist_item_update_guard before update on public.wishlist_items
for each row execute function public.guard_wishlist_item_update();
