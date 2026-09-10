-- Harden audited functions and add indexes for foreign-key lookups.
-- Function changes are transactional; concurrent indexes must run outside a transaction.
begin;

alter function public.handle_new_user()
  set search_path = '';
alter function public.set_updated_at()
  set search_path = '';
alter function public.refund_free_capture(uuid)
  set search_path = '';

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.refund_free_capture(uuid) from public, anon, authenticated;
grant execute on function public.refund_free_capture(uuid) to service_role;

commit;

create index concurrently if not exists inbox_items_batch_id_idx
  on public.inbox_items (batch_id);
create index concurrently if not exists tasks_user_id_area_id_project_id_idx
  on public.tasks (user_id, area_id, project_id);
