-- Akol family sync: run this once in your Supabase project (Dashboard → SQL Editor → New query → Run).
-- Also turn on Authentication → Sign In / Providers → "Allow anonymous sign-ins".
--
-- Model: a household (one family) has members (one per phone, signed in anonymously), one shared
-- plan (family, routines, tasks as JSON) and many ticks (one row per task per day). Phones join a
-- household with its 6-character family code. Row-level security lets a phone see only its own
-- household.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null default auth.uid(),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.household_plan (
  household_id uuid primary key references public.households (id) on delete cascade,
  plan jsonb not null,
  updated_at bigint not null,
  updated_by uuid default auth.uid()
);

create table if not exists public.household_ticks (
  household_id uuid not null references public.households (id) on delete cascade,
  day text not null,
  task_id text not null,
  done boolean not null,
  at bigint not null,
  updated_by uuid default auth.uid(),
  primary key (household_id, day, task_id)
);

create index if not exists household_ticks_recent on public.household_ticks (household_id, day);

-- Is the signed-in phone part of this household?
create or replace function public.is_household_member(h uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from household_members where household_id = h and user_id = auth.uid());
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_plan enable row level security;
alter table public.household_ticks enable row level security;

drop policy if exists "members read their household" on public.households;
create policy "members read their household" on public.households
  for select using (public.is_household_member(id));

drop policy if exists "members read membership" on public.household_members;
create policy "members read membership" on public.household_members
  for select using (public.is_household_member(household_id));

drop policy if exists "members leave" on public.household_members;
create policy "members leave" on public.household_members
  for delete using (user_id = auth.uid());

drop policy if exists "members read plan" on public.household_plan;
create policy "members read plan" on public.household_plan
  for select using (public.is_household_member(household_id));

drop policy if exists "members write plan" on public.household_plan;
create policy "members write plan" on public.household_plan
  for insert with check (public.is_household_member(household_id));

drop policy if exists "members update plan" on public.household_plan;
create policy "members update plan" on public.household_plan
  for update using (public.is_household_member(household_id));

drop policy if exists "members read ticks" on public.household_ticks;
create policy "members read ticks" on public.household_ticks
  for select using (public.is_household_member(household_id));

drop policy if exists "members write ticks" on public.household_ticks;
create policy "members write ticks" on public.household_ticks
  for insert with check (public.is_household_member(household_id));

drop policy if exists "members update ticks" on public.household_ticks;
create policy "members update ticks" on public.household_ticks
  for update using (public.is_household_member(household_id));

-- Start a family: makes a household with a fresh code and adds this phone to it.
create or replace function public.create_household(initial_plan jsonb, initial_updated_at bigint)
returns table (household_id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code text;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from households h where h.code = new_code);
  end loop;
  insert into households (code) values (new_code) returning id into new_id;
  insert into household_members (household_id, user_id) values (new_id, auth.uid());
  insert into household_plan (household_id, plan, updated_at) values (new_id, initial_plan, initial_updated_at);
  return query select new_id, new_code;
end;
$$;

-- Join a family with its code. Returns the household id, or nothing if the code is wrong.
create or replace function public.join_household(join_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  select id into found from households where code = upper(trim(join_code));
  if found is null then
    return null;
  end if;
  insert into household_members (household_id, user_id) values (found, auth.uid())
    on conflict do nothing;
  return found;
end;
$$;

grant execute on function public.create_household(jsonb, bigint) to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- Live updates: other phones hear about plan changes and ticks as they happen.
do $$
begin
  begin
    alter publication supabase_realtime add table public.household_plan;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.household_ticks;
  exception when duplicate_object then null;
  end;
end $$;
