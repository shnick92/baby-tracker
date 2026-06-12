# Screenshot & GIF Capture

Automated Playwright script that captures every major screen of the app at a Pixel 5 mobile viewport (393×851 px), then converts key interactive flows to GIFs via ffmpeg.

## Prerequisites

- **Local dev servers running** — start with:
  ```bash
  npm run dev
  ```
  This starts Vite on `:5173` and Express on `:3001`. Run the screenshot script in a second terminal.

- **ffmpeg** — needed only for GIF conversion (`npm run screenshots:gifs`):
  ```bash
  brew install ffmpeg   # macOS
  ```

## Running

From the repo root:

```bash
# Full pipeline: screenshots + MP4 recordings + GIF conversion
npm run screenshots:all

# Screenshots + MP4 recordings only (skip GIF conversion)
npm run screenshots

# Convert existing MP4s to GIFs only
npm run screenshots:gifs
```

## Configuration

All settings are optional — the script reads from `packages/server/.env` automatically.

| Env var | Default | Description |
|---|---|---|
| `FRONTEND_URL` | `http://localhost:5173` | Vite dev server URL (browser navigation) |
| `API_URL` | `http://localhost:3001` | Express server URL (seed endpoint, Node.js fetch) |
| `DEMO_EMAIL` | `SEED_USER_1_EMAIL` from server/.env | Login email |
| `DEMO_PASSWORD` | `SEED_USER_1_PASSWORD` from server/.env | Login password |
| `DEMO_BABY_NAME` | `Baby` | Baby name shown in seeded data |
| `TIMEZONE` | `America/Chicago` | Browser timezone for screenshots |

**Before running:** set `VITE_PLAYWRIGHT=true` in `packages/client/.env` and restart the Vite dev server. This suppresses the TanStack Query DevTools floating button from screenshots. Unset (or remove) the value after the run.

`VITE_FAMILY_SURNAME` (from `packages/client/.env`) is automatically read and stripped from the baby-names screenshot so no real surname appears in committed images.

## Screens captured

| File | Type | Screen |
|---|---|---|
| `mobile/dashboard-pregnancy.png` | Screenshot | Dashboard — pregnancy countdown (pre-birth state) |
| `mobile/login.png` | Screenshot | Login form with passkey button |
| `mobile/feeding.png` | Screenshot | Feeding log — quick-log grid |
| `mobile/sleep-page.png` | Screenshot | Sleep tracker — wake window + active nap |
| `mobile/diaper.png` | Screenshot | Diaper log — Dirty type expanded |
| `mobile/medication.png` | Screenshot | Medication log |
| `mobile/tummy-time.png` | Screenshot | Tummy time log |
| `mobile/mood.png` | Screenshot | Mood & Activity log |
| `mobile/growth-chart.png` | Screenshot | Weight growth chart with WHO percentile bands |
| `mobile/growth-height.png` | Screenshot | Height growth chart with WHO percentile bands |
| `mobile/calendar-all.png` | Screenshot | Calendar — all categories |
| `mobile/calendar-feedings.png` | Screenshot | Calendar — Feedings filter chip active |
| `mobile/checklist.png` | Screenshot | Hospital bag checklist (~60% checked) |
| `mobile/purchases.png` | Screenshot | Purchases tracker — mixed statuses |
| `mobile/visitors.png` | Screenshot | Visitor schedule |
| `mobile/alerts.png` | Screenshot | SOS alert history |
| `mobile/ai-chat.png` | Screenshot | "Is This Normal?" AI chat with seeded Q&A |
| `mobile/history.png` | Screenshot | History & Reports — weekly summary tab |
| `mobile/export.png` | Screenshot | History & Reports — Export tab, raw data |
| `mobile/health-summary.png` | Screenshot | History & Reports — Export tab, Health Summary |
| `mobile/quick-log.png` | Screenshot | Dashboard — AI quick log input |
| `mobile/illness-landing.png` | Screenshot | Illness episode list |
| `mobile/illness-episode.png` | Screenshot | Episode detail — symptoms, temp log, meds |
| `mobile/illness-report.png` | Screenshot | Doctor handoff report format picker |
| `mobile/more.png` | Screenshot | "More" navigation menu |
| `mobile/dashboard.png` | Screenshot | Dashboard — newborn state (feeding/sleep/diaper summary) |
| `mobile/sleep.png` | Screenshot | Sleep tracker — active nap timer |
| `mobile/baby-names.png` | Screenshot | Baby name shortlist with emoji reactions (surname stripped) |
| `mobile/vaccinations.png` | Screenshot | Vaccination tracker — CDC schedule with due/overdue status |
| `mobile/milestones.png` | Screenshot | Milestone tracker — grouped by age range |
| `mobile/settings.png` | Screenshot | Settings page — account, notifications, display |
| `gifs/dashboard.gif` | GIF | Dashboard — live feeding timer ticking |
| `gifs/sleep.gif` | GIF | Sleep tracker — active nap timer running |
| `gifs/sos-sheet.gif` | GIF | SOS confirmation bottom sheet sliding up |

## How it works

1. `npm run screenshots` calls `npx tsx scripts/screenshots.ts`, which:
   - Loads `packages/server/.env` so seed credentials resolve automatically
   - POSTs `POST /api/dev/seed-pregnancy` to set the baby to pregnancy state (no birthDate, future dueDate), wipes postnatal data, then captures `dashboard-pregnancy.png`
   - POSTs `POST /api/dev/seed-demo` to switch the baby to born state and recreate all demo activity
   - Launches Chromium in a Pixel 5 mobile profile (headless, touch enabled, Android UA)
   - Logs in and navigates each route, taking a screenshot or recording a short video; GIF contexts reuse auth cookies so the recording skips the login screen entirely
   - Saves PNGs to `docs/screenshots/mobile/`, videos to `docs/screenshots/videos/`
2. `npm run screenshots:gifs` runs `scripts/make-gifs.sh` which converts every `.webm`/`.mp4` in `videos/` to an optimised GIF using ffmpeg palette-quantisation

## Demo data seeded on each run

Each run of `npm run screenshots` wipes and recreates:

- 5 days of feeding logs (mix of bottle + breast, ~every 2.5 h) + 1 active feed (drives dashboard timer)
- 5 days of sleep logs (2 naps + 1 night per day) + 1 active nap (drives sleep page timer)
- 10 diaper logs
- 5 tummy time sessions
- 5 mood logs (happy / fussy / crying / alert)
- 3 weight measurements spanning 6 weeks (birth, 2 weeks, 1 month)
- 4 standalone medication logs (daily vitamin D) + illness episode meds
- 1 resolved illness episode with symptoms, temperature readings, and medications
- Hospital bag checklist ~60% checked
- 10 purchases (4 BOUGHT, 2 GIFTED, 3 NEEDED, 1 SKIP)
- 5 visitor slots (generic names, mix of past + upcoming)
- 4 baby name candidates with emoji reactions from both parents
- 1 seeded AI Q&A exchange

The `videos/` directory is git-ignored (MP4 files are ~5–20 MB each). The `mobile/` and `gifs/` directories are committed.
