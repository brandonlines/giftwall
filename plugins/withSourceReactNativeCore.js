const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Force React Native core to build FROM SOURCE instead of the prebuilt
 * React.framework xcframework (RN 0.85 "prebuilt RNCore" feature).
 *
 * Why: the prebuilt React.framework is missing the C++ symbol
 *   facebook::react::Sealable::Sealable()  (__ZN8facebook5react8SealableC2Ev)
 * that the from-source ExpoModulesCore links against in Release. The mismatch
 * makes the app abort in dyld at launch (EXC_CRASH/SIGABRT) before rendering —
 * i.e. a black screen on device. Confirmed via an on-device-equivalent
 * Release simulator crash report.
 *
 * Setting RCT_USE_PREBUILT_RNCORE=0 via eas.json env was NOT honored on EAS
 * Build (build 10 still linked the prebuilt framework). Writing the assignment
 * directly into the Podfile guarantees it: the Podfile is plain Ruby executed
 * at `pod install` time, so this ENV write wins over whatever the CI shell set,
 * and `use_react_native!` / rncore.rb then builds React core from source.
 */
module.exports = function withSourceReactNativeCore(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile",
      );
      let contents = fs.readFileSync(podfile, "utf8");
      // Unique marker so we don't trip over the template's own (||=) line 19,
      // which references RCT_USE_PREBUILT_RNCORE but only sets it if unset.
      const marker = "force-source-rncore";
      if (!contents.includes(marker)) {
        contents =
          `# ${marker}: build React Native core from source (prebuilt xcframework\n` +
          "# is missing facebook::react::Sealable -> dyld launch crash in Release).\n" +
          "# Hard assignment (=) above the template's ||= so it wins regardless of\n" +
          "# what the EAS/CI shell sets.\n" +
          "ENV['RCT_USE_PREBUILT_RNCORE'] = '0'\n\n" +
          contents;
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
