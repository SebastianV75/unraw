-- Public waitlist signups. The API validates and normalizes email addresses before insert.
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz not null default now(),
  constraint waitlist_email_normalized check (
    email = lower(btrim(email))
    and length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  )
);

create unique index if not exists waitlist_email_unique_idx on public.waitlist (email);
create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

revoke all on table public.waitlist from anon, authenticated;
grant insert on table public.waitlist to anon, authenticated;

drop policy if exists waitlist_insert_public on public.waitlist;
create policy waitlist_insert_public
  on public.waitlist
  for insert
  to anon, authenticated
  with check (
    email = lower(btrim(email))
    and length(email) between 3 and 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );
