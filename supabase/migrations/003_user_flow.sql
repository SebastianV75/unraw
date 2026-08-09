-- Capture persistence foundation. Deploy before the capture save route.
alter table public.profiles add column if not exists capture_preferences text[];
alter table public.profiles add column if not exists onboarding_draft jsonb not null default '{}'::jsonb;
alter table public.profiles add constraint profiles_capture_preferences_check
  check (capture_preferences is null or capture_preferences <@ array['tasks','ideas','knowledge']::text[]);
create table if not exists public.capture_batches (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null, raw_note text not null, status text not null default 'pending' check (status in ('pending','saved')),
  saved_references jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, idempotency_key)
);
create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references public.capture_batches(id) on delete cascade, kind text not null, title text, content text not null,
  raw_note text not null, needs_home boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists capture_batches_user_created_idx on public.capture_batches(user_id, created_at desc);
create index if not exists inbox_items_user_home_idx on public.inbox_items(user_id, needs_home, created_at desc);
alter table public.capture_batches enable row level security;
alter table public.inbox_items enable row level security;
create policy capture_batches_own on public.capture_batches for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy inbox_items_own on public.inbox_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The route supplies reviewed output. This function owns the transaction and locks retries.
create or replace function public.save_capture(p_idempotency_key text, p_raw_note text, p_tasks jsonb, p_ideas jsonb, p_second_brain jsonb, p_inbox jsonb, p_approved_suggestions jsonb default '[]'::jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare b public.capture_batches%rowtype; row jsonb; area_ref uuid; project_ref uuid; inserted_area_id uuid; affected_area_ids uuid[] := '{}'::uuid[]; result jsonb; ids jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  insert into public.capture_batches(user_id,idempotency_key,raw_note) values(auth.uid(),p_idempotency_key,p_raw_note) on conflict (user_id,idempotency_key) do nothing;
  select * into b from public.capture_batches where user_id=auth.uid() and idempotency_key=p_idempotency_key for update;
  if b.raw_note <> p_raw_note then raise exception 'Idempotency key was reused for another note'; end if;
  if b.status = 'saved' then return b.saved_references || jsonb_build_object('existing',true,'batch_id',b.id); end if;
  -- Approved suggestions are deliberately explicit; unapproved suggestions never become rows.
  for row in select * from jsonb_array_elements(p_approved_suggestions) loop
    if row->>'type' = 'new_area' then insert into public.areas(user_id,name) values(auth.uid(),row->>'name');
    elsif row->>'type' = 'new_project' then area_ref := nullif(row->>'area_id','')::uuid; if area_ref is null or not exists(select 1 from public.areas where id=area_ref and user_id=auth.uid()) then raise exception 'Invalid project area'; end if; insert into public.projects(user_id,area_id,name) values(auth.uid(),area_ref,row->>'name'); end if;
  end loop;
  for row in select * from jsonb_array_elements(p_tasks) loop
    area_ref := nullif(row->>'area_id','')::uuid; project_ref := nullif(row->>'project_id','')::uuid;
    if area_ref is null and row->>'suggested_new_area' is not null then select id into area_ref from public.areas where user_id=auth.uid() and lower(name)=lower(row->>'suggested_new_area') order by created_at desc limit 1; end if;
    if project_ref is null and row->>'suggested_new_project' is not null then select id into project_ref from public.projects where user_id=auth.uid() and area_id=area_ref and lower(name)=lower(row->>'suggested_new_project') order by created_at desc limit 1; end if;
    if area_ref is not null and not exists(select 1 from public.areas where id=area_ref and user_id=auth.uid()) then raise exception 'Invalid area'; end if;
    if project_ref is not null and not exists(select 1 from public.projects where id=project_ref and user_id=auth.uid() and area_id=area_ref) then raise exception 'Invalid project'; end if;
    if area_ref is null then insert into public.inbox_items(user_id,batch_id,kind,title,content,raw_note) values(auth.uid(),b.id,'task',row->>'title',row->>'title',p_raw_note); else insert into public.tasks(user_id,area_id,project_id,title,status) values(auth.uid(),area_ref,project_ref,row->>'title','pending') returning area_id into inserted_area_id; affected_area_ids := array_append(affected_area_ids, inserted_area_id); end if;
  end loop;
    for row in select * from jsonb_array_elements(p_ideas) loop
     area_ref := nullif(row->>'area_id','')::uuid; if area_ref is null and row->>'suggested_new_area' is not null then select id into area_ref from public.areas where user_id=auth.uid() and lower(name)=lower(row->>'suggested_new_area') order by created_at desc limit 1; end if; if area_ref is null then insert into public.inbox_items(user_id,batch_id,kind,content,raw_note) values(auth.uid(),b.id,'idea',row->>'content',p_raw_note); else insert into public.ideas(user_id,area_id,content,status) values(auth.uid(),area_ref,row->>'content','new') returning area_id into inserted_area_id; affected_area_ids := array_append(affected_area_ids, inserted_area_id); end if;
  end loop;
    for row in select * from jsonb_array_elements(p_second_brain) loop
     area_ref := nullif(row->>'area_id','')::uuid; if area_ref is null and row->>'suggested_new_area' is not null then select id into area_ref from public.areas where user_id=auth.uid() and lower(name)=lower(row->>'suggested_new_area') order by created_at desc limit 1; end if; if area_ref is null then insert into public.inbox_items(user_id,batch_id,kind,title,content,raw_note) values(auth.uid(),b.id,'knowledge',row->>'title',row->>'content',p_raw_note); else insert into public.second_brain(user_id,area_id,title,content,tags) values(auth.uid(),area_ref,row->>'title',row->>'content',coalesce(array(select jsonb_array_elements_text(row->'tags')),'{}')) returning area_id into inserted_area_id; affected_area_ids := array_append(affected_area_ids, inserted_area_id); end if;
  end loop;
  for row in select * from jsonb_array_elements(p_inbox) loop insert into public.inbox_items(user_id,batch_id,kind,title,content,raw_note) values(auth.uid(),b.id,row->>'kind',row->>'title',row->>'content',p_raw_note); end loop;
  select coalesce(jsonb_agg(id),'[]'::jsonb) into ids from public.inbox_items where batch_id=b.id;
   result := jsonb_build_object('batch_id',b.id,'affected_area_ids',coalesce(to_jsonb(array(select distinct id from unnest(affected_area_ids) as affected(id))),'[]'::jsonb),'inbox_item_ids',ids,'existing',false);
  update public.capture_batches set status='saved',saved_references=result,updated_at=now() where id=b.id; return result;
end; $$;
revoke all on function public.save_capture(text,text,jsonb,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.save_capture(text,text,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.refund_free_capture()
returns void language sql security invoker set search_path = public as $$
  update public.profiles set captures_used = greatest(captures_used - 1, 0)
  where id = auth.uid() and tier = 'free' and captures_used > 0;
$$;
revoke all on function public.refund_free_capture() from public;
grant execute on function public.refund_free_capture() to authenticated;

create or replace function public.reassign_inbox_item(p_item_id uuid, p_area_id uuid, p_project_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare item public.inbox_items%rowtype; new_id uuid;
begin
  select * into item from public.inbox_items where id=p_item_id and user_id=auth.uid() and needs_home for update;
  if item.id is null or not exists(select 1 from public.areas where id=p_area_id and user_id=auth.uid()) or (p_project_id is not null and not exists(select 1 from public.projects where id=p_project_id and area_id=p_area_id and user_id=auth.uid())) then raise exception 'Inbox item, area, or project not found'; end if;
  if item.kind='task' then insert into public.tasks(user_id,area_id,project_id,title,status) values(auth.uid(),p_area_id,p_project_id,coalesce(item.title,item.content),'pending') returning id into new_id;
  elsif item.kind='idea' then insert into public.ideas(user_id,area_id,content,status) values(auth.uid(),p_area_id,item.content,'new') returning id into new_id;
  else insert into public.second_brain(user_id,area_id,title,content) values(auth.uid(),p_area_id,coalesce(item.title,'Captured knowledge'),item.content) returning id into new_id; end if;
  delete from public.inbox_items where id=item.id; return jsonb_build_object('id',new_id,'kind',item.kind);
end; $$;
revoke all on function public.reassign_inbox_item(uuid,uuid,uuid) from public;
grant execute on function public.reassign_inbox_item(uuid,uuid,uuid) to authenticated;
