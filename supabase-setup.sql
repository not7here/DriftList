create table if not exists public.lists (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.tasks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid not null references public.lists(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.lists enable row level security;
alter table public.tasks enable row level security;

grant select, insert, update, delete on public.lists to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

drop policy if exists "Users manage own lists" on public.lists;
create policy "Users manage own lists" on public.lists
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own tasks" on public.tasks;
create policy "Users manage own tasks" on public.tasks
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists lists_user_id_idx on public.lists(user_id);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_list_id_idx on public.tasks(list_id);

-- DriftList 1.1 feature columns. Safe to run on existing projects.
alter table public.lists add column if not exists color text not null default 'teal';
alter table public.tasks add column if not exists priority boolean not null default false;
alter table public.tasks add column if not exists reminder_at timestamptz;
alter table public.tasks add column if not exists reminder_notified boolean not null default false;
