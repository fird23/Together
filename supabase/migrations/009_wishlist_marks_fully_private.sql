-- Wishlist marks become fully private.
-- 1) Move old shared marks (completed_by) into private marks, then clear them.
insert into public.wishlist_private_marks (wishlist_item_id, user_id)
select id, completed_by from public.wishlist_items
where completed_by is not null and completed_by <> owner_id
on conflict do nothing;
update public.wishlist_items set completed_by = null where completed_by is not null;

-- 2) Only owners can edit their wishes; nobody can set completed_by from the client any more.
drop policy if exists "Owners or partner can update wishes" on public.wishlist_items;
drop policy if exists "Owners can update own wishes" on public.wishlist_items;
create policy "Owners can update own wishes" on public.wishlist_items
  for update to authenticated
  using (owner_id = auth.uid() and public.is_couple_member(couple_id))
  with check (owner_id = auth.uid() and public.is_couple_member(couple_id));

create or replace function public.guard_wishlist_item_update()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.completed_by is distinct from old.completed_by then
    raise exception 'Wishlist marks are private and stored separately';
  end if;
  return new;
end;
$$;
