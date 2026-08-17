-- Unified, user-scoped search for areas, projects, tasks, ideas and knowledge.
-- The function is SECURITY INVOKER so table RLS remains in effect for every call.

create extension if not exists unaccent with schema extensions;
create or replace function public.normalize_unified_search_text(value text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select lower(extensions.unaccent(trim(coalesce(value, ''))));
$$;
create or replace function public.unified_search(
  p_query text,
  p_mode text default 'compact'
)
returns table (
  id uuid,
  kind text,
  label text,
  title text,
  context text,
  snippet text,
  highlight_ranges jsonb,
  due_date date,
  href text,
  score integer,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_query text := public.normalize_unified_search_text(p_query);
  v_tokens text[];
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if p_query is null or length(trim(p_query)) = 0 or length(p_query) > 200 then
    raise exception 'Search query must contain between 1 and 200 characters';
  end if;

  if p_mode not in ('compact', 'all') then
    raise exception 'Search mode must be compact or all';
  end if;

  v_tokens := regexp_split_to_array(v_query, '\s+');

  return query
  with candidates as (
    select
      a.id,
      'area'::text as kind,
      'Área'::text as label,
      a.name as title,
      null::text as context,
      null::text as snippet,
      a.name as title_text,
      ''::text as content_text,
      null::date as due_date,
      '/areas/' || a.id as href,
      0 as status_bonus,
      a.updated_at
    from public.areas a
    where a.user_id = auth.uid()

    union all

    select
      p.id,
      'project',
      'Proyecto',
      p.name,
      a.name,
      null,
      p.name,
      ''::text,
      null::date,
      '/areas/' || p.area_id || '/projects/' || p.id,
      case p.status when 'active' then 10 when 'paused' then 5 else 0 end,
      p.updated_at
    from public.projects p
    join public.areas a on a.id = p.area_id and a.user_id = auth.uid()
    where p.user_id = auth.uid()

    union all

    select
      t.id,
      'task',
      'Tarea',
      t.title,
      concat_ws(' / ', a.name, p.name),
      nullif(left(regexp_replace(coalesce(t.notes, ''), '\s+', ' ', 'g'), 180), ''),
      t.title,
      coalesce(t.notes, ''),
      t.due_date,
      case
        when t.project_id is not null then '/areas/' || t.area_id || '/projects/' || t.project_id
        else '/areas/' || t.area_id
      end,
      0,
      t.updated_at
    from public.tasks t
    join public.areas a on a.id = t.area_id and a.user_id = auth.uid()
    left join public.projects p on p.id = t.project_id and p.user_id = auth.uid()
    where t.user_id = auth.uid()

    union all

    select
      i.id,
      'idea',
      'Idea',
      left(regexp_replace(i.content, '\s+', ' ', 'g'), 120),
      a.name,
      left(regexp_replace(i.content, '\s+', ' ', 'g'), 180),
      ''::text,
      i.content,
      null::date,
      '/areas/' || i.area_id,
      0,
      i.updated_at
    from public.ideas i
    join public.areas a on a.id = i.area_id and a.user_id = auth.uid()
    where i.user_id = auth.uid()

    union all

    select
      s.id,
      'knowledge',
      'Conocimiento',
      s.title,
      coalesce(a.name, 'Conocimiento global'),
      nullif(left(regexp_replace(s.content, '\s+', ' ', 'g'), 180), ''),
      s.title,
      s.content,
      null::date,
      '/second-brain/' || s.id,
      0,
      s.updated_at
    from public.second_brain s
    left join public.areas a on a.id = s.area_id and a.user_id = auth.uid()
    where s.user_id = auth.uid()
  ), normalized as (
    select
      candidates.*,
      public.normalize_unified_search_text(title_text) as normalized_title,
      public.normalize_unified_search_text(content_text) as normalized_content,
      public.normalize_unified_search_text(
        concat_ws(' ', title_text, content_text, coalesce(due_date::text, ''))
      ) as normalized_searchable
    from candidates
  ), ranked as (
    select
      normalized.*,
      case
        when normalized_title = v_query then 100
        when normalized_title like v_query || '%' then 85
        when not exists (
          select 1 from unnest(v_tokens) token
          where normalized_title not like '%' || token || '%'
        ) then 70
        when not exists (
          select 1 from unnest(v_tokens) token
          where normalized_content not like '%' || token || '%'
        ) then 45
        when due_date::text = v_query then 40
        else 0
      end + status_bonus as score
    from normalized
    where not exists (
      select 1 from unnest(v_tokens) token
      where normalized_searchable not like '%' || token || '%'
    )
  )
  select
    id,
    kind,
    label,
    title,
    context,
    snippet,
    '[]'::jsonb as highlight_ranges,
    due_date,
    href,
    score,
    updated_at
  from ranked
  order by score desc, updated_at desc, id
  limit case when p_mode = 'compact' then 8 else null end;
end;
$$;
comment on function public.unified_search(text, text) is
  'Returns unified search rows scoped to auth.uid(); callers must use the authenticated Supabase client.';
