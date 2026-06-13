# Baby Tracker

A private, self-hosted Progressive Web App for tracking pregnancy milestones and newborn care. Built for two parents on a home server — no data leaves your network.

---

## What Does It Look Like?

> Screenshots are generated automatically by `npm run screenshots`. See [`docs/screenshots/README.md`](docs/screenshots/README.md) for how to run it.

<details>
<summary><strong>Daily tracking</strong> — Dashboard, Feeding, Sleep, Diapers, Mood & Activity</summary>

| Login | Dashboard | Feeding |
|:---:|:---:|:---:|
| ![login](docs/screenshots/mobile/login.png) | ![dashboard](docs/screenshots/mobile/dashboard.png) | ![feeding](docs/screenshots/mobile/feeding.png) |

| Sleep | Diaper | Mood & Activity |
|:---:|:---:|:---:|
| ![sleep](docs/screenshots/mobile/sleep.png) | ![diaper](docs/screenshots/mobile/diaper.png) | ![mood](docs/screenshots/mobile/mood.png) |

</details>

<details>
<summary><strong>Health & growth</strong> — Weight/Height charts, Medications, Tummy Time, Illness, Vaccinations</summary>

| Weight Chart | Height Chart | Tummy Time |
|:---:|:---:|:---:|
| ![growth-weight](docs/screenshots/mobile/growth-chart.png) | ![growth-height](docs/screenshots/mobile/growth-height.png) | ![tummy-time](docs/screenshots/mobile/tummy-time.png) |

| Medication | Illness Episode | Illness Report |
|:---:|:---:|:---:|
| ![medication](docs/screenshots/mobile/medication.png) | ![illness](docs/screenshots/mobile/illness-episode.png) | ![illness-report](docs/screenshots/mobile/illness-report.png) |

| Vaccinations | Milestones | |
|:---:|:---:|:---:|
| ![vaccinations](docs/screenshots/mobile/vaccinations.png) | ![milestones](docs/screenshots/mobile/milestones.png) | |

</details>

<details>
<summary><strong>Pregnancy prep</strong> — Baby Names, Purchases, Visitors, Checklists</summary>

| Baby Names | Purchases | Visitors |
|:---:|:---:|:---:|
| ![baby-names](docs/screenshots/mobile/baby-names.png) | ![purchases](docs/screenshots/mobile/purchases.png) | ![visitors](docs/screenshots/mobile/visitors.png) |

| Checklist | | |
|:---:|:---:|:---:|
| ![checklist](docs/screenshots/mobile/checklist.png) | | |

</details>

<details>
<summary><strong>AI, History & Export</strong> — AI Chat, Quick Log, Calendar, History, Data Export</summary>

| AI Chat | Quick Log | Calendar |
|:---:|:---:|:---:|
| ![ai-chat](docs/screenshots/mobile/ai-chat.png) | ![quick-log](docs/screenshots/mobile/quick-log.png) | ![calendar](docs/screenshots/mobile/calendar-all.png) |

| History & Reports | Data Export | Health Summary |
|:---:|:---:|:---:|
| ![history](docs/screenshots/mobile/history.png) | ![export](docs/screenshots/mobile/export.png) | ![health-summary](docs/screenshots/mobile/health-summary.png) |

</details>

<details>
<summary><strong>Settings & system</strong> — Settings, Alerts</summary>

| Settings | Alerts | More |
|:---:|:---:|:---:|
| ![settings](docs/screenshots/mobile/settings.png) | ![alerts](docs/screenshots/mobile/alerts.png) | ![more](docs/screenshots/mobile/more.png) |

</details>

---

## Report Examples

The app generates several downloadable reports. Text examples are shown below.

<details>
<summary><strong>Doctor Handoff Report — text format</strong> (generated from an illness episode)</summary>

```
DOCTOR HANDOFF REPORT
Baby — Illness Episode
Generated: Wed, Jun 1 at 9:14 AM
────────────────────────────────────────────────────────────

────────────────────────────────────────────────────────────
EPISODE SUMMARY
────────────────────────────────────────────────────────────
Status:             Resolved
Started:            Mon, May 30 at 6:00 PM
Ended:              Tue, May 31 at 4:00 PM
Duration:           22h
Reported by:        Parent 2
Peak temp:          101.6°F  (38.7°C)

────────────────────────────────────────────────────────────
SYMPTOMS
────────────────────────────────────────────────────────────
  • Fever
  • Runny nose
  • Fussiness

────────────────────────────────────────────────────────────
TEMPERATURE LOG
────────────────────────────────────────────────────────────
  Mon, May 30 at 7:00 PM          100.8°F  (38.2°C)         Forehead
  Mon, May 30 at 10:00 PM         101.6°F  (38.7°C)         Forehead
  Tue, May 31 at 4:00 AM          100.2°F  (37.9°C)         Forehead
  Tue, May 31 at 12:00 PM         98.9°F  (37.2°C)          Forehead

────────────────────────────────────────────────────────────
MEDICATIONS
────────────────────────────────────────────────────────────
  Infant Tylenol (2.5 mL)
    Mon, May 30 at 9:00 PM  — For fever
    Tue, May 31 at 6:00 AM  — Fever returning
  Saline nasal drops (2 drops each nostril)
    Mon, May 30 at 11:00 PM

────────────────────────────────────────────────────────────
CHRONOLOGICAL LOG
────────────────────────────────────────────────────────────

  Mon, May 30
    7:00 PM     Temperature   100.8°F  (38.2°C) — Forehead
    9:00 PM     Medication    Infant Tylenol — 2.5 mL
    10:00 PM    Temperature   101.6°F  (38.7°C) — Forehead
    11:00 PM    Medication    Saline nasal drops — 2 drops each nostril

  Tue, May 31
    4:00 AM     Temperature   100.2°F  (37.9°C) — Forehead
    6:00 AM     Medication    Infant Tylenol — 2.5 mL
    12:00 PM    Temperature   98.9°F  (37.2°C) — Forehead

────────────────────────────────────────────────────────────
NOTES
────────────────────────────────────────────────────────────
  Mild fever and congestion. Resolved within 24 hours.

────────────────────────────────────────────────────────────
Generated by private family tracker — not an official medical record.
```

A PDF version of the same report is also available via the illness detail page — one tap downloads a formatted, printer-ready document suitable for reading aloud to a nurse or handing to a doctor.

</details>

<details>
<summary><strong>Health Summary Report — representative output</strong> (generated from the Settings → Export page)</summary>

```
HEALTH SUMMARY
Baby — Health Overview
Generated: Thu, Jun 12 at 8:30 AM
This is an informal record generated by a private family app — not an official medical document.
────────────────────────────────────────────────────────────

────────────────────────────────────────────────────────────
VACCINATIONS RECEIVED (8 of 27 scheduled doses)
────────────────────────────────────────────────────────────
  HepB — Dose 1           Jun 1 at 8:45 AM      Lot: ABC123  Provider: Mercy Hospital
  HepB — Dose 2           Jun 4 at 9:00 AM      Lot: DEF456  Provider: Dr. Smith Pediatrics
  RV — Dose 1             Jun 4 at 9:00 AM      Lot: GHI789  Provider: Dr. Smith Pediatrics
  DTaP — Dose 1           Jun 4 at 9:00 AM      Lot: JKL012  Provider: Dr. Smith Pediatrics
  Hib — Dose 1            Jun 4 at 9:00 AM      Lot: MNO345  Provider: Dr. Smith Pediatrics
  PCV — Dose 1            Jun 4 at 9:00 AM
  IPV — Dose 1            Jun 4 at 9:00 AM
  Influenza — Dose 1      Jun 10 at 10:15 AM

────────────────────────────────────────────────────────────
MEDICATIONS (last 30 days)
────────────────────────────────────────────────────────────
  Infant Tylenol          2.5 mL          Jun 10 at 11:30 PM  — Post-vaccination fever
  Gripe Water             2.5 mL          Jun 11 at 7:00 PM

────────────────────────────────────────────────────────────
RECENT WEIGHT & HEIGHT
────────────────────────────────────────────────────────────
  Weight
    Jun 10    8 lb 14 oz
    Jun 4     8 lb 2 oz
    Jun 1     7 lb 8 oz   (birth weight)
  Height
    Jun 10    22.0 in
    Jun 4     21.0 in

────────────────────────────────────────────────────────────
FEEDING OVERVIEW (last 30 days — 847 sessions)
────────────────────────────────────────────────────────────
  Breastfeed    621 sessions    avg 18 min
  Bottle        226 sessions    avg 2.8 oz

────────────────────────────────────────────────────────────
SLEEP OVERVIEW (last 30 days — 186 sessions)
────────────────────────────────────────────────────────────
  Night sleep    31 sessions    avg 3h 20m
  Naps           155 sessions   avg 42m

────────────────────────────────────────────────────────────
This is an informal record generated by a private family app — not an official medical document.
```

The health summary is a compact, pediatrician-friendly PDF. Sections are customizable (vaccinations, medications, growth, feeding overview, sleep overview) and empty sections are automatically omitted.

</details>

<details>
<summary><strong>Raw Data Export — CSV sample</strong> (generated from the Settings → Export page)</summary>

Select any combination of data types, a date range (today, 7 days, 30 days, all time, or custom), and download as PDF or CSV. The CSV format is spreadsheet-ready with no transformation needed.

**feedings.csv (sample):**
```csv
startedAt,endedAt,type,durationSec,volumeOz,milkType,formulaName,notes
2026-06-11T14:30:00.000Z,2026-06-11T14:47:00.000Z,BREAST,1020,,,, 
2026-06-11T16:22:00.000Z,2026-06-11T16:35:00.000Z,BREAST,780,,,, 
2026-06-11T18:00:00.000Z,2026-06-11T18:10:00.000Z,BOTTLE,,3.5,FORMULA,Similac Pro-Advance,
2026-06-11T20:45:00.000Z,2026-06-11T21:02:00.000Z,BREAST,1020,,,, 
```

**sleep.csv (sample):**
```csv
startedAt,endedAt,type,notes
2026-06-11T13:00:00.000Z,2026-06-11T13:42:00.000Z,NAP,
2026-06-11T20:00:00.000Z,2026-06-12T01:15:00.000Z,NIGHT,
2026-06-12T01:20:00.000Z,2026-06-12T04:30:00.000Z,NIGHT,
```

Multi-type exports (e.g. feedings + sleep + diapers) download as a ZIP with one file per data type.

</details>

---

## What It Does

**Pregnancy prep:**
- Hospital bag checklists (mom's bag, baby's bag, home prep, before-you-leave) with per-item check-off
- Purchase tracker with status cycling (Needed → Bought / Gifted / Skip), price tracking, and auto-generated shortlinks for sharing items with family
- Visitor schedule planner with date, time window, and RSVP tracking
- Baby name shortlist — both parents add candidates with full-name preview (first + middle + surname) and real-time emoji reactions

**Daily newborn tracking:**
- Feeding log — live breastfeed timer with left/right side tracking, bottle volume entry, pump log; oz/mL toggle
- Sleep tracker — nap/night distinction, live timer, wake window indicator (time since last sleep)
- Diaper log — wet/dirty/both with color and consistency for dirty diapers
- Mood & activity log — mood selector, qualifier, and custom activity tags
- Home dashboard aggregating all current state across all trackers

**Health & growth:**
- Weight and height charts with WHO percentile overlays (0–6 month curves); dedicated Growth page with Weight/Height tabs
- Medication log — name (autocomplete from history), dosage, time, reason
- Tummy time — start/stop timer with daily total vs. 20–30 min/day goal
- Illness tracker — episode tracking with symptom list, temperature log, medication log, and one-tap PDF/text doctor handoff report
- Vaccination tracker — full CDC 0–18 month schedule displayed by age window; log doses with date, lot number, provider

**Planning & milestones:**
- Milestone checklist — pre-loaded CDC developmental milestones for 0–6 months, grouped by category (Motor, Communication, Social, Cognitive), with progress bars; add custom milestones
- Calendar view — monthly view with all events, filterable by type (feedings, sleep, diapers, etc.)
- History page — aggregate charts for feeding volumes, sleep durations, and diaper counts over time

**AI assistant:**
- Natural language quick log — type "fed 3oz bottle, seemed gassy" and the AI parses and logs it
- "Is This Normal?" conversational assistant — Claude has full access to baby's recent data to answer questions in context
- Weekly summary digest with pattern analysis

**Export & settings:**
- Data export page — select data types (feeding, sleep, diapers, growth, medications, tummy time, mood), date range, and format (PDF or CSV/ZIP)
- Health Summary report — compact PDF covering vaccinations, medications, weight/height, and feeding/sleep overviews; designed for pediatrician visits
- Settings — account management, passkey add/remove, push notification preferences (feeding reminder intervals, wake window alerts, weekly digest), display theme (dark/light/system), oz/mL unit preference

**Platform:**
- Real-time sync between both parents via Socket.io — one parent logs a feeding, the other's screen updates instantly
- Push notifications — feeding reminders, wake window alerts, SOS emergency alert; Android DND override via Web Push notification channel; iOS and Android DND override via Twilio phone call fallback
- Offline read access — cached data available when Tailscale drops; connection indicator on every screen
- PWA — installable on Android and iOS; biometric/passkey login (Face ID, fingerprint)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS + React Compiler |
| PWA | `vite-plugin-pwa` + Workbox |
| State | Zustand (UI) + TanStack Query (server) |
| Backend | Node.js + Express + TypeScript |
| Real-time | Socket.io |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | JWT (15-min access token in memory) + 30-day refresh (httpOnly cookie) + WebAuthn passkeys |
| AI | Anthropic Claude API (server-side only) + TanStack AI |
| Deployment | Docker Compose |
| Remote access | Tailscale |
| CI/CD | GitHub Actions → Docker Hub → Watchtower |

---

## Self-Hosting (Spin Up Your Own)

This app is designed to be forked and self-hosted by any family. No hardcoded names or family data exist in the codebase — everything is configured via environment variables and the database seed.

**[Full hosting guide →](docs/hosting.md)** — covers Cloudflare Tunnel, VPS (Hetzner/DigitalOcean), Railway, Render, and Fly.io in addition to the Tailscale + home server setup below.

### Prerequisites (Tailscale + home server)

- Docker + Docker Compose on your home server (Unraid, a NAS, a spare PC, etc.)
- [Tailscale](https://tailscale.com/) installed on your server and your phones — provides secure remote access without opening ports
- A free [Docker Hub](https://hub.docker.com/) account (for the CI/CD pipeline)
- A GitHub account (for the repo and GitHub Actions)

### 1. Fork and Clone

```bash
git clone https://github.com/your-username/tracker.git
cd tracker
```

### 2. Generate Secrets

```bash
# JWT secrets — generate two strong random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# VAPID keys (for push notifications)
cd packages/server
npx web-push generate-vapid-keys
```

### 3. Configure Environment

```bash
cp packages/server/.env.example packages/server/.env
cp packages/client/.env.example packages/client/.env
```

Edit `packages/server/.env`:

```env
DATABASE_URL=postgresql://tracker:tracker@db:5432/tracker
JWT_ACCESS_SECRET=<your-generated-secret>
JWT_REFRESH_SECRET=<your-generated-secret>
ANTHROPIC_API_KEY=<from-console.anthropic.com>
VAPID_PUBLIC_KEY=<generated>
VAPID_PRIVATE_KEY=<generated>
VAPID_EMAIL=mailto:your@email.com

# Your family's user accounts (used by the seed script)
SEED_USER_1_NAME=Parent1
SEED_USER_1_EMAIL=parent1@example.com
SEED_USER_1_PASSWORD=changeme

SEED_USER_2_NAME=Parent2
SEED_USER_2_EMAIL=parent2@example.com
SEED_USER_2_PASSWORD=changeme

# Optional: config
FAMILY_NAME=Baby Tracker
TIMEZONE=America/New_York

# AI safeguards (all optional — see below for details)
AI_ENABLED=true
AI_DAILY_CALL_LIMIT=200
AI_DAILY_COST_ALERT_USD=1.00
SEED_DATA_GUARD=false
```

#### AI environment variables

The server has four env vars for controlling the AI subsystem:

| Variable | Default | Purpose |
|---|---|---|
| `AI_ENABLED` | `true` (when key is set) | Master kill switch. Set to `false` to disable all AI routes without removing the key — useful for testing the app in a no-AI state. |
| `AI_DAILY_CALL_LIMIT` | `200` | Hard cap on total Anthropic API calls per calendar day across all routes. Returns HTTP 429 once hit. |
| `AI_DAILY_COST_ALERT_USD` | `1.00` | If estimated daily spend exceeds this amount, a banner appears in-app (via Socket.io event at 11 PM). |
| `SEED_DATA_GUARD` | `false` | **Set to `true` before running `npx prisma db seed`** to prevent accidental real API calls during data seeding. All AI routes return stubs and the weekly summary cron is suppressed. Flip it back to `false` when you're done seeding. |

For normal local development with AI working you only need `ANTHROPIC_API_KEY` — the other four can be omitted or left at their defaults.

Edit `packages/client/.env`:

```env
VITE_API_URL=https://<your-tailscale-hostname>
VITE_SOCKET_URL=https://<your-tailscale-hostname>
VITE_VAPID_PUBLIC_KEY=<same-as-server>
VITE_FAMILY_SURNAME=<your-family-surname>   # shown in baby name previews; optional
VITE_APP_URL=https://<your-tailscale-hostname>  # optional; enables purchase shortlinks
```

**`VITE_APP_URL` is optional.** When set, a shortlink copy button (🔗) appears on each purchase — it generates a short `/s/:code` URL that redirects to the original product. The `/s/:code` endpoint is public (no auth), so anyone who can reach your server can follow the redirect. If you're not using Tailscale or don't have a publicly accessible URL, leave it unset — the clipboard (📋) button always copies the original product URL directly, which works for everyone without needing server access.

### 4. Start the Stack

```bash
docker compose up
```

This starts PostgreSQL, the Express server, and the Vite dev client.

### 5. Create User Accounts

```bash
cd packages/server
npx prisma migrate dev
npx prisma db seed
```

This creates exactly two user accounts from your `SEED_USER_*` env vars. After first login, change passwords in Settings.

### 6. Set Up Tailscale

1. Install Tailscale on your server ([docs.tailscale.com](https://docs.tailscale.com/))
2. Install the Tailscale app on both phones
3. Sign in to the same Tailscale account on all three devices
4. Your server's Tailscale hostname (e.g. `myserver.tail1234.ts.net`) is your app's URL

### 7. Set Up CI/CD (Optional)

Push to `main` triggers automatic builds and deploys via Watchtower. Add these secrets and variables to your GitHub repo:

- `DOCKERHUB_USERNAME` (secret)
- `DOCKERHUB_TOKEN` (secret)
- `VITE_VAPID_PUBLIC_KEY` (secret — same as in `packages/server/.env`)
- `VITE_FAMILY_SURNAME` (repository variable — baked into the client bundle at build time)
- `VITE_APP_URL` (repository variable — your Tailscale hostname; used as the base URL for purchase shortlinks)

Configure Watchtower on your server to poll Docker Hub for new images.

---

## Local Development

```bash
# Start the full stack (PostgreSQL + server + client with hot reload)
docker compose up

# Or run services individually:
cd packages/server && npm run dev   # Express on port 3001
cd packages/client && npm run dev   # Vite on port 5173

# Database tools
cd packages/server
npx prisma migrate dev --name <migration-name>
npx prisma db seed
npx prisma studio    # Visual DB browser on port 5555
```

---

## Platform Compatibility

| Feature | Android (Chrome) | iOS Safari 16.4+ | Desktop browser |
|---|---|---|---|
| Core tracking | ✅ | ✅ | ✅ |
| Install to home screen | ✅ Auto prompt | ⚠️ Manual: Share → Add to Home Screen | ➖ N/A |
| Push notifications | ✅ | ✅ Requires Home Screen install | ➖ Limited |
| SOS alert (in-app) | ✅ | ✅ | ✅ |
| SOS override DND | ✅ With channel permission | ❌ Not possible via PWA — Twilio required | ➖ N/A |
| Passkey / biometric login | ✅ Fingerprint/Face | ✅ Face ID / Touch ID | ✅ Platform key |
| Offline read access | ✅ | ✅ | ✅ |
| Tailscale remote access | ✅ Native app | ✅ Native app | ✅ Browser |

**iOS note:** Push notifications require the app to be installed to the Home Screen (iOS 16.4+). SOS DND bypass is not possible via Web Push on iOS — the Twilio phone call fallback is the only reliable path. See `docs/project-plan.md` Phase 3.5 for details.

---

## Project Structure

```
tracker/
├── packages/
│   ├── client/          # Vite + React PWA
│   │   └── src/
│   │       ├── features/    # Feature-colocated components, hooks, api
│   │       ├── components/  # Shared UI components
│   │       ├── hooks/       # Shared hooks
│   │       ├── lib/         # axios, socket client, utils, queryClient
│   │       └── stores/      # Zustand stores
│   ├── server/          # Express + Socket.io + Prisma
│   │   └── src/
│   │       ├── routes/      # Express routers (one per feature)
│   │       ├── middleware/  # auth, error, rate-limit
│   │       ├── services/    # Business logic
│   │       ├── socket/      # Socket.io event handlers
│   │       └── lib/         # prisma client, anthropic client, cron
│   └── shared/          # Shared TypeScript types (no runtime deps)
├── docker/
│   ├── client.Dockerfile
│   ├── server.Dockerfile
│   ├── nginx.conf
│   └── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── project-plan.md    # Phased roadmap with acceptance criteria
│   ├── ADRs.md            # Architecture Decision Records
│   └── ai/
│       └── ai-integration.md  # Claude AI integration spec and prompts
├── docker-compose.yml
└── CLAUDE.md              # Claude Code context file
```

---

## Documentation

- **[docs/hosting.md](docs/hosting.md)** — Deployment options: Cloudflare Tunnel, VPS, Railway, Render, Fly.io
- **[docs/project-plan.md](docs/project-plan.md)** — Full phased roadmap, data model, acceptance criteria
- **[docs/ADRs.md](docs/ADRs.md)** — Architecture Decision Records explaining every major technical choice
- **[docs/ai/ai-integration.md](docs/ai/ai-integration.md)** — Claude AI integration spec: prompts, streaming, cost estimates, caching strategy
- **[CLAUDE.md](CLAUDE.md)** — Claude Code session context (conventions, current phase, where things live)

---

## Commit Conventions

All commits follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by `commitlint` + `husky`.

**Format:** `<type>(<scope>): <description>`

Common types: `feat`, `fix`, `chore`, `refactor`, `ci`, `db`, `docs`, `test`, `perf`

Common scopes: `auth`, `feeding`, `sleep`, `diaper`, `health`, `checklist`, `visitors`, `milestones`, `ai`, `sync`, `pwa`, `infra`, `db`, `ui`, `alerts`

---

## License

[MIT](LICENSE) — fork freely, self-host for your family, contribute back if you'd like.
