-- Порядок дел: ручное перетаскивание. Меньше число — выше в списке.
-- Новые дела по умолчанию попадают наверх (отрицательное время создания), как и раньше.
alter table public.todos add column if not exists sort_order double precision;
update public.todos set sort_order = -extract(epoch from created_at)::double precision where sort_order is null;
alter table public.todos alter column sort_order set default (-extract(epoch from clock_timestamp())::double precision);
alter table public.todos alter column sort_order set not null;
