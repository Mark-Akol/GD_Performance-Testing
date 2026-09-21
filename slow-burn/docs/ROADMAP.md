# Roadmap

Ordered by what actually gets you to a shipped, used app. As a solo founder
your scarcest resource is attention, so this is deliberately ruthless about
what *doesn't* go in v1.

## Before you can ship (required)

1. **Stand up Supabase and run the migrations.** Nothing works until this is
   done. ~30 minutes.
2. **Write the nudge sender.** A Supabase Edge Function triggered on insert
   into `nudges`, which looks up the recipient's rows in `push_tokens` and
   POSTs to `https://exp.host/--/api/v2/push/send`. The app already registers
   tokens and writes nudges — this is the only missing link in the social loop.
   ~2 hours.
3. **Grow the food library.** `src/data/foods.ts` has ~22 items; suggestions
   repeat within two weeks. Target 80–100. Boring, cheap, high impact on
   whether the app feels alive. ~3 hours.
4. **Real-device testing.** Notification timing, permission prompts and
   keychain behaviour all differ from the simulator. Test on one real iPhone
   and one real Android.
5. **Privacy policy + App Store privacy labels.** See `docs/STORE.md`.
6. **Account deletion.** Apple requires in-app account deletion for any app
   with accounts. A "Delete account" button in the You tab calling an RPC that
   removes the auth user — the schema already cascades. ~1 hour, and your
   submission will be rejected without it.

## Right after launch

- **Prune `habit_events` older than 90 days.** A `pg_cron` job. Keeps the
  database roughly flat and your bill at zero. See `docs/COSTS.md`.
- **Backfill empty days in `daily_summaries`** so a three-day absence resets a
  streak correctly rather than leaving a gap.
- **Snooze.** "Not now, in 20 minutes" on a notification. The single most
  requested feature in every reminder app ever built.
- **Weekly recap.** Sunday-night summary for you and your circle. Cheap to
  build, strong retention hook.

## Version 2 candidates

- **Apple Health / Google Fit.** Auto-complete walk and training items from
  real step and workout data instead of asking. The most credible "wow" feature
  here, and the most work — it needs a development build (not Expo Go),
  per-platform permission handling, and its own privacy disclosure. Worth it,
  but not before you know people use the app at all.
- **Circle chat or reactions.** Threaded comments on a day. Raises moderation
  and reporting obligations with Apple — read the guidelines first.
- **Subscriptions** via `expo-in-app-purchases` or RevenueCat. See the paywall
  thinking at the end of `docs/COSTS.md`.
- **Widgets.** Today's next item on the home screen. High delight, needs native
  code on both platforms.

## Explicitly not doing

- **A nutrition API.** Per-call billing, latency on the one screen that must
  work at 7am, rate limits at the worst moment. The local library is the right
  call until someone asks for per-gram macros.
- **A server-side reminder scheduler.** Turns a fixed cost into a per-user cost
  and hands you an uptime problem. Local notifications are better here, not
  merely cheaper.
- **Android + iOS native rewrites.** You chose one codebase for a reason.
- **AI meal generation.** Per-user-per-day inference cost, for a suggestion a
  curated list already handles. Revisit when users are paying.
