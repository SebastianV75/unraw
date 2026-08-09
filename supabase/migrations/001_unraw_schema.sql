-- Unraw MVP schema.
-- The OpenRouter token is expected to be encrypted by the application before
-- storage. This column is retained because the product requires it.

create extension if not exists pgcrypto;

-- Remove the workshop boilerplate when this migration follows the original
-- migration history. These tables are not part of Unraw's MVP schema.
drop table if exists public.profiles cascade;
drop table if exists public.tool_calls cascade;
drop table if exists public.ai_messages cascade;
drop table if exists public.ai_conversations cascade;
drop table if exists public.events cascade;
drop table if exists public.core_items cascade;
drop table if exists public.waitlist cascade;

drop type if exists public.project_status cascade;
drop type if exists public.task_status cascade;
drop type if exists public.idea_status cascade;
drop type if exists public.user_tier cascade;
drop type if exists public.profile_view cascade;

create type public.project_status as enum ('active', 'paused', 'completed');
create type public.task_status as enum ('pending', 'in_progress', 'done');
create type public.idea_status as enum ('new', 'evaluating', 'discarded', 'converted');
create type public.user_tier as enum ('free', 'openrouter');
create type public.profile_view as enum ('list', 'kanban');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  name                  text,
  email                 text,
  avatar_url            text,
  onboarding_completed  boolean not null default false,
  preferred_view        public.profile_view not null default 'list',
  captures_used         integer not null default 0 check (captures_used >= 0),
  captures_reset_date   date not null default (date_trunc('month', now()) + interval '1 month')::date,
  openrouter_token      text,
  openrouter_model      text not null default 'openai/gpt-4.1-nano',
  tier                  public.user_tier not null default 'free',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.profiles is 'User profile and capture-tier settings. Encrypt openrouter_token at the application layer before storage.';
comment on column public.profiles.openrouter_token is 'Application-encrypted OpenRouter access token; never store plaintext tokens.';

create table public.areas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  color       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, id)
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  area_id     uuid not null,
  name        text not null check (length(trim(name)) > 0),
  description text,
  status      public.project_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, area_id, id),
  foreign key (user_id, area_id)
    references public.areas (user_id, id) on delete cascade
);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  area_id     uuid not null,
  project_id  uuid,
  title       text not null check (length(trim(title)) > 0),
  notes       text,
  status      public.task_status not null default 'pending',
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (user_id, area_id)
    references public.areas (user_id, id) on delete cascade,
  foreign key (user_id, area_id, project_id)
    references public.projects (user_id, area_id, id)
    on delete set null (project_id)
);

create table public.ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  area_id     uuid not null,
  content     text not null check (length(trim(content)) > 0),
  status      public.idea_status not null default 'new',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (user_id, area_id)
    references public.areas (user_id, id) on delete cascade
);

create table public.second_brain (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  area_id     uuid not null,
  title       text not null check (length(trim(title)) > 0),
  content     text not null,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (user_id, area_id)
    references public.areas (user_id, id) on delete cascade
);

create index areas_user_id_created_at_idx on public.areas (user_id, created_at desc);
create index projects_user_id_area_id_created_at_idx on public.projects (user_id, area_id, created_at desc);
create index tasks_user_id_area_id_status_due_date_idx on public.tasks (user_id, area_id, status, due_date);
create index tasks_user_id_project_id_idx on public.tasks (user_id, project_id);
create index ideas_user_id_area_id_created_at_idx on public.ideas (user_id, area_id, created_at desc);
create index second_brain_user_id_area_id_created_at_idx on public.second_brain (user_id, area_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists areas_set_updated_at on public.areas;
create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists ideas_set_updated_at on public.ideas;
create trigger ideas_set_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();

drop trigger if exists second_brain_set_updated_at on public.second_brain;
create trigger second_brain_set_updated_at
  before update on public.second_brain
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.ideas enable row level security;
alter table public.second_brain enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete_own on public.profiles for delete to authenticated
  using (id = auth.uid());

create policy areas_select_own on public.areas for select to authenticated
  using (user_id = auth.uid());
create policy areas_insert_own on public.areas for insert to authenticated
  with check (user_id = auth.uid());
create policy areas_update_own on public.areas for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy areas_delete_own on public.areas for delete to authenticated
  using (user_id = auth.uid());

create policy projects_select_own on public.projects for select to authenticated
  using (user_id = auth.uid());
create policy projects_insert_own on public.projects for insert to authenticated
  with check (user_id = auth.uid());
create policy projects_update_own on public.projects for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy projects_delete_own on public.projects for delete to authenticated
  using (user_id = auth.uid());

create policy tasks_select_own on public.tasks for select to authenticated
  using (user_id = auth.uid());
create policy tasks_insert_own on public.tasks for insert to authenticated
  with check (user_id = auth.uid());
create policy tasks_update_own on public.tasks for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tasks_delete_own on public.tasks for delete to authenticated
  using (user_id = auth.uid());

create policy ideas_select_own on public.ideas for select to authenticated
  using (user_id = auth.uid());
create policy ideas_insert_own on public.ideas for insert to authenticated
  with check (user_id = auth.uid());
create policy ideas_update_own on public.ideas for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ideas_delete_own on public.ideas for delete to authenticated
  using (user_id = auth.uid());

create policy second_brain_select_own on public.second_brain for select to authenticated
  using (user_id = auth.uid());
create policy second_brain_insert_own on public.second_brain for insert to authenticated
  with check (user_id = auth.uid());
create policy second_brain_update_own on public.second_brain for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy second_brain_delete_own on public.second_brain for delete to authenticated
  using (user_id = auth.uid());
