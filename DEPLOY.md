# Deploying giftwall (iOS)

**One command:** `scripts/release-ios.sh <buildNumber>` — typecheck → archive locally → smoke-test on a real device → submit to TestFlight. Here's why it works this way.

## Why we build locally (the crash story)

TestFlight builds 7–10 crashed on launch **on device** (`EXC_BREAKPOINT`, right after the JS thread started); dev and Simulator builds were always fine.

We bisected on a clean Expo SDK 56 app, adding the stack back piece by piece on a physical device: the SDK, Reanimated, every Expo module, Sentry, expo-router — **all ran**. Then the full app code, built **locally**, ran too. The crash tracked the **build**, not the code: **EAS Build's prebuilt React Native core produced a binary that crashes on device.** A local `xcodebuild` (where CocoaPods fetches a known-good prebuilt core) of the same commit runs fine.

So the rule is: **build + archive locally, use EAS only to submit.** EAS Build (cloud) is bypassed. A future option is forcing EAS to build React Native from source (`expo-build-properties` → `ios.buildReactNativeFromSource: true`), but EAS wasn't honoring that flag, and the local path is proven — so it isn't needed.

## The smoke-test gate (never ship a crash again)

Build 7 went straight to prod, crashed, and the app-icon picker was **wrongly blamed and ripped out** (it was the only "invasive native change," so it got the blame — but build 8 crashed too, without it). The gate makes that class of mistake impossible:

After archiving, `release-ios.sh` exports a **development-signed** copy, installs it via `xcrun devicectl`, launches it, and confirms the process is still alive ~10 s later. **It submits only if the app is alive.** This is exactly how we later *proved the icon plugin innocent* — build 101 launched and stayed up with it compiled in.

Needs a real device connected (UDID defaults to the dev iPhone; pass a 2nd arg to override).

## Build numbers

App Store Connect rejects a build whose **(version, buildNumber)** pair already exists. The script sets `expo.ios.buildNumber` from its first argument. History:

| build | what |
|---|---|
| 1–10 | EAS cloud builds (crashed on device) |
| **100** | first **working** TestFlight build (local archive) |
| **101** | + barcode-duplicate fix, Amazon/link image fix, app-icon picker restored |

Next release: pick 102+.

## Backend fixes ship without an app build

Anything under `supabase/functions/*` (the link scraper, price/image extraction) deploys server-side and takes effect immediately on already-installed builds:

```sh
npx supabase functions deploy scrape-link --project-ref dpbvpvrexnjgkspmbcjc
```

The Amazon image fix shipped this way — live on build 100 with no resubmit.

## Open hardening

- **Sentry dSYMs.** The local archive currently skips the symbol upload, so crashes report but stacks aren't symbolicated. Set a `SENTRY_AUTH_TOKEN` (org auth token, `project:releases` scope) and run, after each archive:
  ```sh
  npx sentry-cli debug-files upload --include-sources -o <org-slug> -p <project-slug> /tmp/giftwall.xcarchive/dSYMs
  ```
  dSYMs are preserved in every `.xcarchive`, so past builds can be back-filled too.
- **OTA for JS-only fixes.** Changes that touch no native code can ship via `eas update` on the `production` channel (runtime = appVersion `1.0.0`) instead of a full build — once it's confirmed the installed build pulls from that channel.
