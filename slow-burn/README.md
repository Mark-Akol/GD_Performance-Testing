# Slow Burn

A health and fitness accountability app. It plans your day — water, meals,
walks, screen breaks, training — reminds you at the right moments, and lets a
small circle of friends see whether you actually did it.

Expo (React Native + TypeScript) on the front, Supabase (Postgres + Auth) on
the back. One codebase ships to both the App Store and Google Play.

---

## The product in one paragraph

Most habit apps fail in one of two ways: they nag on a fixed schedule that
ignores your life, or they demand so much setup that you quit before day three.
Slow Burn offers both, per domain — **"Recommend for me"** derives your times
from your goal, weight, waking hours and desk hours; **"I set the times"** uses
yours verbatim. The accountability layer is the reason it sticks: a circle of
two to twelve people who see each other's daily score and nothing else.

## What's built

| Area | State |
|---|---|
| Scheduling engine (5 domains, both modes) | Complete, 21 unit tests |
| Postgres schema, RLS, triggers, RPCs | Complete |
| Auth (email/password) + onboarding | Complete |
| Today / Circle / Plan / You screens | Complete |
| Local notifications | Complete |
| Remote push for nudges | Token registration done; sender is the one piece left — see `docs/ROADMAP.md` |
| Apple Health / Google Fit | Not started, deliberately — see roadmap |

## Getting it running

```bash
cd slow-burn
npm install
cp .env.example .env     # fill in your Supabase URL and anon key
npm start                # then press i (iOS) or a (Android)
```

### Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Run the three migrations in `supabase/migrations/` **in order**, either via
   the SQL editor or `supabase db push`.
3. Copy Project Settings → API → URL and `anon` key into `.env`.

The migrations create everything: tables, row-level security, the new-user
trigger, the scoring trigger, and the RPCs for creating and joining circles.

### Commands

```bash
npm start          # Expo dev server
npm test           # engine unit tests (node:test via tsx)
npm run typecheck  # tsc --noEmit
npm run assets     # regenerate icons/splash from a source image
```

## How it's put together

```
app/                    expo-router routes; file path == URL
  (auth)/               sign-in, sign-up
  (onboarding)/         two-step setup — about-you, your-day
  (tabs)/               index (Today), circle, plan, you
  _layout.tsx           AuthGate: the one place routing is decided

src/
  engine/               PURE scheduling logic. No I/O, no React, no Date
                        inside the rules — everything is "minutes since
                        local midnight". This is what the tests cover.
  lib/                  Everything impure: Supabase client, repo (the only
                        file that knows SQL column names), notifications,
                        date conversion, secure session storage.
  store/                zustand — session (auth/profile) and day (today).
  components/           Screen, Text, Card, Button, Choice, TimeField,
                        BurnRing, ActionRow. Screens compose these only.
  theme/                Every colour and spacing value in the app.
  data/foods.ts         Local meal suggestion library.
  types/                Mirrors the SQL schema one-for-one.

supabase/migrations/    0001 schema, 0002 functions/triggers, 0003 RLS
docs/                   Architecture, costs, roadmap, store submission
```

### Three decisions worth knowing about

**Reminders are local, not server-pushed.** Every habit reminder is scheduled
on the device with `expo-notifications`. A server cron pushing five reminders a
day to every user costs money per user per day and fails silently when a worker
dies. Local notifications cost nothing, fire without a network, and keep
working if the backend is down. Remote push is used only for friend nudges,
which genuinely cannot originate on your own phone.

**The engine is pure.** `src/engine/` takes a profile and settings and returns
a list of `{ minuteOfDay, title, detail }`. It touches no network, no clock and
no React. That is why the Today screen can render a full day offline, and why
the scheduling rules can be tested exhaustively in milliseconds.

**Privacy is enforced in the database, not the client.** Your circle can read
exactly one table — `daily_summaries` — and only for people who share a circle
with you. Weight, allergies, waking hours and individual skipped prompts are
owner-only at the RLS layer. A modified client cannot read past it.

## Costs

Roughly **$124 in year one** and **$0/month** until you have real traction.
Full breakdown, including where the first bills appear, in
[`docs/COSTS.md`](docs/COSTS.md).
