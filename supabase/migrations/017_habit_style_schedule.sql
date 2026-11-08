-- Stage B: habit color, icon and schedule ("every day", "specific weekdays", "N times a week").
alter table public.habits add column if not exists color text
  check (color is null or color in ('rose','amber','green','blue','violet','orange','teal','gray'));
alter table public.habits add column if not exists icon text
  check (icon is null or char_length(icon) <= 24);
-- ISO weekdays: 1 = Monday ... 7 = Sunday. NULL = no weekday restriction.
alter table public.habits add column if not exists week_days smallint[]
  check (week_days is null or (array_length(week_days, 1) between 1 and 7 and week_days <@ array[1,2,3,4,5,6,7]::smallint[]));
alter table public.habits add column if not exists per_week smallint
  check (per_week is null or per_week between 1 and 7);
alter table public.habits drop constraint if exists habits_schedule_one;
alter table public.habits add constraint habits_schedule_one check (week_days is null or per_week is null);
