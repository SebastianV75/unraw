-- Normalize legacy rows before enforcing the stricter contract.
create or replace function public.valid_capture_preferences(preferences text[])
returns boolean
language sql
immutable
as $$
  select preferences is null
    or (
      cardinality(preferences) between 1 and 3
      and preferences <@ array['tasks','ideas','knowledge']::text[]
      and (select count(*) from unnest(preferences)) =
          (select count(distinct item) from unnest(preferences) as items(item))
    );
$$;

update public.profiles
set capture_preferences = array['tasks', 'ideas']::text[]
where capture_preferences is null
   or not public.valid_capture_preferences(capture_preferences);

alter table public.profiles
  drop constraint if exists profiles_capture_preferences_check;
alter table public.profiles
  add constraint profiles_capture_preferences_check
  check (public.valid_capture_preferences(capture_preferences));

alter table public.profiles
  alter column capture_preferences set default array['tasks', 'ideas']::text[];
