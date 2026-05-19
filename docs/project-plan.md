# Baby Tracker — Project Plan

**Delivery goal:** Built incrementally via daily development sessions. Phases are priority-ordered, not time-boxed.  
**Users:** Two parents, real-time sync.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Repository Structure](#repository-structure)
3. [Data Model](#data-model)
4. [Infrastructure](#infrastructure)
5. [Phase Breakdown](#phase-breakdown)
   - [Phase 1: Foundation](#phase-1-foundation)
   - [Phase 2: Pregnancy Features](#phase-2-pregnancy-features)
   - [Phase 3: Newborn Tracking Core](#phase-3-newborn-tracking-core)
   - [Phase 3.5: Emergency SOS Alert](#phase-35-emergency-sos-alert)
   - [Phase 4: Health & Growth](#phase-4-health--growth)
   - [Phase 5: AI Integration](#phase-5-ai-integration)
   - [Phase 6: Polish](#phase-6-polish)
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
| Backend | Node.js + Express + TypeScript | Consistent language across stack; easy to deploy |
| Database | PostgreSQL 16 | Relational model suits time-series logs; ACID transactions |
| ORM | Prisma | Type-safe queries; migrations-as-code; great DX |
| Real-time | Socket.io | Simple two-client sync; works over Tailscale |
| Auth | JWT (short-lived access + refresh tokens) + WebAuthn passkeys | Lightweight for 2 users; biometric login on mobile |
| Container | Docker + Docker Compose | Portable; matches Unraid stack |
| Reverse proxy | Nginx (in Compose) | TLS termination, static file serving, WebSocket proxying |
| Remote access | Tailscale | Zero-config VPN; no port forwarding; secure |
| CI/CD | GitHub Actions → Docker Hub → Watchtower | Fully automated deploy on push to `main` |
| AI | Anthropic Claude API (server-side only) | Natural language logging, pattern analysis, assistant |
| AI streaming | TanStack AI (`@tanstack/ai` + `@tanstack/ai-react`) | Streaming AI chat with Anthropic adapter; pin exact version (no `^`) |

---

## Repository Structure

Monorepo with workspaces. Keep frontend and backend close — shared types are worth it.

```
tracker/
├── .github/
│   └── workflows/
│       ├── ci.yml              # lint, typecheck, test on PR
│       └── deploy.yml          # build + push Docker images on main
├── packages/
│   ├── shared/                 # shared TypeScript types and Zod schemas
│   │   ├── src/
│   │   │   ├── types/          # User, Baby, FeedingLog, etc.
│   │   │   └── schemas/        # Zod validation schemas
│   │   └── package.json
│   ├── client/                 # Vite + React PWA
│   │   ├── public/
│   │   │   └── icons/          # PWA icons (192px, 512px, maskable)
│   │   ├── src/
│   │   │   ├── components/     # shared UI components
│   │   │   ├── features/       # co-located feature modules
│   │   │   │   ├── feeding/
│   │   │   │   ├── sleep/
│   │   │   │   ├── diaper/
│   │   │   │   ├── checklist/
│   │   │   │   └── ai/
│   │   │   ├── hooks/          # useSocket, useAuth, useTimer, etc.
│   │   │   ├── lib/            # axios instance, socket client, utils
│   │   │   ├── pages/          # route-level components
│   │   │   ├── store/          # Zustand global state
│   │   │   └── main.tsx
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── server/                 # Express API
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── src/
│       │   ├── routes/         # feeding.ts, sleep.ts, diaper.ts, etc.
│       │   ├── middleware/      # auth.ts, errorHandler.ts
│       │   ├── services/       # business logic layer
│       │   ├── socket/         # Socket.io event handlers
│       │   ├── ai/             # Anthropic integration
│       │   └── index.ts
│       └── package.json
├── docker/
│   ├── client.Dockerfile
│   ├── server.Dockerfile
│   └── nginx.conf
├── docs/
│   ├── ADRs.md
│   ├── project-plan.md
│   └── ai/
│       ├── ai-integration.md
│       └── claude.md
├── docker-compose.yml          # local dev
├── docker-compose.prod.yml     # production overrides
└── package.json                # workspace root
```

**Key convention:** Features are co-located. `packages/client/src/features/feeding/` contains its own components, hooks, API calls, and types — no hunting across the tree.

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
  id          String   @id @default(cuid())
  name        String?  // Optional — may not be chosen yet during pregnancy
  dueDate     DateTime?
  birthDate   DateTime?
  createdAt   DateTime @default(now())
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

model BabyUser {
  babyId String
  userId String
  baby   Baby   @relation(fields: [babyId], references: [id])
  user   User   @relation(fields: [userId], references: [id])
  @@id([babyId, userId])
}

// Volume stored in oz; multiply by 29.5735 to display as mL
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
  volumeOz    Float?       // fluid ounces; UI offers mL/oz toggle, stored normalized as oz
  notes       String?
  createdAt   DateTime    @default(now())
}

model SleepLog {
  id         String   @id @default(cuid())
  babyId     String
  baby       Baby     @relation(fields: [babyId], references: [id])
  loggedById String
  loggedBy   User     @relation(fields: [loggedById], references: [id])
  type       SleepType  // NAP | NIGHT
  startedAt  DateTime
  endedAt    DateTime?
  notes      String?
  createdAt  DateTime @default(now())
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

model HeightLog {
  id         String   @id @default(cuid())
  babyId     String
  baby       Baby     @relation(fields: [babyId], references: [id])
  loggedById String
  inches     Float
  recordedAt DateTime
  notes      String?
  createdAt  DateTime @default(now())
}

model MedicationLog {
  id         String   @id @default(cuid())
  babyId     String
  baby       Baby     @relation(fields: [babyId], references: [id])
  loggedById String
  name       String
  dosageMg   Float?
  dosageNote String?
  givenAt    DateTime
  notes      String?
  createdAt  DateTime @default(now())
}

model TummyTimeLog {
  id          String   @id @default(cuid())
  babyId      String
  baby        Baby     @relation(fields: [babyId], references: [id])
  loggedById  String
  startedAt   DateTime
  durationSec Int
  notes       String?
  createdAt   DateTime @default(now())
}

model MoodLog {
  id         String    @id @default(cuid())
  babyId     String
  baby       Baby      @relation(fields: [babyId], references: [id])
  loggedById String
  mood       MoodType  // HAPPY | FUSSY | CRYING | SLEEPING | ALERT | BATH | WALK
  occurredAt DateTime
  notes      String?
  createdAt  DateTime  @default(now())
}

model Checklist {
  id        String         @id @default(cuid())
  babyId    String
  baby      Baby           @relation(fields: [babyId], references: [id])
  type      ChecklistType  // HOSPITAL_BAG_MOM | HOSPITAL_BAG_BABY | HOME_PREP | BEFORE_HOME | PURCHASES
  items     ChecklistItem[]
  createdAt DateTime       @default(now())
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
  endTime   DateTime? // optional — time window end; always after startTime when provided
  notes     String?
  createdAt DateTime  @default(now())
}

model Milestone {
  id          String            @id @default(cuid())
  babyId      String
  baby        Baby              @relation(fields: [babyId], references: [id])
  category    MilestoneCategory
  label       String
  achievedAt  DateTime?
  notes       String?
  createdAt   DateTime          @default(now())
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

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model EmergencyAlert {
  id         String            @id @default(cuid())
  babyId     String
  baby       Baby              @relation(fields: [babyId], references: [id])
  sentById   String
  sentBy     User              @relation("AlertsSent", fields: [sentById], references: [id])
  sentToId   String
  sentTo     User              @relation("AlertsReceived", fields: [sentToId], references: [id])
  message    String?
  status     AlertStatus       @default(SENT)
  sentAt     DateTime          @default(now())
  seenAt     DateTime?
}
```

### Enums
- `FeedingType`: `BREAST_LEFT`, `BREAST_RIGHT`, `BOTTLE`, `PUMP`
- `SleepType`: `NAP`, `NIGHT`
- `DiaperType`: `WET`, `DIRTY`, `BOTH`
- `DiaperColor`: `YELLOW`, `GREEN`, `BROWN`, `BLACK`, `RED`, `OTHER`
- `DiaperConsistency`: `SEEDY`, `PASTY`, `RUNNY`, `FIRM`, `WATERY`, `CUSTOM`
- `MoodType`: `HAPPY`, `FUSSY`, `CRYING`, `SLEEPING`, `ALERT`, `BATH`, `WALK`
- `ChecklistType`: `HOSPITAL_BAG_MOM`, `HOSPITAL_BAG_BABY`, `HOME_PREP`, `BEFORE_HOME`, `PURCHASES`
- `PurchaseStatus`: `NEEDED`, `BOUGHT`, `GIFTED`, `SKIP`
- `Role`: `PARENT`, `ADMIN`
- `MilestoneCategory`: `MOTOR_GROSS`, `MOTOR_FINE`, `SOCIAL`, `LANGUAGE`, `COGNITIVE`, `FEEDING`, `CUSTOM`

---

## Infrastructure

### Architecture

```
[Parent 1 Phone]  [Parent 2 Phone]
      |               |
      +--[Tailscale VPN]--+
                |
        [Unraid Server]
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

- **Nginx** terminates HTTPS via Tailscale TLS certs, serves the React build, and proxies `/api` and `/socket.io` to the Express server.
- **Express** runs on port 3001 (internal only).
- **PostgreSQL** runs on port 5432 (internal only).
- **Tailscale** provides encrypted peer-to-peer remote access.

### CI/CD Flow

```
Push to main
    → GitHub Actions:
        1. npm run lint (ESLint across all packages)
        2. npm run typecheck (tsc --noEmit)
        3. npm run build
        4. docker buildx build multi-arch
        5. Push to Docker Hub
    → Watchtower auto-deploys
```

---

## Phase Breakdown

### Phase 1: Foundation ✅ Complete

**Goal:** Both users can log in and the deployment pipeline works end-to-end.

#### Scaffolding

- [x] Init monorepo with npm workspaces
- [x] Scaffold `packages/client` with Vite + React + TypeScript + Tailwind
- [x] Install and configure `vite-plugin-pwa` (manifest, service worker skeleton)
- [x] Scaffold `packages/server` with Express + TypeScript + tsx for dev
- [x] Scaffold `packages/shared` with shared types
- [x] Configure ESLint + Prettier across all packages
- [x] Set up `tsconfig` references between packages

#### Database + Auth

- [x] Write initial Prisma schema (User, Baby, BabyUser, RefreshToken)
- [x] Run first migration locally
- [x] Implement POST `/api/auth/login` — returns access token (15 min) + refresh token (30 days)
- [x] Implement POST `/api/auth/refresh`
- [x] Implement `authMiddleware` — validates JWT on protected routes
- [x] Seed script: create parent accounts, create Baby record
- [x] Client: Login page, token storage (httpOnly cookie for refresh, memory for access), axios interceptor for auto-refresh
- [x] Implement WebAuthn/passkey registration endpoint
- [x] Implement WebAuthn/passkey authentication endpoint
- [x] Client: "Add passkey" flow on Android Chrome
- [x] Client: passkey login option on login screen alongside password

**Acceptance criteria:**
- Both users can log in from their phones
- Access token auto-refreshes without re-login
- Users can log in via passkey/biometric after initial setup

#### Docker + Infrastructure

- [x] Write `client.Dockerfile` (multi-stage: build → nginx)
- [x] Write `server.Dockerfile` (multi-stage: build → node)
- [x] Write `docker-compose.yml` for local dev
- [x] Write `docker-compose.prod.yml` for production
- [x] Write `nginx.conf` — serve static files, proxy `/api/*` and `/socket.io/*`
- [x] Confirm app runs end-to-end in Docker locally

#### CI/CD + Unraid Deploy 

- [x] GitHub Actions `ci.yml`: lint, typecheck, build on every PR
- [x] GitHub Actions `deploy.yml`: build multi-arch Docker images, push to Docker Hub on merge to `main`
- [x] Configure Watchtower on Unraid to watch `tracker-client` and `tracker-server`
- [x] Install Tailscale on Unraid; get stable Tailscale IP/hostname
- [x] First production deploy; verify both phones can reach app on Tailscale

**Acceptance criteria:**
- Push to `main` → new images deployed to Unraid automatically within 10 minutes
- Both phones can open the app via Tailscale URL and log in

---

### Phase 2: Pregnancy Features

**Goal:** All pre-birth planning features are complete. This phase should be done well before the due date.

#### Pregnancy Progress Widget ✅ Complete

- [x] Add `GET /api/pregnancy/status?babyId=` endpoint — returns `{ weeksPregnant, weeksRemaining, progressPct, babySize, dueDate }`
- [x] Server-side week calculation from `Baby.dueDate`; hardcoded week-by-week baby size lookup table (weeks 4–40)
- [x] Client: `usePregnancyStatus(babyId)` hook via TanStack Query; stale time 1 hour
- [x] `<PregnancyProgressWidget>` component — circular SVG progress ring, week number, baby size, due date
- [x] Hide widget entirely after birth
- [x] `<PregnancyProgressSkeleton>` — same dimensions as loaded widget

**Acceptance criteria:**
- Widget shows correct week number and baby size on first load with no layout shift
- Widget is absent from all screens once birth is recorded

---

#### Database + API for Checklists and Purchases ✅ Complete

- [x] Add Checklist, ChecklistItem, Purchase, VisitorSlot to Prisma schema + migrate
- [x] REST endpoints: CRUD for checklist items (check/uncheck, reorder, add custom)
- [x] REST endpoints: CRUD for purchases
- [x] REST endpoints: CRUD for visitor slots
- [x] Socket.io: emit `checklist:updated` and `purchase:updated` events

#### Hospital Bag + Purchases UI ✅ Complete

- [x] Hospital Bag Checklist UI — two tabs: Mom's Bag / Baby's Bag
- [x] Items grouped by category; default items pre-seeded; ability to add custom items
- [x] Check/uncheck with timestamp; checked items visually distinct but not hidden
- [x] Purchases Tracker UI — grouped by category
- [x] Status toggle: Needed → Bought / Gifted / Skip
- [x] Optional price + URL fields
- [x] Inline edit for purchase items (name, category, price, notes, URL)
- [x] Loading skeleton (`<PurchasesSkeleton>`) — no layout shift on load

**Acceptance criteria:**
- One parent checks an item on their phone; the other sees it update within 2 seconds (real-time sync)
- Default hospital bag items are pre-populated on first load
- Purchases list shows progress summary (e.g., "12 of 30 items bought")

#### Self-Hosted Link Shortener ✅ Complete

- [x] Add `ShortLink` model to Prisma schema: `id`, `code` (unique, 6-char alphanumeric), `originalUrl`, `babyId`, `createdById`, `createdAt` — migrate
- [x] Add `shortCode String?` to `Purchase` model — populated automatically when a URL is saved
- [x] `GET /s/:code` — public redirect route (no auth required); 302 to `originalUrl`; 404 if not found
- [x] `createShortLink(originalUrl, babyId, userId)` service function — generates unique 6-char code, retries up to 5 times on collision
- [x] Call `createShortLink` automatically on purchase create/update whenever a `url` field is present and changed
- [x] Nginx proxies `/s/` to Express (before SPA fallback); Vite dev proxy also handles `/s/`
- [x] Client: purchases with a `shortCode` show a "Visit" link — opens in new tab; raw URL never displayed
- [x] Server tests: `shortLink.test.ts` covers `generateCode` and `createShortLink` (including retry on collision)

**Acceptance criteria:**
- Submitting a purchase with a URL results in a working short link with no extra steps from the user
- Visiting the short URL redirects correctly without authentication
- The URL input field and "Visit" button are the only UI surfaces — no shortening controls exposed

#### Home Prep + Before We Get Home Checklists ✅ Complete

- [x] Home Prep task list UI (pre-arrival tasks)
- [x] "Before We Get Home" checklist
- [x] Both lists: same component as hospital bag, different `ChecklistType`
- [x] Default items pre-seeded for both lists

#### Visitor Schedule Planner ✅ Complete

- [x] Visitor Schedule UI — calendar-style week view
- [x] Add visitor slot: name, date, time window, notes
- [x] Edit/delete slots (inline edit form)
- [x] Mobile-friendly: tapping a time slot opens a quick-add form
- [x] Loading skeleton (`<VisitorsSkeleton>`) — no layout shift on load

**Acceptance criteria:**
- Can schedule 10+ visitor slots without UI degradation
- Slots display clearly in a week view on mobile

---

### Phase 2.UI: UI/UX Review & Polish

**Goal:** Align all Phase 2 screens with the design mockups and polish interaction details before moving on.

- [ ] Review Hospital Bag, Home Prep, and Before We Get Home checklist screens against `mockups.html`
- [ ] Review Purchases Tracker screen — verify status toggle button sizes meet 44×44px minimum
- [ ] Review Visitor Schedule UI on mobile — test on an actual Android device
- [ ] Add tablet layout variants for Checklist and Purchases screens (side-by-side at ≥768px)
- [ ] Add tablet layout for Visitor Schedule (wider week grid with visible time labels)
- [ ] Verify all Phase 2 screens in dark mode
- [ ] Fix any animation/transition regressions from Phase 2 feature work

**Acceptance criteria:**
- All Phase 2 screens visually match the `mockups.html` reference on a 393px phone viewport
- All Phase 2 screens have a functional tablet layout at ≥768px
- No regressions in Phase 1 screens after Phase 2 work

---

### Phase 3: Newborn Tracking Core

**Goal:** The core daily tracking loop works flawlessly for two exhausted parents.

#### Feeding Tracker — Data Layer

- [ ] Add FeedingLog to Prisma schema + migrate
- [ ] POST `/api/feeding` — log a feeding
- [ ] GET `/api/feeding?babyId=&since=` — paginated, filtered by date
- [ ] Socket.io: emit `feeding:created` on new log
- [ ] Active session support: POST `/api/feeding/start`, PATCH `/api/feeding/:id/end`

#### Feeding Tracker — UI

- [ ] Quick-log screen: large tap targets for Left Breast / Right Breast / Bottle / Pump
- [ ] Breast feed: start timer on tap, stop on second tap; shows elapsed time live
- [ ] Timer continues in background (use `startedAt` from server, not local state)
- [ ] Bottle: enter oz or ml (toggle unit); optional notes
- [ ] Pump: enter volume + duration
- [ ] Feeding log list: chronological, shows time ago + duration/volume
- [ ] "Last fed X min ago" summary at top of screen

**Acceptance criteria:**
- Can log a breast feed with timer in under 3 taps
- If one parent starts a timer, the other sees the live timer on their screen via Socket.io

#### Sleep Tracker — Data Layer + UI

- [ ] Add SleepLog to Prisma schema + migrate
- [ ] REST + Socket.io endpoints (same pattern as feeding)
- [ ] Sleep tracking UI: Nap / Night Sleep buttons; start/stop timer
- [ ] Wake window indicator: time since last sleep ended

**Acceptance criteria:**
- Can log a nap in 2 taps (start → stop)

#### Diaper Log

- [ ] Add DiaperLog to Prisma schema + migrate
- [ ] REST + Socket.io endpoints
- [ ] Diaper log UI: Wet / Dirty / Both quick buttons
- [ ] For dirty: color picker + consistency selector (seedy, pasty, runny, firm, watery, custom)
- [ ] Diaper count summary for today

**Acceptance criteria:**
- Wet diaper logged in 1 tap
- Dirty diaper with color + consistency logged in under 15 seconds

#### Home Dashboard

- [ ] Dashboard screen aggregates all active tracking info:
  - Last feeding: type, time ago, which side last (for breast)
  - Current sleep status: asleep/awake, duration, wake window
  - Today's diaper count (wet + dirty)
  - Next feeding suggestion (based on average interval)
- [ ] Bottom navigation: Dashboard / Feed / Sleep / Diaper / More

**Acceptance criteria:**
- Dashboard shows accurate state at a glance without scrolling
- Loads in under 1 second on phone

#### Real-Time Sync Hardening

- [ ] Reconnect logic: Socket.io client reconnects automatically; re-fetches latest state on reconnect
- [ ] Optimistic updates: log appears immediately in UI; reverts on API error
- [ ] Conflict resolution: last-write-wins
- [ ] Offline indicator: banner when socket is disconnected

**Acceptance criteria:**
- App recovers gracefully from Tailscale dropout (reconnects within 30 seconds)
- Concurrent logging from both phones does not corrupt data

---

### Phase 3.UI: UI/UX Review & Polish

**Goal:** Core tracking screens are polished, fast, and pixel-aligned before the SOS phase begins.

- [ ] Review Dashboard, Feeding, Sleep, and Diaper screens against `mockups.html`
- [ ] Verify active timer states are visually clear and update every second without layout jank
- [ ] Verify the avatar sync status ring (connecting/synced/unsynced) renders correctly — amber/green/red
- [ ] Test bottom navigation tap targets on an actual Android device (all targets ≥ 44×44px)
- [ ] Add tablet layout for Dashboard (2-column card grid) and Feeding log list
- [ ] Add tablet layout for Sleep and Diaper screens
- [ ] Review offline indicator banner — position, text, and animation
- [ ] Verify all Phase 3 screens in dark mode

**Acceptance criteria:**
- Dashboard loads in < 1 second and shows accurate state without layout shift
- All core tracking screens work one-handed on a phone
- Tablet dashboard shows a meaningful 2-column layout, not just a stretched phone UI

---

### Phase 3.5: Emergency SOS Alert

**Goal:** Either parent can send a critical "I need you right now" alert that reliably overrides Android Do Not Disturb.

#### Tasks

- [ ] Add `EmergencyAlert` model to Prisma schema + migrate
- [ ] `POST /api/alerts/sos` — creates alert, triggers push to recipient device
- [ ] Socket.io event `alert:sos` — real-time in-app banner for when app is open
- [ ] Server: send Web Push notification with urgency `"high"`, `requireInteraction: true`
- [ ] Service worker: on push receive, play `/sounds/alert.ogg` at full volume
- [ ] Android notification channel: register `emergency-alert` channel with max importance
- [ ] Twilio phone call integration (optional for Android-only; required for iOS SOS)
- [ ] Client: SOS button in Dashboard header — red, labeled "SOS" with a bell icon
- [ ] Confirmation bottom sheet with 2-second hold-to-confirm on Send to prevent pocket fires
- [ ] Recipient: full-screen takeover alert when app is open
- [ ] `PATCH /api/alerts/:id/acknowledge`
- [ ] Alert history: last 10 alerts visible in Settings
- [ ] Cooldown: 60-second lockout after sending

**Acceptance criteria:**
- Alert arrives on the recipient's phone within 3 seconds of the sender tapping Send
- Notification plays audible alarm even if phone is on vibrate/silent
- Accidental sends prevented: requires 2-second hold or explicit confirmation
- Alert is acknowledged with a single tap; sender sees "Seen" status in real time

**Environment variables:**
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
NICK_PHONE_NUMBER=+1xxxxxxxxxx
JESS_PHONE_NUMBER=+1xxxxxxxxxx
```

---

### Phase 4: Health & Growth

**Goal:** Complete health tracking to support pediatrician visits.

#### Medication Log

- [ ] Add MedicationLog to Prisma schema + migrate
- [ ] REST + Socket.io endpoints
- [ ] Medication log UI: name (with autocomplete from history), dosage, time
- [ ] Today's medication summary

**Acceptance criteria:**
- Can log Vitamin D drops in under 10 seconds after the first time

#### Weight Tracking + Growth Charts

- [ ] Add WeightLog to Prisma schema + migrate
- [ ] Weight entry UI: lb/oz
- [ ] Growth chart: line chart of weight over time (use Recharts)
- [ ] WHO percentile overlay (hardcode percentile curves for 0–6 months)

**Acceptance criteria:**
- Weight chart renders correctly on mobile
- WHO percentile lines are visually distinct from actual data

#### Tummy Time + Mood/Activity Log

- [ ] Add TummyTimeLog, MoodLog to Prisma schema + migrate
- [ ] Tummy time: start/stop timer UI; today's total duration summary
- [ ] Mood/activity log: icon grid (Happy, Fussy, Crying, Alert, Bath, Walk, etc.)

**Acceptance criteria:**
- Tummy time timer is as simple as sleep timer (2 taps)

#### History & Reporting Views

- [ ] Daily summary view: all logs for a selected date on one screen
- [ ] 7-day feeding summary: average feeds/day, average duration, total volume
- [ ] 7-day sleep summary: average sleep/day, longest stretch
- [ ] Diaper count history: chart of wet + dirty counts per day

#### Calendar View

- [ ] Unified calendar screen showing all tracked events in a single timeline view
- [ ] Filter bar at top: defaults to "All" — toggleable filter chips for Visits, Feedings, Diapers, and Naps/Sleep
- [ ] Month view: each day shows coloured indicator dots for event categories present (blue = feeding, green = sleep/nap, amber = diaper, purple = visitor)
- [ ] Tapping a day opens a day-detail panel: chronological list of all events that day
- [ ] Filter chips persist across sessions (stored in Zustand or localStorage)
- [ ] Smooth swipe-left/right to navigate months on mobile
- [ ] Tablet layout: split-panel — month grid on left, day detail on right
- [ ] New aggregated API endpoint: `GET /api/calendar?babyId=&from=YYYY-MM-DD&to=YYYY-MM-DD`
- [ ] React Query caches responses by month — navigating back to a previous month does not re-fetch

**Acceptance criteria:**
- All four category types visible in a single month view without UI degradation
- Filtering to "Feedings only" shows only feeding dots within 1 second (client-side, no new network request)
- Month navigation is smooth and does not re-fetch data for already-loaded months
- Tablet split-panel layout auto-activates at ≥768px viewport width
- Indicator dots cap at 4 visible per day; overflow shows a "+N" grey label

---

### Phase 4.UI: UI/UX Review & Polish

**Goal:** Health and history screens are clear, data-dense but not overwhelming, and aligned across phone and tablet.

- [ ] Review Medication Log, Weight Entry, and Tummy Time screens against `mockups.html`
- [ ] Review Growth Chart on mobile — verify WHO percentile lines are legible at small sizes
- [ ] Review Calendar View on mobile and tablet — verify filter chip interaction, day-detail panel, and month navigation
- [ ] Review Daily Summary and weekly summary views — verify data hierarchy is clear
- [ ] Add tablet split-panel layout for Calendar View
- [ ] Verify Recharts growth chart renders correctly in dark mode
- [ ] Spot-check all Phase 4 screens with an accessibility scanner

**Acceptance criteria:**
- Calendar view filter chips are clearly selectable and show distinct active state
- Growth chart is readable on a 393px viewport without horizontal scroll
- All Phase 4 screens have a functional tablet layout

---

### Phase 5: AI Integration

**Goal:** Reduce friction for logging and surface insights parents wouldn't calculate manually.

#### Anthropic API Integration + NL Logging

- [ ] Add Anthropic SDK to server dependencies
- [ ] POST `/api/ai/log` — accepts freeform text, returns structured log entries
- [ ] Client: "Quick Log" text field on dashboard — type anything, get confirmation before saving

**Acceptance criteria:**
- 90%+ of common log phrases parsed correctly (test with 20 sample phrases)
- User always sees parsed result before it is saved

#### Pattern Analysis

- [ ] Feeding interval analysis: calculate average feeding interval for last 24h, 3 days, 7 days
- [ ] Sleep pattern analysis: average wake windows, longest sleep streak
- [ ] API endpoint: GET `/api/ai/insights?babyId=&days=7`
- [ ] Insights panel on dashboard (collapsible)

**Acceptance criteria:**
- Insights load in under 3 seconds (cache analysis results for 1 hour)

#### "Is This Normal?" Assistant

- [ ] Chat interface (Q&A, not full history)
- [ ] Prompt includes recent 14-day log summary as context
- [ ] Hard guardrail: every response includes "This is not medical advice."
- [ ] Rate limit: 20 queries/day
- [ ] Add AIConversationLog table to Prisma schema
- [ ] Persist Q&A pairs to DB for cross-session context (last 10 exchanges)

**Acceptance criteria:**
- Assistant can answer "Is 8 feedings a day normal for a 3-week-old?" using baby's actual data
- Guardrail disclaimer appears on every response

#### Weekly Summary Digest

- [ ] Scheduled job (node-cron): runs every Sunday at 8pm
- [ ] Generates weekly summary: total feeds, total sleep, diaper counts, weight change, notable patterns
- [ ] Summary viewable from a "Weekly Reports" screen

---

### Phase 5.UI: UI/UX Review & Polish

**Goal:** AI features feel trustworthy, fast, and appropriately caveated — not like a tacked-on chatbot.

- [ ] Review Quick Log (NL input) on Dashboard — verify placeholder text, parsed-result confirmation modal, and error states
- [ ] Review "Is This Normal?" chat UI — verify streaming text renders smoothly, medical disclaimer is visible on every response
- [ ] Review Insights panel (collapsible) — verify collapsed/expanded states, loading skeleton, and empty state when insufficient data
- [ ] Verify AI features degrade gracefully when ANTHROPIC_API_KEY is not configured
- [ ] Add tablet layout for "Is This Normal?" chat

**Acceptance criteria:**
- Medical disclaimer is always visible on AI responses — never clipped or scrolled out of view
- Streaming text appears smoothly with no layout jank on mobile
- All AI screens show appropriate empty/error states when API key is not set

---

### Phase 6: Polish

**Goal:** App feels production-quality and ready for the intense first weeks of newborn life.

#### Milestone Tracking

- [ ] Add Milestone to Prisma schema + migrate
- [ ] Pre-seed CDC developmental milestones for months 1–6
- [ ] Milestone checklist UI: grouped by age/category
- [ ] Mark milestone achieved with date + optional photo note

**Acceptance criteria:**
- All CDC milestones for 0–6 months pre-populated
- Marking a milestone takes 2 taps

#### Data Export

- [ ] PDF export: daily log for a date range (for pediatrician visits)
- [ ] CSV export: raw log data for all types
- [ ] Export UI: date range picker + format selector + download button

**Acceptance criteria:**
- PDF export for a 7-day window generates in under 10 seconds

#### Push Notifications + Offline Support

- [ ] Web Push notifications via VAPID
- [ ] Notification types: feeding reminder (configurable interval), custom reminders
- [ ] PWA service worker: cache all static assets + API responses for offline read access
- [ ] Offline write queue: log entries made offline sync when connection restores

**Acceptance criteria:**
- App is installable on Android as a PWA
- Core log views load in airplane mode (from cache)
- Offline logs sync correctly when connection restores

#### Dark Mode + Final QA

- [ ] Dark mode using Tailwind `dark:` classes + system preference detection
- [ ] Manual dark/light toggle in settings
- [ ] Full regression test: all features on both phones
- [ ] Performance audit: Lighthouse PWA score ≥ 90

---

### Phase 7: Repository Screenshots & Visual Documentation

**Goal:** Anyone who receives or discovers the repo can immediately see what the app looks like before committing to setup.

#### Screenshot Capture

- [ ] Capture final screenshots of every major screen on a physical Android device at 393px CSS width
- [ ] Capture the same screens on a tablet (≥768px viewport) for any screen with a tablet layout
- [ ] Store in `/docs/screenshots/mobile/` and `/docs/screenshots/tablet/`

#### Mockup Alignment

- [ ] Update `mockups.html` to reflect any design changes made during implementation
- [ ] Add to `mockups.html` any screens added during development that never had a mockup
- [ ] Add tablet frame variants to `mockups.html` for all screens that have a tablet layout

#### README Assets

- [ ] Add a "What does it look like?" section near the top of the repo README with inline screenshots

**Acceptance criteria:**
- A family receiving the repo can see what the app looks like before committing to setup
- All screenshots reflect the final shipped design
- README has at least 3 inline screenshots

---

## MVP Definition of Done

The app is MVP-ready when **all of the following are true — target: ready before baby arrives**:

### Deployment
- [ ] App is deployed on Unraid and accessible via Tailscale from both phones
- [ ] CI/CD pipeline deploys updates automatically from `main`
- [ ] HTTPS works (no browser security warnings on mobile)

### Auth
- [ ] Both parents have accounts
- [ ] Login works reliably; sessions persist across app restarts

### Core Tracking (Phase 3 must be complete)
- [ ] Breast feeding log with live timer works
- [ ] Bottle feeding log works
- [ ] Sleep tracking with timer works
- [ ] Diaper log (wet + dirty with color) works
- [ ] Dashboard shows last feeding, current sleep status, today's diaper count

### Real-Time Sync
- [ ] Action on one phone appears on the other within 3 seconds

### Pregnancy Prep (Phase 2 must be complete)
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
| 1 | **Time crunch: baby arrives early or development time runs short** | Medium | High | Phases 1–3 are the hard MVP. Phases 4–6 are deferrable. Set a hard MVP cutoff date and cut scope ruthlessly if needed. |
| 2 | **Unraid/Tailscale outage during first weeks with newborn** | Low | High | Test Tailscale failover before due date. Document manual restart steps. Consider adding a UPS to Unraid. Keep a 48-hour offline cache via service worker. |
| 3 | **Both parents too exhausted to use a complex UI** | Medium | High | Design every core action to require ≤ 3 taps. Prioritize the Quick Log (NL input) in Phase 5. If AI isn't done, ensure tap-based logging is bulletproof. |
| 4 | **Anthropic API cost or rate limit issues** | Low | Medium | Use Claude Haiku for NL parsing (cheap, fast). Cache pattern analysis for 1 hour. Add 20 query/day limit on "Is this normal?" assistant. Set billing alert at $20/month. |
| 5 | **Real-time sync bugs under sleep-deprived concurrent use** | Medium | Medium | Last-write-wins conflict resolution. Comprehensive logging for all Socket.io events. Test concurrent logging explicitly before going live. |

---

## Development Notes

### Commit Conventions (Conventional Commits)

All commits **must** follow the [Conventional Commits](https://www.conventionalcommits.org/) spec. Enforced by `commitlint` + `husky`.

**Format:** `<type>(<scope>): <description>`

**Examples:**
```
feat(feeding): add breastfeed timer with left/right side tracking
fix(sync): reconnect socket after Tailscale dropout
feat(ai): implement natural language log parsing via Claude Haiku
chore(infra): add Watchtower service to docker-compose.prod.yml
db: add WeightLog and TummyTimeLog to Prisma schema
```

### Conventions
- All timestamps stored as UTC in the database; converted to local time in the client
- Use `CUID` for all IDs
- API responses follow `{ data, error, meta }` envelope
- Socket.io events follow `resource:action` naming
- All log mutations go through the REST API first, then the server emits the Socket.io event

### State Management
- Zustand for global UI state (current user, active timers, socket connection status)
- TanStack Query for server state — handles caching, background refetch, and optimistic updates
- Socket.io events should `invalidate` React Query caches, not directly mutate local state

### Mobile-First Design Rules
- Minimum tap target: 44px × 44px
- Primary action buttons: full-width or near-full-width
- No hover-only interactions
- Test on actual phones regularly, not just browser DevTools

### Testing (Vitest)

All packages use Vitest for unit and integration tests.

- Server: route handlers (supertest), service logic, auth middleware
- Client: utility functions, Zod schemas, custom hooks (React Testing Library)
- Test files: `*.test.ts` / `*.test.tsx` co-located with the file they test

---

## Multi-Family Distribution

This app is designed to be self-hosted by a single family, but the repo should be shareable so that other families can spin up their own private instance with minimal config.

### Config-Driven Setup

All family-specific values live in environment variables. Key config values:
- `FAMILY_NAME` — displayed in the app header
- `ADMIN_EMAIL` — used for VAPID push notification contact
- `MAX_USERS` — default 2
- `TIMEZONE` — IANA timezone string for display

### User Account Creation for Forking Families

The seed script reads from environment variables so no code changes are required:

```env
SEED_USER_1_NAME=Emma
SEED_USER_1_EMAIL=emma@example.com
SEED_USER_1_PASSWORD=changeme

SEED_USER_2_NAME=Liam
SEED_USER_2_EMAIL=liam@example.com
SEED_USER_2_PASSWORD=changeme
```

### Platform Compatibility Table

| Feature | Android (Chrome) | iOS Safari 16.4+ | Desktop browser |
|---|---|---|---|
| Core tracking | ✅ | ✅ | ✅ |
| Install to home screen | ✅ Auto prompt | ⚠️ Manual: Share → Add to Home Screen | ➖ N/A |
| Push notifications | ✅ | ✅ Requires Home Screen install | ➖ Limited |
| SOS alert (app open) | ✅ | ✅ | ✅ |
| SOS override DND | ✅ With channel permission | ❌ Not possible via PWA — Twilio required | ➖ N/A |
| Passkey / biometric login | ✅ Fingerprint/Face | ✅ Face ID / Touch ID | ✅ Platform key |
| Offline read access | ✅ | ✅ | ✅ |
| Tailscale remote access | ✅ Native app | ✅ Native app | ✅ Browser |

---

*Last updated: May 2026*  
*Next review: After Phase 1 complete*
