#!/usr/bin/env bash
#
# giftwall iOS release — the PROVEN path. See DEPLOY.md for the full story.
#
# WHY THIS EXISTS:
#   EAS Build's cloud output crashed on device (its prebuilt React Native core).
#   A LOCAL build of the identical commit runs fine. So we build + archive
#   LOCALLY and use EAS only to submit. A smoke-test gate installs a dev-signed
#   copy on a real device and confirms it stays alive BEFORE we submit — so a
#   crashing build can never reach TestFlight again.
#
# USAGE:  scripts/release-ios.sh <buildNumber> [deviceUDID]
#   e.g.  scripts/release-ios.sh 102
#
set -uo pipefail
cd "$(dirname "$0")/.."

BUILD="${1:?usage: release-ios.sh <buildNumber> [deviceUDID]}"
DEVICE="${2:-E30B4DDB-28AC-554C-BDAC-82C8D6A30407}"   # dev iPhone; override as 2nd arg
TEAM="92CNG42USK"
WS="ios/giftwall.xcworkspace"
ARCHIVE="/tmp/giftwall.xcarchive"
BUNDLE="com.giftwall.app"

step() { echo; echo "=== $* $(date +%H:%M:%S) ==="; }
die()  { echo ">>> $*" >&2; exit 1; }

step "[1/7] typecheck"
npx tsc --noEmit || die "typecheck failed"

step "[2/7] set build number = $BUILD"
python3 -c "import json;a=json.load(open('app.json'));a['expo']['ios']['buildNumber']='$BUILD';json.dump(a,open('app.json','w'),indent=2)"

step "[3/7] prebuild + pods (prebuilt RN core)"
npx expo prebuild -p ios --clean --no-install || die "prebuild failed"
pod install --project-directory=ios || die "pod install failed"

step "[4/7] archive (App Store, automatic signing)"
SENTRY_DISABLE_AUTO_UPLOAD=true caffeinate -ims xcodebuild \
  -workspace "$WS" -scheme giftwall -configuration Release \
  -archivePath "$ARCHIVE" -derivedDataPath ios/build \
  -allowProvisioningUpdates CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM="$TEAM" \
  archive || die "archive failed"

step "[5/7] SMOKE-TEST GATE — dev export -> install -> launch -> still alive?"
cat > /tmp/gw-export-dev.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>method</key><string>development</string><key>teamID</key><string>$TEAM</string><key>signingStyle</key><string>automatic</string></dict></plist>
EOF
rm -rf /tmp/gw-dev
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath /tmp/gw-dev \
  -exportOptionsPlist /tmp/gw-export-dev.plist -allowProvisioningUpdates || die "dev export failed"
( cd /tmp/gw-dev && unzip -oq giftwall.ipa )
xcrun devicectl device install app --device "$DEVICE" /tmp/gw-dev/Payload/giftwall.app || die "install failed"
xcrun devicectl device process launch --device "$DEVICE" "$BUNDLE" || die "launch failed"
sleep 10
xcrun devicectl device info processes --device "$DEVICE" 2>/dev/null \
  | grep -E "giftwall\.app/giftwall" | grep -v giftwall2 \
  || die "SMOKE TEST FAILED — build crashed on device; NOT submitting"
echo ">>> smoke test PASS — build is alive"

step "[6/7] export App Store ipa"
cat > /tmp/gw-export-store.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>teamID</key><string>$TEAM</string><key>signingStyle</key><string>automatic</string><key>uploadSymbols</key><true/></dict></plist>
EOF
rm -rf /tmp/giftwall-ipa
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath /tmp/giftwall-ipa \
  -exportOptionsPlist /tmp/gw-export-store.plist -allowProvisioningUpdates || die "store export failed"

step "[7/7] submit to TestFlight"
npx eas-cli submit -p ios --path /tmp/giftwall-ipa/giftwall.ipa --profile production --non-interactive || die "submit failed"

echo; echo ">>> RELEASE COMPLETE — build $BUILD submitted to TestFlight"
