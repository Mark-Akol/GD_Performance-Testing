-- Slow Burn — functions and triggers.

-- ---------------------------------------------------------------------------
-- Membership helpers
--
-- These are SECURITY DEFINER on purpose. A policy on circle_members that
-- itself queries circle_members recurses and Postgres rejects it. Running the
-- lookup as the definer bypasses RLS for that one narrow question, which is
-- the standard way out. Both are STABLE, take only the arguments they need,
-- and pin search_path so they cannot be hijacked by a shadowed table.
-- ---------------------------------------------------------------------------

create or replace function public.is_circle_member(target_circle uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from circle_members
    where circle_id = target_circle and user_id = auth.uid()
  );
$$;

create or replace function public.is_circle_owner(target_circle uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from circles
    where id = target_circle and owner_id = auth.uid()
  );
$$;

-- "Does the caller share at least one circle with this user?" — the single
-- question that gates every piece of cross-user visibility in the app.
create or replace function public.shares_circle_with(target_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from circle_members me
    join circle_members them on them.circle_id = me.circle_id
    where me.user_id = auth.uid()
      and them.user_id = target_user
  );
$$;

-- ---------------------------------------------------------------------------
-- New user bootstrap
-- ---------------------------------------------------------------------------

-- Generates an invite/handle-safe code. Crockford-style alphabet: no 0/O/1/I,
-- so a code read aloud or typed from a screenshot doesn't bounce.
create or replace function public.generate_code(len int default 6)
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  result text := '';
  i int;
begin
  for i in 1..len loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- Creates the profile, default goals and one reminder_settings row per domain
-- the moment a user signs up, so the app never has to cope with a half-built
-- account on first launch.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  base_handle text;
  final_handle text;
  attempt int := 0;
  d reminder_domain;
begin
  base_handle := lower(regexp_replace(split_part(coalesce(new.email, 'burner'), '@', 1), '[^a-z0-9_]', '', 'g'));
  if length(base_handle) < 3 then
    base_handle := 'burner';
  end if;
  base_handle := left(base_handle, 14);
  final_handle := base_handle;

  -- Handles are unique; on collision, suffix until one sticks.
  while exists (select 1 from profiles where handle = final_handle) and attempt < 20 loop
    attempt := attempt + 1;
    final_handle := left(base_handle, 14) || lower(public.generate_code(4));
  end loop;

  insert into profiles (id, handle, display_name)
  values (
    new.id,
    final_handle,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), base_handle)
  );

  insert into user_goals (user_id) values (new.id);

  foreach d in array enum_range(null::reminder_domain) loop
    insert into reminder_settings (user_id, domain) values (new.id, d);
  end loop;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Daily score
-- ---------------------------------------------------------------------------

-- A day "counts" toward a streak at 70% completion. Demanding 100% turns a
-- single missed water prompt into a broken streak, and a broken streak is the
-- most common reason people abandon a habit app.
create or replace function public.recompute_daily_summary(target_user uuid, target_day date)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total smallint;
  v_done smallint;
  v_score smallint;
  v_prev_streak smallint;
  v_streak smallint;
begin
  select
    count(*) filter (where status <> 'skipped'),
    count(*) filter (where status = 'done')
  into v_total, v_done
  from habit_events
  where user_id = target_user and local_day = target_day;

  v_score := case when coalesce(v_total, 0) = 0
                  then 0
                  else round(100.0 * v_done / v_total)::smallint end;

  select coalesce(streak, 0) into v_prev_streak
  from daily_summaries
  where user_id = target_user and local_day = target_day - 1;

  v_streak := case when v_score >= 70 then coalesce(v_prev_streak, 0) + 1 else 0 end;

  insert into daily_summaries (user_id, local_day, completed, total, score, streak, updated_at)
  values (target_user, target_day, coalesce(v_done, 0), coalesce(v_total, 0), v_score, v_streak, now())
  on conflict (user_id, local_day) do update
    set completed = excluded.completed,
        total     = excluded.total,
        score     = excluded.score,
        streak    = excluded.streak,
        updated_at = now();
end;
$$;

create or replace function public.on_habit_event_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.recompute_daily_summary(
    coalesce(new.user_id, old.user_id),
    coalesce(new.local_day, old.local_day)
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists habit_events_summary on habit_events;
create trigger habit_events_summary
  after insert or update or delete on habit_events
  for each row execute function public.on_habit_event_change();

-- ---------------------------------------------------------------------------
-- Circle joins
--
-- A user cannot SELECT a circle before they are in it, so they cannot look up
-- a circle by its invite code from the client. This RPC is the only door in:
-- it validates the code as the definer and inserts exactly one membership row.
-- ---------------------------------------------------------------------------

create or replace function public.join_circle_with_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_circle uuid;
  member_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select id into target_circle
  from circles
  where invite_code = upper(trim(code));

  if target_circle is null then
    raise exception 'That invite code does not match a circle' using errcode = 'P0002';
  end if;

  -- Small by design. Accountability works between people who would actually
  -- notice you were gone; a 50-person leaderboard is a different product.
  select count(*) into member_count from circle_members where circle_id = target_circle;
  if member_count >= 12 then
    raise exception 'That circle is full' using errcode = 'P0001';
  end if;

  insert into circle_members (circle_id, user_id, role)
  values (target_circle, auth.uid(), 'member')
  on conflict (circle_id, user_id) do nothing;

  return target_circle;
end;
$$;

create or replace function public.create_circle(circle_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_id uuid;
  code text;
  attempt int := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  loop
    code := public.generate_code(6);
    exit when not exists (select 1 from circles where invite_code = code) or attempt > 20;
    attempt := attempt + 1;
  end loop;

  insert into circles (name, invite_code, owner_id)
  values (trim(circle_name), code, auth.uid())
  returning id into new_id;

  insert into circle_members (circle_id, user_id, role)
  values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Circle standings — the Circle tab's single query.
--
-- Returns aggregate progress only. There is deliberately no join to
-- habit_events or user_goals here: the leaderboard physically cannot leak a
-- weight, an allergy or an individual missed prompt.
-- ---------------------------------------------------------------------------

create or replace function public.circle_standings(target_circle uuid, target_day date)
returns table (
  user_id uuid,
  handle text,
  display_name text,
  avatar_url text,
  score smallint,
  completed smallint,
  total smallint,
  streak smallint
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.handle,
    p.display_name,
    p.avatar_url,
    coalesce(s.score, 0::smallint),
    coalesce(s.completed, 0::smallint),
    coalesce(s.total, 0::smallint),
    coalesce(s.streak, 0::smallint)
  from circle_members m
  join profiles p on p.id = m.user_id
  left join daily_summaries s
    on s.user_id = m.user_id and s.local_day = target_day
  where m.circle_id = target_circle
    -- The caller must be in the circle. Without this the function's own
    -- SECURITY DEFINER rights would expose every circle in the database.
    and public.is_circle_member(target_circle)
  order by coalesce(s.score, 0) desc, p.display_name asc;
$$;
