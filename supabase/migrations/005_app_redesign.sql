-- App redesign foundation: capture history and global knowledge.
-- Tasks and ideas without an area remain active Inbox items.
-- Knowledge without an area is valid global knowledge.

alter table public.second_brain
  alter column area_id drop not null;

alter table public.tasks
  add column if not exists due_at timestamptz;

alter table public.capture_batches
  add column if not exists output_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists archived_at timestamptz;

create index if not exists capture_batches_user_status_created_idx
  on public.capture_batches(user_id, status, created_at desc);

create index if not exists second_brain_user_created_at_idx
  on public.second_brain(user_id, created_at desc);

comment on column public.capture_batches.output_snapshot is
  'Reviewed AI output and assignments captured at save time for history.';
comment on column public.capture_batches.archived_at is
  'Optional archive timestamp for history management; saved batches remain visible by default.';
comment on column public.second_brain.area_id is
  'Optional context area. Null means global knowledge.';

-- PostgREST resolves RPCs by their complete argument list. Remove the old
-- seven-argument function before creating the snapshot-aware replacement.
drop function if exists public.save_capture(text, text, jsonb, jsonb, jsonb, jsonb, jsonb);

create function public.save_capture(
  p_idempotency_key text,
  p_raw_note text,
  p_tasks jsonb,
  p_ideas jsonb,
  p_second_brain jsonb,
  p_inbox jsonb,
  p_output_snapshot jsonb,
  p_approved_suggestions jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  b public.capture_batches%rowtype;
  row jsonb;
  area_ref uuid;
  project_ref uuid;
  inserted_area_id uuid;
  affected_area_ids uuid[] := '{}'::uuid[];
  result jsonb;
  ids jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  insert into public.capture_batches(
    user_id,
    idempotency_key,
    raw_note,
    output_snapshot
  )
  values (
    auth.uid(),
    p_idempotency_key,
    p_raw_note,
    coalesce(p_output_snapshot, '{}'::jsonb)
  )
  on conflict (user_id, idempotency_key) do nothing;

  select *
    into b
    from public.capture_batches
   where user_id = auth.uid()
     and idempotency_key = p_idempotency_key
   for update;

  if b.raw_note <> p_raw_note then
    raise exception 'Idempotency key was reused for another note';
  end if;

  if b.status = 'saved' then
    return b.saved_references || jsonb_build_object(
      'existing', true,
      'batch_id', b.id
    );
  end if;

  update public.capture_batches
     set output_snapshot = coalesce(p_output_snapshot, '{}'::jsonb),
         updated_at = now()
   where id = b.id;

  -- Suggestions are always explicit. Unapproved suggestions never become rows.
  for row in select * from jsonb_array_elements(p_approved_suggestions) loop
    if row->>'type' = 'new_area' then
      insert into public.areas(user_id, name)
      values (auth.uid(), row->>'name');
    elsif row->>'type' = 'new_project' then
      area_ref := nullif(row->>'area_id', '')::uuid;
      if area_ref is null
         or not exists (
           select 1 from public.areas
            where id = area_ref and user_id = auth.uid()
         ) then
        raise exception 'Invalid project area';
      end if;
      insert into public.projects(user_id, area_id, name)
      values (auth.uid(), area_ref, row->>'name');
    end if;
  end loop;

  -- Tasks require an area. Without one they remain in Inbox.
  for row in select * from jsonb_array_elements(p_tasks) loop
    area_ref := nullif(row->>'area_id', '')::uuid;
    project_ref := nullif(row->>'project_id', '')::uuid;

    if area_ref is null and row->>'suggested_new_area' is not null then
      select id into area_ref
        from public.areas
       where user_id = auth.uid()
         and lower(name) = lower(row->>'suggested_new_area')
       order by created_at desc
       limit 1;
    end if;

    if project_ref is null and row->>'suggested_new_project' is not null then
      select id into project_ref
        from public.projects
       where user_id = auth.uid()
         and area_id = area_ref
         and lower(name) = lower(row->>'suggested_new_project')
       order by created_at desc
       limit 1;
    end if;

    if area_ref is not null
       and not exists (
         select 1 from public.areas
          where id = area_ref and user_id = auth.uid()
       ) then
      raise exception 'Invalid area';
    end if;

    if project_ref is not null
       and not exists (
         select 1 from public.projects
          where id = project_ref
            and user_id = auth.uid()
            and area_id = area_ref
       ) then
      raise exception 'Invalid project';
    end if;

    if area_ref is null then
      insert into public.inbox_items(
        user_id, batch_id, kind, title, content, raw_note
      )
      values (
        auth.uid(), b.id, 'task', row->>'title', row->>'title', p_raw_note
      );
    else
          insert into public.tasks(user_id, area_id, project_id, title, status, due_date, due_at)
          values (
            auth.uid(),
            area_ref,
            project_ref,
            row->>'title',
            'pending',
            nullif(row->>'due_date', '')::date,
            nullif(row->>'due_at', '')::timestamptz
          )
      returning area_id into inserted_area_id;
      affected_area_ids := array_append(affected_area_ids, inserted_area_id);
    end if;
  end loop;

  -- Ideas require an area. Without one they remain in Inbox.
  for row in select * from jsonb_array_elements(p_ideas) loop
    area_ref := nullif(row->>'area_id', '')::uuid;

    if area_ref is null and row->>'suggested_new_area' is not null then
      select id into area_ref
        from public.areas
       where user_id = auth.uid()
         and lower(name) = lower(row->>'suggested_new_area')
       order by created_at desc
       limit 1;
    end if;

    if area_ref is null then
      insert into public.inbox_items(
        user_id, batch_id, kind, content, raw_note
      )
      values (auth.uid(), b.id, 'idea', row->>'content', p_raw_note);
    else
      insert into public.ideas(user_id, area_id, content, status)
      values (auth.uid(), area_ref, row->>'content', 'new')
      returning area_id into inserted_area_id;
      affected_area_ids := array_append(affected_area_ids, inserted_area_id);
    end if;
  end loop;

  -- Knowledge can be global. A null area_id is its intentional home.
  for row in select * from jsonb_array_elements(p_second_brain) loop
    area_ref := nullif(row->>'area_id', '')::uuid;

    if area_ref is null and row->>'suggested_new_area' is not null then
      select id into area_ref
        from public.areas
       where user_id = auth.uid()
         and lower(name) = lower(row->>'suggested_new_area')
       order by created_at desc
       limit 1;
    end if;

    if area_ref is not null
       and not exists (
         select 1 from public.areas
          where id = area_ref and user_id = auth.uid()
       ) then
      raise exception 'Invalid area';
    end if;

    insert into public.second_brain(
      user_id, area_id, title, content, tags
    )
    values (
      auth.uid(),
      area_ref,
      row->>'title',
      row->>'content',
      coalesce(array(select jsonb_array_elements_text(row->'tags')), '{}')
    );

    if area_ref is not null then
      affected_area_ids := array_append(affected_area_ids, area_ref);
    end if;
  end loop;

  for row in select * from jsonb_array_elements(p_inbox) loop
    insert into public.inbox_items(
      user_id, batch_id, kind, title, content, raw_note
    )
    values (
      auth.uid(), b.id, row->>'kind', row->>'title', row->>'content', p_raw_note
    );
  end loop;

  select coalesce(jsonb_agg(id), '[]'::jsonb)
    into ids
    from public.inbox_items
   where batch_id = b.id;

  result := jsonb_build_object(
    'batch_id', b.id,
    'affected_area_ids', coalesce(
      to_jsonb(array(
        select distinct id
          from unnest(affected_area_ids) as affected(id)
      )),
      '[]'::jsonb
    ),
    'inbox_item_ids', ids,
    'existing', false
  );

  update public.capture_batches
     set status = 'saved',
         saved_references = result,
         updated_at = now()
   where id = b.id;

  return result;
end;
$$;

revoke all on function public.save_capture(
  text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public;

grant execute on function public.save_capture(
  text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to authenticated;

-- RLS limits each row to its owner; table privileges let PostgREST and the
-- security-invoker RPC reach those policies for authenticated users.
grant select, insert, update, delete on table
  public.profiles,
  public.areas,
  public.projects,
  public.tasks,
  public.ideas,
  public.second_brain,
  public.capture_batches,
  public.inbox_items
  to authenticated;

grant usage, select on all sequences in schema public to authenticated;
