# Changelog

All notable changes to HabiTrax are documented here.

## [1.1.0] - 2026-03-21

### Added
- Settings screen with font size adjustment and light/dark/system theme toggle
- Partial habit completion support (e.g. none / partial / full, configurable per habit)

### Changed
- Habit completion icon updated to 🔁 (loop/circular arrow)
- App icon updated to match the habit completion icon

### Fixed
- Adjusted location of help text
- Bottom navigation bar now anchored to the bottom of the screen
- App now uses local time instead of UTC for date tracking

## [1.0.0] - 2026-03-20

### Added
- Initial release
- Daily habit tracking with tap-to-complete
- Pressure window — habits turn red after a configurable number of missed days
- Date navigation to review and edit past days
- OneDrive sync via Microsoft Graph API (single JSON file, no backend)
- PWA support — installable on iPhone/Android home screen
- Offline read-only mode via service worker
