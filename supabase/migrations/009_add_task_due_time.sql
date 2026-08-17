-- The remote tasks table was missing the due_at column expected by the
-- capture and Inbox RPCs. Keep this idempotent for environments that already
-- have the column from the original redesign migration.
alter table public.tasks
  add column if not exists due_at timestamptz;
