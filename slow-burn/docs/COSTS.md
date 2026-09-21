# What Slow Burn costs to run

You asked for opulent but as cheap as possible. Here is the honest picture.

## Year one, pre-revenue

| Item | Cost | Notes |
|---|---|---|
| Apple Developer Program | **$99/year** | Unavoidable. Required to ship to the App Store at all. |
| Google Play Developer | **$25 once** | One-time, lifetime. |
| Supabase | **$0** | Free tier: 500 MB database, 50,000 monthly active users, 5 GB bandwidth. |
| Expo EAS builds | **$0** | Free tier covers roughly 30 builds/month, enough for a solo founder. |
| Expo push notifications | **$0** | Unlimited and free, forever. |
| Domain (optional) | ~$12/year | Only needed for a marketing page and privacy policy hosting. |
| **Total year one** | **~$124–136** | |

There is no per-user cost in that table. That is the point of the architecture.

## Where the first real bill appears

Supabase's free tier is generous but has two hard edges:

1. **Database size — 500 MB.** The heaviest table by far is `habit_events`:
   roughly 15 rows per user per day. At 200 bytes a row that's about 1 MB per
   user per year. You would need somewhere near 400 daily-active users before
   size alone forces the $25/month Pro plan.
2. **Project pausing.** Free projects pause after 7 days with no activity.
   Irrelevant once you have any real users; worth knowing during a quiet
   development month.

**Practical read:** you stay at $0/month until you have hundreds of engaged
users, and the first upgrade is $25/month. That is a good problem.

## Keeping it cheap as you grow

- **Prune old events.** `habit_events` older than 90 days can be deleted once
  their day has been rolled into `daily_summaries`. The summary is what the
  streak and the circle read, so nothing user-visible is lost. This alone keeps
  the database roughly flat instead of growing forever.
- **Don't add a nutrition API.** `src/data/foods.ts` is a static local library.
  Nutrition APIs bill per call, add latency to the one screen that must work at
  7am, and rate-limit at the worst moment. Only revisit this if users
  specifically ask for per-gram macro tracking.
- **Resist a server-side scheduler.** The moment reminders move to a server
  cron, you are paying per user per day and you own an uptime problem. Local
  notifications are not a compromise here; they are the better design.
- **Images cost bandwidth.** If you add profile photos, put them in Supabase
  Storage with a strict size cap (say 256 KB after resize) and resize on device
  before upload.

## What would actually change the maths

Going to real-time features (live circle updates via Supabase Realtime) or
adding AI-generated meal plans per user per day. Both are defensible later.
Neither is needed for v1, and both turn a fixed cost into a per-user cost —
so hold them until users are paying.

## When to start charging

The natural paywall is the circle: solo use free, circles beyond one or beyond
three people paid. It maps to the moment the product delivers its actual value,
and it makes users bring their own friends. A £2.99/month or £24.99/year tier
converting at 3% of a 5,000-user base covers every cost above several times
over. Apple and Google take 15% under the small-business programmes (under
$1M/year), not 30% — apply for both.
