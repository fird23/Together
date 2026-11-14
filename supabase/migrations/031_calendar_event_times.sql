-- Время у событий календаря: недельный вид показывает их блоками по часам.
-- Событие без времени остаётся пометкой на весь день, как раньше.
alter table public.calendar_events add column if not exists start_time time;
alter table public.calendar_events add column if not exists end_time time;

-- Событие со временем укладывается в один день: конец позже начала.
alter table public.calendar_events drop constraint if exists calendar_events_time_check;
alter table public.calendar_events add constraint calendar_events_time_check check (
  (start_time is null and end_time is null)
  or (start_time is not null and end_time is not null and end_time > start_time and start_day = end_day)
);
