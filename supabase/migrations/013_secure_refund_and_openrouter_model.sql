-- Secure the refund boundary and align the OpenRouter model default.
-- This is a forward migration: 003_user_flow.sql remains unchanged.

drop function if exists public.refund_free_capture();

create or replace function public.refund_free_capture(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set captures_used = greatest(captures_used - 1, 0)
  where id = p_user_id
    and tier = 'free'
    and captures_used > 0;
$$;

revoke all on function public.refund_free_capture(uuid) from public, anon, authenticated;
grant execute on function public.refund_free_capture(uuid) to service_role;

alter table public.profiles
  alter column openrouter_model set default 'openai/gpt-5-nano';

update public.profiles
set openrouter_model = 'openai/gpt-5-nano'
where tier = 'free'
  and (openrouter_model is null or openrouter_model = 'openai/gpt-4.1-nano');
