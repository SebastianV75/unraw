-- Bounded, tenant-scoped lexical retrieval for capture assignment.
-- This is deliberately separate from unified_search: it never falls back to a catalog.
create or replace function public.capture_candidate_retrieval(
  p_queries text[],
  p_area_limit integer default 8,
  p_project_limit integer default 12
)
returns table (
  kind text,
  id uuid,
  name text,
  area_id uuid,
  area_name text,
  score numeric
)
language plpgsql
security invoker
set search_path = pg_catalog, public, extensions
as $$
declare
  v_query text;
  v_ordinal bigint;
begin
  if auth.uid() is null or coalesce(auth.role(), '') <> 'authenticated' then
    raise exception 'Authentication is required';
  end if;

  -- These guards deliberately precede RETURN QUERY: cardinality must be checked
  -- before unnest/normalization, and malformed input must not reach ranking.
  if cardinality(p_queries) > 8 then
    raise exception using errcode = '22023', message = 'Too many capture candidate queries';
  end if;
  if p_queries is not null then
    for v_query, v_ordinal in
      select input.query, input.ordinality
      from unnest(p_queries) with ordinality as input(query, ordinality)
      order by input.ordinality
    loop
      if v_query is null
         or position('00' in encode(convert_to(v_query, 'UTF8'), 'hex')) > 0
         or length(v_query) > 200
         or length(public.normalize_unified_search_text(v_query)) < 2 then
        raise exception using errcode = '22023', message = 'Invalid capture candidate query';
      end if;
    end loop;
  end if;

  return query
  with
  bounded as (
    select least(greatest(coalesce(p_area_limit, 8), 0), 32) as area_limit,
           least(greatest(coalesce(p_project_limit, 12), 0), 48) as project_limit
  ),
  request_input as (
    select public.normalize_unified_search_text(input.query) as query,
           input.ordinality
    from unnest(coalesce(p_queries, '{}'::text[])) with ordinality as input(query, ordinality)
  ),
  -- DISTINCT ON plus ordinal preserves the first occurrence of each normalized query.
  request as (
    select distinct on (query) query, ordinality
    from request_input
    order by query, ordinality
  ),
  area_matches as (
    select a.id, a.name, r.query,
      case
        when a.search_text = r.query then 100::numeric
        when left(a.search_text, length(r.query)) = r.query then 80::numeric
        -- Phrase queries may contain surrounding note words; retain an entity-name hit.
        when position(a.search_text in r.query) > 0 then 75::numeric
        else round((50 + (extensions.similarity(a.search_text, r.query) * 20))::numeric, 4)
      end as score
    from public.areas a
    cross join request r
          where a.user_id = auth.uid()
          and (a.search_text = r.query
            or left(a.search_text, length(r.query)) = r.query
            -- Containment is an independent 75-point match, even when trigram
            -- similarity is below the fuzzy threshold.
            or position(a.search_text in r.query) > 0
            or extensions.similarity(a.search_text, r.query) >= 0.25)
  ),
  area_per_query as (
    select am.*, row_number() over (
      partition by am.query order by am.score desc, lower(am.name), am.id
    ) as query_rank
    from area_matches am
  ),
  project_matches as (
    select p.id, p.name, p.area_id, a.name as area_name, r.query,
      case
        when p.search_text = r.query then 100::numeric
        when left(p.search_text, length(r.query)) = r.query then 80::numeric
        when position(p.search_text in r.query) > 0 then 75::numeric
        else round((50 + (extensions.similarity(p.search_text, r.query) * 20))::numeric, 4)
      end as score
    from public.projects p
    join public.areas a
      on a.id = p.area_id and a.user_id = auth.uid()
    cross join request r
    where p.user_id = auth.uid()
      and p.status = 'active'
      and (p.search_text = r.query
        or left(p.search_text, length(r.query)) = r.query
        -- Containment is an independent 75-point match, even when trigram
        -- similarity is below the fuzzy threshold.
        or position(p.search_text in r.query) > 0
        or extensions.similarity(p.search_text, r.query) >= 0.25)
  ),
  project_per_query as (
    select pm.*, row_number() over (
      partition by pm.query order by pm.score desc, lower(pm.name), pm.id
    ) as query_rank
    from project_matches pm
  ),
  deduped_projects as (
    select pm.id, pm.name, pm.area_id, pm.area_name, max(pm.score) as score
    from project_per_query pm
    where pm.query_rank <= 48
    group by pm.id, pm.name, pm.area_id, pm.area_name
  ),
  ranked_projects as (
    select dp.*, row_number() over (
      order by dp.score desc, lower(dp.name), dp.id
    ) as global_rank
    from deduped_projects dp
  ),
  direct_areas as (
    select ap.id, ap.name, ap.score
    from area_per_query ap
    where ap.query_rank <= 32
  ),
  parent_areas as (
    select a.id, a.name, max(rp.score - 1) as score
    from ranked_projects rp
    join public.areas a on a.id = rp.area_id and a.user_id = auth.uid()
    cross join bounded b
    where rp.global_rank <= b.project_limit
    group by a.id, a.name
  ),
  all_areas as (
    select da.id, da.name, da.score from direct_areas da
    union all
    select pa.id, pa.name, pa.score from parent_areas pa
  ),
  deduped_areas as (
    select aa.id, max(aa.name) as name, max(aa.score) as score
    from all_areas aa
    group by aa.id
  ),
  ranked_areas as (
    select da.*, row_number() over (
      order by da.score desc, lower(da.name), da.id
    ) as global_rank
    from deduped_areas da
  )
  select results.kind, results.id, results.name, results.area_id, results.area_name, results.score
  from (
    select 'area'::text as kind, ra.id, ra.name, null::uuid as area_id,
           null::text as area_name, ra.score
    from ranked_areas ra
    cross join bounded b
    where ra.global_rank <= b.area_limit
    union all
    select 'project'::text, rp.id, rp.name, rp.area_id, rp.area_name, rp.score
    from ranked_projects rp
    cross join bounded b
    where rp.global_rank <= b.project_limit
  ) as results
  order by case when results.kind = 'area' then 0 else 1 end,
           results.score desc, lower(results.name), results.id;
end;
$$;

revoke all on function public.capture_candidate_retrieval(text[], integer, integer)
  from public, anon, authenticated;
grant execute on function public.capture_candidate_retrieval(text[], integer, integer)
  to authenticated;
