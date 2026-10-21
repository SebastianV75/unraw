-- Run against an isolated database after all migrations, as postgres.
-- Uses Supabase's request JWT settings; rolls back all fixture data.
begin;
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'quota-test@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'other-test@example.invalid');

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';

-- Preserve the upsert used by onboarding and account settings.
insert into public.profiles (id, name, capture_preferences)
values (auth.uid(), 'Quota test', array['tasks', 'ideas'])
on conflict (id) do update set name = excluded.name,
  capture_preferences = excluded.capture_preferences;

do $$
declare usage record;
begin
  begin
    update public.profiles set captures_used = 0 where id = auth.uid();
    raise exception 'Quota update was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set captures_reset_date = current_date where id = auth.uid();
    raise exception 'Quota reset was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.profiles where id = auth.uid();
    raise exception 'Profile deletion was allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.profiles(id, captures_used) values(auth.uid(), 0);
    raise exception 'Quota insert was allowed';
  exception when insufficient_privilege then null;
  end;

  for i in 1..30 loop
    select * into usage from public.consume_free_capture();
    if not usage.allowed or usage.captures_used <> i then
      raise exception 'Capture reservation failed at %', i;
    end if;
  end loop;
  select * into usage from public.consume_free_capture();
  if usage.allowed or usage.captures_used <> 30 then
    raise exception 'Quota limit was bypassed';
  end if;
end;
$$;

reset role;
do $$
begin
  if (select captures_used from public.profiles
      where id = '10000000-0000-4000-8000-000000000002') <> 0 then
    raise exception 'Another user quota was modified';
  end if;
end;
$$;

set local role service_role;
select public.refund_free_capture('10000000-0000-4000-8000-000000000001');
reset role;
do $$
begin
  if (select captures_used from public.profiles
      where id = '10000000-0000-4000-8000-000000000001') <> 29 then
    raise exception 'Service-role refund failed';
  end if;
end;
$$;
rollback;
