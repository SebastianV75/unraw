-- save_capture resolves suggested names once per output item. Match both the
-- equality filters and newest-row ordering so these lookups avoid rescanning
-- every area/project owned by the user. Run outside a transaction, as in 016.
create index concurrently if not exists areas_user_lower_name_created_idx
  on public.areas (user_id, lower(name), created_at desc);
create index concurrently if not exists projects_user_area_lower_name_created_idx
  on public.projects (user_id, area_id, lower(name), created_at desc);
