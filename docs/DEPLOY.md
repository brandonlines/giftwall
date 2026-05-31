# Deploying giftwall

## The golden rule: backend before OTA

An OTA update ships only **JavaScript + assets** to an app binary that's already
installed. The new JS often expects new tables, columns, RPCs, or Edge Functions.
If you push the OTA *before* applying the backend, the live app will call things
that don't exist yet and error. **Always deploy the database/functions first,
then the OTA.**

## 1. Backend (Supabase)

```sh
# Apply pending migrations (currently up to 0028)
npx supabase db push

# The push functions fail CLOSED without a webhook secret — set it once:
npx supabase secrets set WEBHOOK_SECRET=<a-long-random-string>
#   …and add the same value as the x-webhook-secret header on the items webhook.

# Deploy the Edge Functions
npx supabase functions deploy scrape-link send-push delete-account occasion-reminders

# Schedule the daily reminder job (pg_cron / Scheduled Functions — see the
# occasion-reminders function header for a pg_cron example).

# Prove the Surprise Wall + every policy still hold against the live project
npm run test:rls
```

## 2. OTA the app JS

Once the backend is live, ship the JS over-the-air to the existing TestFlight /
store build (no review needed):

```sh
npm run ship:ota          # lint + tests, then eas update --branch production
# or, for the preview channel:
npm run ship:ota:preview
```

…or trigger the **"OTA update"** GitHub Action (Actions tab → Run workflow). It
needs an `EXPO_TOKEN` repo secret (expo.dev → Account → Access tokens). Manual
trigger by design, so you control the backend-first ordering.

`runtimeVersion.policy` is `appVersion`, so an OTA targets every installed build
with the same app version. The update is delivered on next launch.

## When you need a real build instead (NOT OTA)

`eas build` + a store submission is required — OTA can't deliver these — when a
change touches native code:

- a new native module / config plugin, or a change to `app.json` native config
  (permissions, entitlements, icon, scheme, plugins),
- an **app version bump** (`version` in `app.json`) — this changes
  `runtimeVersion`, so existing builds won't receive the OTA,
- an Expo SDK upgrade.

```sh
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

## What this session shipped

All of the recent app work (post-occasion reveal, Secret Santa exclusions,
recurring occasions, shipping address, notification prefs, offline queue,
currency formatting, the Signature theme, the group cover UI) is **JS-only** —
`expo-image-picker` was already a dependency — so it's all **OTA-deliverable**
once migrations 0021–0028 and the functions are live. No new build required.
