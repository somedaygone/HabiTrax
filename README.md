# HabiTrax

A lightweight PWA habit tracker that syncs your data to OneDrive — no backend, no server costs.

## Features

- **Daily tracking** — check off habits each day with a simple tap
- **Partial completion** — habits support multiple completion levels (e.g. none / partial / full)
- **Pressure window** — each habit turns red after a configurable number of days without completion, so nothing slips through the cracks
- **Date navigation** — review and edit past days
- **Settings** — adjust font size and choose light, dark, or system theme
- **OneDrive sync** — data stored as a single JSON file in your OneDrive app folder (`/Apps/HabiTrax/habits-data.json`)
- **PWA** — installable on iPhone/Android home screen, works offline (read-only when offline)
- **No backend** — pure static files hosted on GitHub Pages

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS, HTML, CSS |
| Auth | MSAL.js v3 (Microsoft Identity) |
| Storage | Microsoft Graph API → OneDrive |
| Hosting | GitHub Pages |

## Getting Started

### Prerequisites

- A Microsoft account (personal or work/school)
- A modern browser or iOS/Android device

### Use the hosted app

Visit [https://somedaygone.github.io/HabiTrax](https://somedaygone.github.io/HabiTrax) and sign in with your Microsoft account.

To install as a PWA on iPhone: tap the Share button → **Add to Home Screen**.

### Run locally

1. Clone the repo
2. Serve with any static file server (e.g. VS Code Live Server on port 5500)
3. Open `http://localhost:5500/`

No build step required.

## Data Model

All data is stored in a single JSON file in your OneDrive:

```json
{
  "habits": [
    { "id": "uuid", "name": "Morning Prayer", "pressureDays": 2, "order": 0, "createdAt": "2026-01-01" }
  ],
  "log": {
    "2026-03-19": { "habit-uuid": true }
  }
}
```

## File Structure

```
├── index.html          # App shell
├── style.css           # All styles (CSS custom properties for theming)
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (caches app shell)
├── js/
│   ├── auth.js         # MSAL init, sign-in/out, token acquisition
│   ├── graph.js        # OneDrive load/save via Microsoft Graph
│   ├── app.js          # All app logic, state, and rendering
│   └── msal-browser.min.js
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── docs/               # Reference docs (not deployed)
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

GPL v3.0
