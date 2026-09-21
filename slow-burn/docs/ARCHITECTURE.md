# Architecture

## The shape of it

```
   device                                  Supabase
┌──────────────────────────┐            ┌──────────────────────┐
│  expo-router screens     │            │  Postgres            │
│         ↓                │            │   + Row Level        │
│  zustand stores          │  ←──────→  │     Security         │
│         ↓                │  supabase-js   + triggers         │
│  src/lib/repo.ts         │            │   + RPCs             │
│         ↓                │            │  Auth                │
│  src/engine (pure)       │            └──────────────────────┘
│         ↓                │
│  expo-notifications      │  ← local reminders never leave the phone
└──────────────────────────┘
```

## Layers, and the rule for each

**`src/engine/`** — pure functions. Given a profile and settings, returns the
day's items. No network, no React, no `Date` inside the rules; everything is
minutes since local midnight. *Rule: if it needs I/O, it does not belong here.*

**`src/lib/`** — everything impure. `repo.ts` is the only file that knows SQL
column names; `dates.ts` is the only place local-time conversion happens;
`notifications.ts` is the only place the OS scheduler is touched.
*Rule: screens never import `supabase` directly.*

**`src/store/`** — zustand. `session` holds auth, profile, goals and settings.
`day` holds today's plan, events and summary. *Rule: stores orchestrate repo
and engine calls; they do not contain business rules.*

**`app/`** — expo-router. File path is the URL. `_layout.tsx` holds `AuthGate`,
the single place routing decisions are made. *Rule: no imperative `navigate()`
calls scattered through sign-in screens.*

## The day, end to end

1. `planDay()` computes today's items locally from goals + settings. Instant,
   works offline, deterministic.
2. `syncDayEvents()` upserts them into `habit_events` keyed on
   `(user_id, local_day, item_key)` with `ignoreDuplicates`, so re-planning a
   day you're halfway through never resets what you've already ticked.
3. `syncScheduledReminders()` cancels all pending local notifications and
   schedules the future ones. Cancel-and-replace, not diff — the plan is small
   and a drifting diff produces double buzzes or silent gaps.
4. You tap a check. The UI updates optimistically, the write goes out, and a
   **database trigger** recomputes `daily_summaries`.
5. Your circle reads that summary. They never see step 2.

Scoring lives in the database on purpose: it is the number friends compare, so
it must be computed somewhere a modified client cannot reach.

## Why the schema looks like this

**`habit_events.local_day` is a stored date, not derived from a timestamp.**
Deriving it server-side files a 23:50 completion in Johannesburg under the
following UTC day, breaking streaks for anyone not on UTC.

**`daily_summaries` is a real table, not a view.** It is read on every circle
render by every member. A view would re-aggregate `habit_events` each time;
a table is one indexed row.

**SECURITY DEFINER helpers (`is_circle_member`, `shares_circle_with`).** A
policy on `circle_members` that queries `circle_members` recurses and Postgres
rejects it. These functions do that one lookup with RLS bypassed. They are
`STABLE`, take only what they need, and pin `search_path`.

**Joining is an RPC, not an insert.** You cannot `SELECT` a circle before you
are in it, so you cannot look one up by invite code from the client.
`join_circle_with_code()` validates the code and enforces the 12-person cap as
the definer. Same for `create_circle()`, which guarantees every circle has
exactly one owner membership row.

## Known limitations

- **Streaks recompute from yesterday only.** `recompute_daily_summary` reads
  `streak` from `local_day - 1`. If a user is offline for three days, the gap
  days have no row and the streak resets. Correct behaviour, but a user who
  travelled through a timezone change may see an off-by-one. A nightly job that
  backfills empty days would tighten this.
- **No conflict resolution across devices.** Two phones signed into one account
  both scheduling local notifications will double-notify. Single-device use is
  assumed for v1.
- **Preset mode maps times to meal slots by index.** Four preset nutrition
  times on a three-slot goal wraps around. Acceptable, slightly arbitrary.
- **The food library is small** (~22 items). Suggestions will feel repetitive
  within a fortnight. Growing it is cheap, uncreative work — do it before launch.
