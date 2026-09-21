-- Slow Burn — core schema.
--
-- Privacy stance, which drives every policy below: your circle sees how you
-- are DOING (a score, a streak, whether today's items are done). It never sees
-- what you weigh, what you can't eat, or the individual events behind the
-- number. That split is enforced at the row-level-security layer rather than
-- in the client, so a compromised or modified app cannot read past it.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type reminder_domain as enum (
  'hydration', 'nutrition', 'movement', 'screen_break', 'training'
);

-- The two-choice model: the user sets the times, or the app derives them.
create type reminder_mode as enum ('preset', 'coached');

create type goal_type as enum (
  'lose_fat', 'build_muscle', 'maintain', 'endurance', 'general_health'
);

create type activity_level as enum ('sedentary', 'light', 'moderate', 'high', 'athlete');

create type dietary_pattern as enum (
  'omnivore', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'kosher'
);

create type sex_type as enum ('male', 'female', 'unspecified');

create type event_status as enum ('pending', 'done', 'skipped', 'missed');

create type circle_role as enum ('owner', 'member');

create type nudge_kind as enum ('cheer', 'poke', 'callout');

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  handle      text not null unique
              check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  avatar_url  text,
  timezone    text not null default 'UTC',
  created_at  timestamptz not null default now()
);

-- Sensitive: body metrics, schedule and dietary restrictions. Owner-only,
-- always. Nothing in this table is ever exposed to a circle.
create table user_goals (
  user_id         uuid primary key references profiles (id) on delete cascade,
  goal_type       goal_type not null default 'general_health',
  activity_level  activity_level not null default 'moderate',
  sex             sex_type not null default 'unspecified',
  height_cm       numeric(5,1) check (height_cm is null or height_cm between 80 and 250),
  weight_kg       numeric(5,1) check (weight_kg is null or weight_kg between 25 and 400),
  wake_time       time not null default '07:00',
  sleep_time      time not null default '23:00',
  work_start      time not null default '09:00',
  work_end        time not null default '17:30',
  training_days   smallint not null default 3 check (training_days between 0 and 7),
  dietary_pattern dietary_pattern not null default 'omnivore',
  allergies       text[] not null default '{}',
  updated_at      timestamptz not null default now()
);

create table reminder_settings (
  user_id      uuid not null references profiles (id) on delete cascade,
  domain       reminder_domain not null,
  mode         reminder_mode not null default 'coached',
  enabled      boolean not null default true,
  preset_times time[] not null default '{}',
  config       jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  primary key (user_id, domain)
);

-- ---------------------------------------------------------------------------
-- Daily activity
-- ---------------------------------------------------------------------------

create table habit_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles (id) on delete cascade,
  domain        reminder_domain not null,
  -- "YYYY-MM-DD" in the USER'S timezone, computed client-side. Storing the
  -- local day explicitly means a 23:50 completion never lands on the wrong
  -- day just because the server happens to be in UTC.
  local_day     date not null,
  -- Stable within a day (e.g. "hydration-0930"), so re-planning the same day
  -- reconciles against existing rows instead of duplicating them.
  item_key      text not null,
  scheduled_for timestamptz not null,
  status        event_status not null default 'pending',
  completed_at  timestamptz,
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (user_id, local_day, item_key)
);

create index habit_events_user_day_idx on habit_events (user_id, local_day);
create index habit_events_pending_idx on habit_events (user_id, status) where status = 'pending';

-- The ONLY table a circle can read about you. Aggregate, never granular.
create table daily_summaries (
  user_id   uuid not null references profiles (id) on delete cascade,
  local_day date not null,
  completed smallint not null default 0,
  total     smallint not null default 0,
  score     smallint not null default 0 check (score between 0 and 100),
  streak    smallint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, local_day)
);

create index daily_summaries_day_idx on daily_summaries (local_day);

-- ---------------------------------------------------------------------------
-- The accountability layer
-- ---------------------------------------------------------------------------

create table circles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 1 and 40),
  -- Invite codes, not contact-book scraping. No address book permission means
  -- a materially easier App Store privacy review and a lower install barrier.
  invite_code text not null unique,
  owner_id    uuid not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table circle_members (
  circle_id uuid not null references circles (id) on delete cascade,
  user_id   uuid not null references profiles (id) on delete cascade,
  role      circle_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create index circle_members_user_idx on circle_members (user_id);

create table nudges (
  id           uuid primary key default gen_random_uuid(),
  circle_id    uuid not null references circles (id) on delete cascade,
  from_user_id uuid not null references profiles (id) on delete cascade,
  to_user_id   uuid not null references profiles (id) on delete cascade,
  kind         nudge_kind not null default 'cheer',
  message      text check (message is null or length(message) <= 140),
  created_at   timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);

create index nudges_to_user_idx on nudges (to_user_id, created_at desc);

-- Expo push tokens, one row per device.
create table push_tokens (
  user_id    uuid not null references profiles (id) on delete cascade,
  token      text not null,
  platform   text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
