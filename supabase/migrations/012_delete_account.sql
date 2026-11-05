-- Self-service account deletion. The partner keeps the couple; an empty couple is removed.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  my_couple_id uuid;
begin
  if auth.uid() is null then raise exception 'Необходимо войти в аккаунт.'; end if;
  select couple_id into my_couple_id from public.couple_members where user_id = auth.uid();
  delete from auth.users where id = auth.uid(); -- cascades to profile, membership, habits, moods, wishes
  if my_couple_id is not null then
    delete from public.couples c
    where c.id = my_couple_id
      and not exists (select 1 from public.couple_members m where m.couple_id = c.id);
  end if;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
