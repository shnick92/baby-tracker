# Baby Tracker

A private, self-hosted Progressive Web App for tracking pregnancy milestones and newborn care. Built for two parents on a home server — no data leaves your network.

---

## What It Does

**Pregnancy phase:**
- Hospital bag checklists (mom's bag, baby's bag, home prep, before-you-leave)
- Purchase tracker with status cycling (Needed → Bought / Gifted / Skip)
- Visitor schedule planner with optional time windows

**Newborn phase (Phase 3+):**
- Feeding log with live breastfeed timer (left/right side tracking) and bottle/pump volume entry
- Sleep tracker with nap/night distinction and wake window indicator
- Diaper log with color and consistency for dirty diapers
- Home dashboard aggregating all current tracking state
- Real-time sync between both parents' phones via Socket.io

**Health & AI (later phases):**
- Weight/height growth charts with WHO percentile overlays
- Natural language logging ("fed 3oz bottle, seemed gassy") parsed by Claude Haiku
- Pattern analysis and next-feeding predictions
- "Is This Normal?" conversational assistant with baby's actual data as context
- Weekly summary digest, exportable to PDF for pediatrician visits
- Emergency SOS alert with Android DND-override push notification

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

### Prerequisites

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
```

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

Push to `main` triggers automatic builds and deploys via Watchtower. Add these secrets to your GitHub repo:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

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

Private — not licensed for public distribution. Fork freely for personal, non-commercial self-hosting.
