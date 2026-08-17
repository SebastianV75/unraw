-- Harden the existing unified search RPC while preserving its row contract.
-- Search remains invoker-owned and only exposes the five supported entities.
drop function if exists public.unified_search(text, text);
drop function if exists public.unified_search(text, date, integer);

create or replace function public.unified_search(
  p_query text,
  p_due_date date default null,
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
set search_path = pg_catalog, public, extensions
as $$
declare
  v_query text := public.normalize_unified_search_text(p_query);
  v_tokens text[];
begin
  if auth.uid() is null or coalesce(auth.role(), '') <> 'authenticated' then
    raise exception 'Authentication is required';
  end if;

  if p_query is null or length(trim(p_query)) = 0 then
    if p_due_date is null then
      raise exception 'Search query or due date is required';
    end if;
  elsif length(p_query) > 200 then
    raise exception 'Search query must contain at most 200 characters';
  end if;

  if p_mode is null or p_mode not in ('compact', 'all') then
    raise exception 'Search mode must be compact or all';
  end if;

  v_tokens := case
    when v_query = '' then '{}'::text[]
    else regexp_split_to_array(v_query, '\s+')
  end;

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
      0::integer as status_bonus,
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
      null::text,
      p.name,
      ''::text,
      null::date,
      '/areas/' || p.area_id || '/projects/' || p.id,
      case p.status
        when 'active' then 10
        when 'paused' then 5
        else 0
      end::integer,
      p.updated_at
    from public.projects p
    join public.areas a
      on a.id = p.area_id
     and a.user_id = auth.uid()
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
      0::integer,
      t.updated_at
    from public.tasks t
    join public.areas a
      on a.id = t.area_id
     and a.user_id = auth.uid()
    left join public.projects p
      on p.id = t.project_id
     and p.user_id = auth.uid()
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
      0::integer,
      i.updated_at
    from public.ideas i
    join public.areas a
      on a.id = i.area_id
     and a.user_id = auth.uid()
    where i.user_id = auth.uid()

    union all

    select
      s.id,
      'knowledge',
      'Conocimiento',
      s.title,
      coalesce(a.name, 'Conocimiento global'),
      nullif(left(regexp_replace(coalesce(s.content, ''), '\s+', ' ', 'g'), 180), ''),
      s.title,
      s.content,
      null::date,
      '/second-brain/' || s.id,
      0::integer,
      s.updated_at
    from public.second_brain s
    left join public.areas a
      on a.id = s.area_id
     and a.user_id = auth.uid()
    where s.user_id = auth.uid()
  ), normalized as (
    select
      candidates.*,
      public.normalize_unified_search_text(title_text) as normalized_title,
      public.normalize_unified_search_text(content_text) as normalized_content,
      public.normalize_unified_search_text(
        concat_ws(' ', title_text, content_text)
      ) as normalized_searchable
    from candidates
  ), ranked as (
    select
      normalized.*,
      (
        case
          when v_query <> '' and normalized_title = v_query then 100
          when v_query <> '' and strpos(normalized_title, v_query) = 1 then 85
          when v_query <> '' and (
            select count(*)
            from unnest(v_tokens) token
            where strpos(normalized_title, token) > 0
          ) = cardinality(v_tokens) then 70
          when v_query <> '' and (
            select count(*)
            from unnest(v_tokens) token
            where strpos(normalized_content, token) > 0
          ) = cardinality(v_tokens) then 45
          else 0
        end
        + status_bonus
        + case
            when kind = 'task'
             and p_due_date is not null
             and due_date = p_due_date then 40
            else 0
          end
      )::integer as score
    from normalized
    where (
      (
        v_query = ''
        and p_due_date is not null
        and kind = 'task'
        and due_date = p_due_date
      )
      or (
        v_query <> ''
        and (
          select count(*)
          from unnest(v_tokens) token
          where strpos(normalized_searchable, token) > 0
        ) = cardinality(v_tokens)
      )
    )
  )
  select
    ranked.id,
    ranked.kind,
    ranked.label,
    ranked.title,
    ranked.context,
    ranked.snippet,
    '[]'::jsonb as highlight_ranges,
    ranked.due_date,
    ranked.href,
    ranked.score,
    ranked.updated_at
  from ranked
  order by ranked.score desc, ranked.updated_at desc, ranked.id
  limit case when p_mode = 'compact' then 8 else null end;
end;
$$;

revoke all on function public.unified_search(text, date, text) from public, anon, service_role;
grant execute on function public.unified_search(text, date, text) to authenticated;

comment on function public.unified_search(text, date, text) is
  'Returns owner-scoped unified search rows for authenticated callers.';
