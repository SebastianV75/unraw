-- RLS restricts rows, but does not protect quota columns within an owned row.
-- Keep profile upserts used by onboarding/settings and reserve quota writes for
-- the atomic RPC and service-role refunds. Account deletion uses Auth admin.
begin;

revoke insert, update, delete, truncate on public.profiles from public, anon, authenticated;
revoke insert (captures_used, captures_reset_date),
       update (captures_used, captures_reset_date)
  on public.profiles from public, anon, authenticated;

grant insert (
  id, name, email, avatar_url, onboarding_completed, preferred_view,
  openrouter_token, openrouter_model, tier, capture_preferences, onboarding_draft
) on public.profiles to authenticated;
grant update (
  id, name, email, avatar_url, onboarding_completed, preferred_view,
  openrouter_token, openrouter_model, tier, capture_preferences, onboarding_draft
) on public.profiles to authenticated;

-- The function uses auth.uid() for every read/write and accepts no user ID.
-- Definer privileges allow it to increment the now-protected quota columns.
alter function public.consume_free_capture() security definer;
alter function public.consume_free_capture() set search_path = '';
revoke all on function public.consume_free_capture() from public, anon;
grant execute on function public.consume_free_capture() to authenticated;

commit;
