# Baby Tracker — Project Plan

**Delivery goal:** Built incrementally via daily development sessions. Phases are priority-ordered, not time-boxed.  
**Users:** Two parents (parent1 + parent2), real-time sync.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Repository Structure](#repository-structure)
3. [Data Model](#data-model)
4. [Infrastructure](#infrastructure)
5. [Phase Breakdown](#phase-breakdown)
6. [MVP Definition of Done](#mvp-definition-of-done)
7. [Risk Log](#risk-log)

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend framework | React 19 + TypeScript + React Compiler | Automatic memoization; strong ecosystem |
| Forms | React Hook Form + Zod | Type-safe forms with schema validation shared across client and server |
| Build tool | Vite | Fast HMR, first-class PWA plugin support |
| Styling | Tailwind CSS | Rapid UI iteration; utility-first suits a solo builder |
| PWA | vite-plugin-pwa + Workbox | Service worker generation, manifest, offline caching |
| Backend | Node.js + Express + TypeScript | Consistent language across stack |
| Database | PostgreSQL 16 | Relational model; ACID transactions; concurrent writes |
| ORM | Prisma | Type-safe queries; migrations-as-code |
| Real-time | Socket.io | Simple two-client sync; works over Tailscale |
| Auth | JWT (short-lived access + refresh tokens) + WebAuthn passkeys | Lightweight for 2 users; biometric login on mobile |
| Container | Docker + Docker Compose | Portable; matches Unraid/home-server stack |
| Reverse proxy | Nginx | TLS termination, static file serving, WebSocket proxying |
| Remote access | Tailscale | Zero-config VPN; no port forwarding; secure |
| CI/CD | GitHub Actions → Docker Hub → Watchtower | Fully automated deploy on push to `main` |
| AI | Anthropic Claude API (server-side only) | Natural language logging, pattern analysis, assistant |
| AI streaming | TanStack AI (`@tanstack/ai` + `@tanstack/ai-react`) | Streaming AI chat with Anthropic adapter; pin exact version (no `^`) |

---

## Repository Structure

```
tracker/
├── .github/
│   └── workflows/
│       ├── ci.yml              # lint, typecheck, test on PR
│       └── deploy.yml          # build + push Docker images on main
├── packages/
│   ├── shared/                 # shared TypeScript types and Zod schemas
│   │   └── src/
│   │       ├── types/
│   │       └── schemas/
│   ├── client/                 # Vite + React PWA
│   │   └── src/
│   │       ├── components/     # shared UI components
│   │       ├── features/       # co-located feature modules
│   │       │   ├── feeding/
│   │       │   ├── sleep/
│   │       │   ├── diaper/
│   │       │   ├── checklist/
│   │       │   ├── visitors/
│   │       │   ├── purchases/
│   │       │   ├── health/
│   │       │   ├── mood/
│   │       │   ├── milestones/
│   │       │   ├── ai/
│   │       │   └── alerts/
│   │       ├── hooks/
│   │       ├── lib/            # axios, socket client, utils, queryClient
│   │       └── stores/         # Zustand stores
│   └── server/                 # Express API
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── src/
│           ├── routes/
│           ├── middleware/
│           ├── services/
│           ├── socket/
│           └── lib/
├── docker/
│   ├── client.Dockerfile
│   ├── server.Dockerfile
│   └── nginx.conf
├── docs/
│   ├── ADRs.md
│   ├── project-plan.md         # This file
│   └── ai/
│       └── ai-integration.md
├── docker-compose.yml          # local dev
├── docker-compose.prod.yml     # production overrides
└── CLAUDE.md                   # Claude Code session context
```

---

## Data Model

### Core Entities

```prisma
model User {
  id             String           @id @default(cuid())
  email          String           @unique
  name           String
  passwordHash   String
  role           Role             @default(PARENT)
  createdAt      DateTime         @default(now())
  babies         BabyUser[]
  logs           Log[]
  refreshTokens  RefreshToken[]
  alertsSent     EmergencyAlert[] @relation("AlertsSent")
  alertsReceived EmergencyAlert[] @relation("AlertsReceived")
}

model Baby {
  id          String    @id @default(cuid())
  name        String?   // Optional — may not be chosen during pregnancy
  dueDate     DateTime?
  birthDate   DateTime?
  createdAt   DateTime  @default(now())
  parents     BabyUser[]
  feedingLogs FeedingLog[]
  sleepLogs   SleepLog[]
  diaperLogs  DiaperLog[]
  weightLogs  WeightLog[]
  heightLogs  HeightLog[]
  medicationLogs MedicationLog[]
  tummyTimeLogs  TummyTimeLog[]
  moodLogs        MoodLog[]
  milestones      Milestone[]
  checklists      Checklist[]
  emergencyAlerts EmergencyAlert[]
}

// Volume stored in oz; multiply by 29.5735 for mL display
model FeedingLog {
  id          String      @id @default(cuid())
  babyId      String
  baby        Baby        @relation(fields: [babyId], references: [id])
  loggedById  String
  loggedBy    User        @relation(fields: [loggedById], references: [id])
  type        FeedingType  // BREAST_LEFT | BREAST_RIGHT | BOTTLE | PUMP
  startedAt   DateTime
  endedAt     DateTime?
  durationSec Int?
  volumeOz    Float?
  notes       String?
  createdAt   DateTime    @default(now())
}

model SleepLog {
  id         String    @id @default(cuid())
  babyId     String
  baby       Baby      @relation(fields: [babyId], references: [id])
  loggedById String
  loggedBy   User      @relation(fields: [loggedById], references: [id])
  type       SleepType  // NAP | NIGHT
  startedAt  DateTime
  endedAt    DateTime?
  notes      String?
  createdAt  DateTime  @default(now())
}

model DiaperLog {
  id                 String             @id @default(cuid())
  babyId             String
  baby               Baby               @relation(fields: [babyId], references: [id])
  loggedById         String
  loggedBy           User               @relation(fields: [loggedById], references: [id])
  type               DiaperType         // WET | DIRTY | BOTH
  color              DiaperColor?
  consistency        DiaperConsistency?
  customConsistency  String?
  occurredAt         DateTime
  notes              String?
  createdAt          DateTime           @default(now())
}

model WeightLog {
  id         String   @id @default(cuid())
  babyId     String
  baby       Baby     @relation(fields: [babyId], references: [id])
  loggedById String
  lbs        Int      // whole pounds
  oz         Float    // ounces (0–15.9)
  recordedAt DateTime
  notes      String?
  createdAt  DateTime @default(now())
}

model ChecklistItem {
  id          String    @id @default(cuid())
  checklistId String
  checklist   Checklist @relation(fields: [checklistId], references: [id])
  category    String
  label       String
  notes       String?
  isChecked   Boolean   @default(false)
  checkedAt   DateTime?
  checkedById String?
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
}

model VisitorSlot {
  id        String    @id @default(cuid())
  babyId    String
  name      String
  date      String    // YYYY-MM-DD — always required; used for grouping and ordering
  startTime DateTime? // optional — time window start
  endTime   DateTime? // optional — always after startTime when provided
  notes     String?
  createdAt DateTime  @default(now())
}

model Purchase {
  id         String         @id @default(cuid())
  babyId     String
  baby       Baby           @relation(fields: [babyId], references: [id])
  name       String
  category   String
  status     PurchaseStatus // NEEDED | BOUGHT | GIFTED | SKIP
  price      Float?
  notes      String?
  url        String?
  createdAt  DateTime       @default(now())
}

model EmergencyAlert {
  id         String      @id @default(cuid())
  babyId     String
  sentById   String
  sentToId   String
  message    String?
  status     AlertStatus @default(SENT)
  sentAt     DateTime    @default(now())
  seenAt     DateTime?
}
```

### Key Enums

- `FeedingType`: `BREAST_LEFT`, `BREAST_RIGHT`, `BOTTLE`, `PUMP`
- `SleepType`: `NAP`, `NIGHT`
- `DiaperType`: `WET`, `DIRTY`, `BOTH`
- `ChecklistType`: `HOSPITAL_BAG_MOM`, `HOSPITAL_BAG_BABY`, `HOME_PREP`, `BEFORE_HOME`, `PURCHASES`
- `PurchaseStatus`: `NEEDED`, `BOUGHT`, `GIFTED`, `SKIP`
- `Role`: `PARENT`, `ADMIN`
- `MilestoneCategory`: `MOTOR_GROSS`, `MOTOR_FINE`, `SOCIAL`, `LANGUAGE`, `COGNITIVE`, `FEEDING`, `CUSTOM`

---

## Infrastructure

### Architecture

```
[parent1's phone]  [parent2's phone]
        |                  |
        +---[Tailscale VPN]---+
                   |
           [Home Server]
                   |
           [Docker Engine]
                   |
       +-----------+-----------+
       |           |           |
    [Nginx]    [Server]   [Postgres]
    port 443   port 3001   port 5432
       |           |
    [Client]   [Prisma]
    (static)   [Socket.io]
```

- **Nginx** terminates HTTPS, serves the React build, and proxies `/api` and `/socket.io` to Express.
- **Express** runs on port 3001 (internal only), handles REST + WebSocket upgrade.
- **PostgreSQL** runs on port 5432 (internal only, not exposed outside Compose network).
- **Tailscale** on the home server provides the stable hostname for remote access.

### CI/CD Flow

```
Push to main
    → GitHub Actions:
        1. npm run lint
        2. npm run typecheck
        3. npm run test (must pass before build)
        4. npm run build
        5. docker buildx build multi-arch (linux/amd64 + linux/arm64)
        6. Push to Docker Hub (latest + git SHA tag)
    → Watchtower auto-deploys within ~5 minutes
```

PRs that fail lint, typecheck, or tests are blocked from merge.

---

## Phase Breakdown

### Phase 1: Foundation ✅ Complete

**Goal:** Both users can log in and the deployment pipeline works end-to-end.

- [x] Monorepo scaffolding with npm workspaces
- [x] Vite + React + TypeScript + Tailwind client
- [x] Express + TypeScript server
- [x] Shared types package
- [x] ESLint + Prettier across all packages
- [x] Initial Prisma schema (User, Baby, BabyUser, RefreshToken)
- [x] JWT login/refresh endpoints + authMiddleware
- [x] Seed script (configurable via env vars — no hardcoded names)
- [x] Client login page + token storage + axios auto-refresh interceptor
- [x] WebAuthn/passkey registration + authentication endpoints
- [x] Passkey login flow on client (biometric on Android/iOS)
- [x] Docker Dockerfiles + docker-compose.yml + nginx.conf
- [x] GitHub Actions CI (lint, typecheck, build on every PR)
- [x] GitHub Actions deploy (multi-arch Docker push on merge to main)
- [ ] Confirm end-to-end Docker local run
- [ ] Watchtower on home server
- [ ] Tailscale install on server + first production deploy

### Phase 2: Pregnancy Features ✅ Complete

**Goal:** All pre-birth planning features complete before due date.

#### Database + API ✅

- [x] Checklist, ChecklistItem, Purchase, VisitorSlot in Prisma schema + migrate
- [x] REST CRUD for checklist items (check/uncheck, reorder, add custom)
- [x] REST CRUD for purchases
- [x] REST CRUD for visitor slots
- [x] Socket.io: emit `checklist:updated` and `purchase:updated` for real-time sync

#### Hospital Bag + Purchases UI ✅

- [x] Hospital Bag checklist UI — tabs: Mom's Bag / Baby's Bag / Home Prep / Before Home
- [x] Items grouped by category; default items pre-seeded via seed script; add custom items
- [x] Check/uncheck with timestamp; checked items visually distinct
- [x] Purchases tracker — grouped by category; status cycle: Needed → Bought / Gifted / Skip
- [x] Progress summary (e.g. "12 of 30 acquired"); SKIP items visually dimmed

**Acceptance criteria:**
- One parent checks an item; the other sees it update within 2 seconds ✅
- Default hospital bag items pre-populated on first load ✅

#### Home Prep + Before We Get Home Checklists ✅

- [x] Home Prep list UI (pre-arrival tasks) — tab in ChecklistPage
- [x] "Before We Get Home" checklist — tab in ChecklistPage
- [x] Same component pattern as hospital bag, different `ChecklistType`
- [x] Default items pre-seeded

#### Visitor Schedule Planner ✅

- [x] Visitor Schedule UI — list view grouped by month
- [x] Add visitor slot: name, date, optional time window, notes
- [x] Delete slots
- [x] Mobile-friendly quick-add form

**Acceptance criteria:**
- Can schedule 10+ visitor slots without UI degradation ✅

### Phase 3: Newborn Tracking Core

**Goal:** Core daily tracking loop works flawlessly for two exhausted parents. Speed and reliability paramount.

#### Feeding Tracker

- [ ] FeedingLog in Prisma schema + migrate
- [ ] REST endpoints (log, paginated list, active session start/end)
- [ ] Socket.io: `feeding:created`
- [ ] Quick-log UI: large tap targets for Left Breast / Right Breast / Bottle / Pump
- [ ] Live breastfeed timer (server-anchored `startedAt`, not local state)
- [ ] Bottle: oz/mL input with unit toggle; Pump: volume + duration

**Acceptance criteria:**
- Log a breast feed in under 3 taps
- If one parent starts a timer, the other sees it live via Socket.io

#### Sleep Tracker

- [ ] SleepLog schema + REST + Socket.io
- [ ] Nap / Night Sleep start/stop timer UI
- [ ] Wake window indicator (time since last sleep ended)

#### Diaper Log

- [ ] DiaperLog schema + REST + Socket.io
- [ ] Wet / Dirty / Both quick buttons
- [ ] For dirty: color picker + consistency selector + custom entry

#### Home Dashboard

- [ ] Aggregates: last feeding, current sleep status, today's diaper count, next feeding estimate
- [ ] Bottom navigation: Dashboard / Feed / Sleep / Diaper / More

#### Real-Time Sync Hardening

- [ ] Reconnect logic: re-fetch latest state on socket reconnect
- [ ] Optimistic updates: log appears immediately; reverts on API error
- [ ] Offline indicator: banner when socket disconnected
- [ ] Concurrent logging test: both parents log simultaneously — no duplicates, no crashes

### Phase 3.5: Emergency SOS Alert

**Goal:** Either parent can send a critical alert that reliably overrides Android Do Not Disturb.

Key tasks:
- EmergencyAlert model in Prisma
- `POST /api/alerts/sos` → Web Push with `urgency: "high"`, `requireInteraction: true`
- Service worker: play alarm audio on push receive
- Android `emergency-alert` notification channel with `IMPORTANCE_MAX` (prompts DND-override permission)
- Twilio phone call fallback (optional for Android-only; **required** for any iOS user)
- Client: SOS button with 2-second hold-to-confirm anti-pocket-fire protection
- Recipient: full-screen takeover when app is open
- `PATCH /api/alerts/:id/acknowledge` + 60-second send cooldown

**iOS note:** Web Push cannot bypass DND on iOS under any circumstances. Twilio phone call is the only reliable path for iOS users.

**Acceptance criteria:**
- Alert arrives within 3 seconds; plays audible alarm even on vibrate/silent
- Accidental sends prevented by 2-second hold requirement
- Sender sees "Seen" status update in real time after recipient acknowledges

### Phase 4: Health & Growth

- Medication log with autocomplete from history
- Weight tracking + Recharts growth chart with WHO percentile overlay
- Height tracking
- Tummy time log with start/stop timer
- Mood/activity log (icon grid: Happy, Fussy, Crying, Alert, Bath, Walk, etc.)
- Daily summary view + 7-day feeding/sleep/diaper summaries

### Phase 5: AI Integration

See **[docs/ai/ai-integration.md](ai/ai-integration.md)** for full spec, prompts, and implementation patterns.

Summary:
1. **Natural Language Logging** — type or dictate a sentence; Claude Haiku parses it into structured log entries. Highest daily value, cheapest to run.
2. **"Is This Normal?" Assistant** — multi-turn chat with Claude Sonnet, baby's 14-day log summary as context; hard guardrail on every response.
3. **Weekly Digest** — Sunday 8pm cron; generates narrative summary; exportable to PDF.
4. **Pattern Analysis** — feeding interval and sleep pattern recognition; cached, invalidated on new logs.

Monthly cost estimate for 2 users: ~$4.

### Phase 6: Polish

- Milestone tracking (CDC developmental milestones for months 0–6, pre-seeded)
- Data export: PDF for pediatrician visits, CSV raw export
- Push notifications: VAPID-based feeding reminders
- PWA offline write queue: logs made offline sync when connection restores
- Dark mode (Tailwind `dark:` classes + system preference)
- Lighthouse PWA score ≥ 90

---

## MVP Definition of Done

The app is MVP-ready when **all of the following are true**:

### Deployment
- [ ] App deployed on home server, accessible via Tailscale from both phones
- [ ] CI/CD pipeline deploys updates automatically from `main`
- [ ] HTTPS works (no browser security warnings on mobile)

### Auth
- [ ] Both parents have accounts
- [ ] Login works reliably; sessions persist across app restarts

### Core Tracking (Phase 3 complete)
- [ ] Breast feeding log with live timer
- [ ] Bottle feeding log
- [ ] Sleep tracking with timer
- [ ] Diaper log (wet + dirty with color)
- [ ] Dashboard shows last feeding, current sleep status, today's diaper count

### Real-Time Sync
- [ ] Action on one phone appears on the other within 3 seconds

### Pregnancy Prep (Phase 2 complete)
- [ ] Hospital bag checklists populated and usable
- [ ] Purchases tracker works
- [ ] Home prep lists work

### Reliability
- [ ] App recovers from network interruption without data loss
- [ ] No crashes in normal daily use for 3 consecutive days of testing

### Non-Goals for MVP (acceptable to defer)
- AI features (Phase 5)
- PDF export
- Push notification reminders
- Milestone tracking

---

## Risk Log

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Time crunch before due date** | Medium | High | Phases 1–3 are the hard MVP. Cut Phases 4–6 ruthlessly before the deadline if needed. |
| 2 | **Home server or Tailscale outage during first weeks** | Low | High | Test Tailscale failover before due date. Document manual restart steps. Keep 48-hour offline cache via service worker. |
| 3 | **Both parents too exhausted to use a complex UI** | Medium | High | Every core action must require ≤ 3 taps. Prioritize NL quick-log in Phase 5 if it's done. |
| 4 | **Anthropic API cost or rate limit** | Low | Medium | Use Claude Haiku for NL parsing. Cache pattern analysis for 1 hour. Add 20 query/day limit on chat assistant. Set billing alert at $20/month. |
| 5 | **Real-time sync bugs under sleep-deprived concurrent use** | Medium | Medium | Last-write-wins conflict resolution. Comprehensive server logging for all Socket.io events. Explicit concurrent-logging test before go-live. |

---

## Conventions Summary

### API

- All responses: `{ data: T | null, error: string | null, meta?: { ... } }`
- All IDs: CUID (`@default(cuid())`)
- All timestamps: UTC in DB; client converts to local for display
- Auth: `Authorization: Bearer <access_token>` header on all protected routes

### Socket.io Events

`resource:action` pattern: `feeding:created`, `sleep:ended`, `checklist:item:toggled`, `alert:sos`

### State Management

- Zustand: global UI state only (current user, active timers, socket status, theme)
- TanStack Query: all server data — caching, background refetch, optimistic updates
- On socket event: `queryClient.invalidateQueries([key])` — never manually merge payloads

### Mobile-First

- Minimum tap target: 44×44px
- Primary action buttons: full-width on mobile
- Test on actual phones regularly — not just DevTools emulation

### Testing (Vitest)

- Server: route handlers (supertest), service logic, auth middleware
- Client: utility functions, Zod schemas, custom hooks (React Testing Library)
- Test files: `*.test.ts` / `*.test.tsx` co-located with the file they test

---

*Last updated: 2026-05-17*
