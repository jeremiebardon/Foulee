# EAS instead of Fastlane for build, signing and deployment

Native folders are generated (Continuous Native Generation), so Fastlane would mean running `expo prebuild` in CI, building on costly macOS runners and managing signing with `match`. We use EAS Build, EAS Submit (which drives Fastlane internally) and EAS Update instead. "Fast deployment" comes from over-the-air updates for JS-only changes, not from a faster native pipeline.

## Considered Options

- Fastlane for everything: rejected, because it conflicts with CNG and costs more to run.
- EAS for builds, with Fastlane `deliver`/`supply` only for store metadata: deferred until store listings need to be automated.
