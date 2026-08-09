-- Atomically reset and reserve one free capture for the authenticated user.
create or replace function public.consume_free_capture()
returns table (allowed boolean, captures_used integer, reset_date date)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  next_reset date := (date_trunc('month', timezone('utc', now())) + interval '1 month')::date;
begin
  select * into current_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if current_profile.captures_reset_date <= timezone('utc', now())::date then
    update public.profiles
    set captures_used = 0, captures_reset_date = next_reset
    where id = auth.uid()
    returning * into current_profile;
  end if;

  if current_profile.captures_used >= 30 then
    return query select false, current_profile.captures_used, current_profile.captures_reset_date;
    return;
  end if;

  update public.profiles as profile
  set captures_used = profile.captures_used + 1
  where profile.id = auth.uid()
  returning profile.captures_used, profile.captures_reset_date into current_profile.captures_used, current_profile.captures_reset_date;

  return query select true, current_profile.captures_used, current_profile.captures_reset_date;
end;
$$;

revoke all on function public.consume_free_capture() from public;
grant execute on function public.consume_free_capture() to authenticated;
