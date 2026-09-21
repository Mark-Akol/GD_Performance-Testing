# Shipping to the App Store and Google Play

Both stores treat anything health-adjacent with extra scrutiny. None of this is
hard, but each item is a rejection if missed.

## Apple

**Account deletion is mandatory.** Any app with account creation must offer
in-app account deletion. This is the single most common rejection for apps like
this one. Build it before you submit.

**Health disclaimers.** You collect weight and give dietary and exercise
suggestions. You are not a medical device and must not read as one. Include,
visibly in onboarding and in the You tab:

> Slow Burn offers general wellness suggestions. It is not medical advice.
> Talk to a doctor before changing your diet or exercise routine, especially
> if you have a health condition or are pregnant.

**Privacy nutrition labels.** Declare honestly:
- Identifiers → email, linked to identity, for app functionality
- Health & Fitness → weight, activity, linked to identity, for app functionality
- Usage Data → none, if you add no analytics

**Notification permission timing.** Slow Burn asks at the end of onboarding, at
the moment the purpose is obvious, rather than on first launch. Keep it that
way — it reads better to reviewers and converts far better with users.

**`ITSAppUsesNonExemptEncryption: false`** is already set in `app.json`. It
saves a compliance question on every single submission.

## Google Play

**Data safety form.** The Play Console equivalent of Apple's labels. Same
answers. It must match what the app actually does.

**Health apps declaration.** Play asks whether your app is a health app. Answer
yes and describe it as general wellness, not medical.

**`POST_NOTIFICATIONS`** (Android 13+) and **`SCHEDULE_EXACT_ALARM`** are
already declared in `app.json`. Be ready to justify exact alarms — "time-based
reminders the user explicitly scheduled" is the accepted rationale.

## Before either submission

- [ ] Privacy policy hosted at a public URL (both stores require a live link)
- [ ] In-app account deletion shipped
- [ ] Health disclaimer visible in onboarding and in the You tab
- [ ] Tested on a real device of each platform
- [ ] Screenshots for every required size
- [ ] A test account for the reviewer, with a circle already populated — the
      Circle tab is empty and unimpressive on a fresh account, and reviewers
      judge what they see

## Building

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios      # needs an Apple Developer account
eas build --platform android
eas submit --platform ios
```

`app.json` already carries the bundle identifier `com.slowburn.app` for both
platforms. Change it before your first build if you want something else —
after the first submission it is permanent.

## Note on the EAS project ID

`app.json` has a placeholder `extra.eas.projectId` of all zeroes. `eas
build:configure` replaces it with your real one. Remote push registration
(`registerForPush`) returns null until it is real, which is harmless — local
reminders, the core of the app, work regardless.
