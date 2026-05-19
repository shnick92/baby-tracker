# Architecture Decision Records — Baby Tracker

**Project:** Private family tracker for pregnancy milestones, feeding logs, sleep tracking, and newborn care.  
**Users:** Two parents, self-hosted on a home server.

---

## ADR-001: PWA vs React Native

**Status:** Accepted  
**Date:** 2026-05-16

### Context

The tracker needs to run on Android phones, a tablet, and a web browser. The app is self-hosted on a home server — no App Store or Play Store distribution is required. Target platforms: Android phones (both parents) and a tablet in the nursery, with occasional desktop browser access.

### Decision

Build as a **PWA using React 19 + Vite + Workbox service worker**.

The app is installable on Android home screens via "Add to Home Screen", works offline for read access, and is served from the home server as a static build.

### Options Considered

#### Option A: PWA (React 19 + Vite + Workbox) — Chosen

| Dimension | Assessment |
|---|---|
| Complexity | Low — single codebase, standard web tooling |
| Build process | Simple — `vite build` produces static files |
| Distribution | None required — served from home server |
| Native API access | Partial — covers camera, notifications (VAPID), storage |
| Offline support | Yes — via Workbox service worker |

**Pros:**
- Single codebase serves web, Android, and tablet
- No App Store accounts, build servers, or review processes
- Installable on Android home screen via browser prompt
- Vite dev server simplifies local development

**Cons:**
- Push notifications require VAPID key setup and a push server
- Some native APIs unavailable (no background sync, no health data stores)
- Slightly less polished native feel vs. a true native app

#### Option B: React Native with Expo

**Rejected.** Expo build complexity is unnecessary for a 2-person home app. Web browser access requires a separate web target. APK sideloading adds more friction than a PWA install.

### iOS PWA Compatibility (important for open-source distribution)

| Capability | Android Chrome | iOS Safari 16.4+ |
|---|---|---|
| Install to Home Screen | Native "Install App" prompt | Manual: Share → "Add to Home Screen" |
| Web Push notifications | Full support | Only when installed to Home Screen |
| DND override via push | Yes (with channel permission) | **Not possible** — PWAs cannot use Critical Alerts |
| WebAuthn / passkeys | Face/fingerprint via FIDO2 | Face ID / Touch ID via FIDO2 |
| Background sync | Supported | Limited |

**Critical consequence for SOS alerts:** iOS cannot bypass DND via Web Push under any circumstances. Twilio phone call fallback is **mandatory** for any deployment where an iOS user needs SOS alerts.

**iOS families forking this repo** who want DND bypass without Twilio can wrap the app with [Capacitor](https://capacitorjs.com/) to publish as a native iOS app with Critical Alerts. Not relevant to Android-only deployments.

### Consequences

- Positive: Single codebase serves all platforms; fast development with standard React tooling
- Negative: Push notifications require VAPID setup; no background data sync when browser closed
- **Note on React 19:** React Compiler handles automatic memoization — no manual `useMemo`/`useCallback` needed.

---

## ADR-002: PostgreSQL vs SQLite

**Status:** Accepted  
**Date:** 2026-05-16

### Context

The tracker stores time-series data. Both parents write simultaneously — logging a feed on one phone while the other checks the app on a tablet is a realistic scenario.

### Decision

Use **PostgreSQL**, managed via `postgres:16` Docker image, with **Prisma ORM**.

### Options Considered

#### Option A: PostgreSQL — Chosen

**Pros:**
- Designed for concurrent multi-client access — no write lock contention
- Powerful query capabilities for growth charts (`date_trunc`, window functions)
- Prisma provides type-safe queries and version-controlled migrations
- Runs cleanly in Docker with a named volume

**Cons:**
- Heavier than SQLite — requires a separate container, ~100–300 MB RAM
- Slightly more complex backup story than a single file

#### Option B: SQLite

**Rejected.** SQLite serializes writes (even in WAL mode). Two parents logging simultaneously could cause transaction failures at exactly the moments the app needs to be reliable (3am feeding logs).

### Consequences

- Positive: Concurrent writes from two parents handled safely; rich SQL for growth charts
- Negative: Additional Docker container to manage; higher RAM usage than SQLite

---

## ADR-003: Real-time Sync Strategy

**Status:** Accepted  
**Date:** 2026-05-16

### Context

When one parent logs a feeding, the other's screen should update within a second or two without a manual refresh.

### Decision

Use **Socket.io** with room-based events scoped to a single family unit.

All connected clients join a room identified by `family:<babyId>` on authentication. Server emits invalidation events after DB writes; clients call `queryClient.invalidateQueries(...)` on receipt.

### Options Considered

| | Socket.io (chosen) | SSE | HTTP Polling |
|---|---|---|---|
| Latency | Sub-second | Sub-second | 3–10 seconds |
| Reconnection | Automatic, built-in | Browser EventSource | N/A (stateless) |
| Bidirectional | Yes | No — writes still HTTP | Yes |
| Complexity | Medium | Low | Very low |

**Socket.io chosen over SSE** due to better reconnection reliability in mobile scenarios (phones frequently lock, switch networks via Tailscale, return from app-switcher). Socket.io's reconnection logic and WebSocket fallback to long-polling are more robust than raw `EventSource` on mobile.

### Socket Connection States (3 states — never binary)

```ts
type SocketStatus = 'connecting' | 'synced' | 'unsynced'
```

- `connecting` — default on app load; handshake in progress
- `synced` — `connect` event fired; real-time sync is live
- `unsynced` — `disconnect` event fired; connection lost

This drives the profile avatar ring color in the app header.

### Socket Event Naming

Events follow `resource:action`: `feeding:created`, `sleep:ended`, `checklist:item:toggled`

**Rule:** Server emits events AFTER successful DB write. Never emit from the client.

**Rule:** On socket event receipt, call `queryClient.invalidateQueries([key])` to refetch. Do NOT manually merge socket payloads into query cache.

### Consequences

- Positive: Sub-second sync; automatic reconnection; room scoping isolates families
- Negative: Socket.io adds ~30KB to bundle; sticky sessions needed if load-balanced (not applicable here)

---

## ADR-004: Authentication Approach

**Status:** Accepted  
**Date:** 2026-05-16

### Context

The app has exactly two users. It runs on a private home server accessible only via Tailscale. No self-registration, password reset flows, email verification, or OAuth.

### Decision

**JWT authentication** with no public self-registration. Tokens stored in **httpOnly cookies**.

User credentials are seeded via the seed script (configured via env vars). No hardcoded names or passwords in source code. In addition to password login, **WebAuthn passkeys** are supported for biometric login (fingerprint/face on Android Chrome; Face ID/Touch ID on iOS).

**Passkey implementation:**
- Server stores WebAuthn credential public key per user (`PasskeyCredential` Prisma model)
- Uses `@simplewebauthn/server` (backend) and `@simplewebauthn/browser` (client)
- Passkey registered after first password login; falls back to password if unavailable
- Requires HTTPS (already enforced by Tailscale + Nginx setup)

### Token Configuration

- Access token: 15 minutes (stored in memory, never localStorage)
- Refresh token: 30 days (httpOnly, Secure, SameSite=Strict cookie)
- Silent refresh via Axios interceptor — user never sees a login prompt during normal use

### Consequences

- Positive: Minimal code surface; httpOnly cookie prevents XSS token theft; no third-party auth service
- Negative: No self-service password reset (requires direct DB access); no MFA
- Passkey positive: No password typing during exhausted 3am sessions
- Passkey negative: Adds ~2 endpoints and credential storage; requires HTTPS

---

## ADR-005: CI/CD Pipeline

**Status:** Accepted  
**Date:** 2026-05-16

### Decision

**GitHub Actions → Docker Hub → Watchtower** pipeline:

1. Push to `main` triggers GitHub Actions
2. Workflow builds Docker image and pushes to Docker Hub
3. Watchtower on the home server polls Docker Hub (every 5 minutes)
4. Watchtower pulls new image and restarts container

Images are also tagged with the git SHA for rollback: `tracker-server:<sha>`.

### Rationale

Standard deployment pattern for self-hosted Unraid/home-server applications. Zero ongoing maintenance after initial setup. No ports need to be opened on the home server. Docker image contains only compiled code — no user data.

### GitHub Actions Secrets Required

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

### Consequences

- Positive: Zero-touch deploys; no open ports for CI/CD; free tiers cover everything
- Negative: ~5-minute delay (Watchtower polling); no staging environment; rollback requires re-pushing or SSH to server

---

## ADR-006: Remote Access — Tailscale vs Cloudflare Tunnel

**Status:** Accepted  
**Date:** 2026-05-16

### Decision

Use **Tailscale** for remote access.

Both parents install the Tailscale Android app. The home server runs Tailscale. The app is accessible at its Tailscale IP or MagicDNS hostname from any device in the tailnet.

### Why Not Cloudflare Tunnel

Cloudflare Tunnel routes all data through Cloudflare's edge servers (TLS is terminated there). This app stores private health data — feeding schedules, growth measurements, medical notes. The requirement that data never leaves the family's own infrastructure is non-negotiable.

Tailscale's peer-to-peer architecture means the data path is **phone → home server directly**, with end-to-end encryption. Cloudflare's coordination servers only handle key exchange and metadata — not data.

### Consequences

- Positive: Private health data never traverses third-party infrastructure; MagicDNS provides stable hostname; free tier covers 2 users indefinitely
- Negative: Tailscale app must be installed and active on both phones; Tailscale coordination servers are a soft dependency for new connections
- For grandparent access: add them to the tailnet with ACL-restricted access, or set up a read-only view on a separate port accessible only from specific Tailscale IPs
- Self-hosted alternative: [Headscale](https://github.com/juanfont/headscale) can replace Tailscale's coordination server

---

## ADR-007: REST API over GraphQL

**Status:** Accepted  
**Date:** 2026-05

### Decision

Use REST with Express routers, one router per feature domain.

### Rationale

| Criterion | REST | GraphQL |
|---|---|---|
| Setup complexity | Low — Express routers | High — schema, resolvers, Apollo |
| Type safety | Good with shared Zod schemas | Excellent with codegen |
| Caching | TanStack Query handles it | Apollo Client or urql |
| Over-fetching | Minimal for known screens | Solved by design |

GraphQL's advantages (flexible querying, no over-fetching) only matter when multiple clients have divergent data needs or when teams work independently on different parts of the schema. Neither applies here. TanStack Query + REST already provides caching, background refetch, optimistic updates, and invalidation.

### Consequences

- Positive: Simpler server code; no schema drift (Zod schemas in `packages/shared` serve this role); faster initial build
- Negative: Each new screen may require a new endpoint if data needs diverge; no automatic type generation from schema

---

## ADR-008: React Hook Form + Zod for Forms and Validation

**Status:** Accepted  
**Date:** 2026-05

### Decision

Use **React Hook Form** for form state and **Zod** for schema validation on both client and server.

### Rationale

| Criterion | RHF + Zod | Controlled inputs + Yup | Formik + Yup |
|---|---|---|---|
| Re-renders | Minimal (uncontrolled) | High (every keystroke) | Medium |
| TypeScript support | Excellent (Zod is TS-first) | Bolted on | Partial |
| Schema sharing (client+server) | Yes — Zod in packages/shared | No | No |

### Implementation Pattern

```ts
// packages/shared/src/schemas/feeding.ts
export const BottleFeedSchema = z.object({
  volumeOz: z.number().min(0.1).max(16),
  feedType: z.literal('BOTTLE'),
  fedAt: z.string().datetime(),
  notes: z.string().optional(),
})
export type BottleFeedInput = z.infer<typeof BottleFeedSchema>
```

Client: `useForm<BottleFeedInput>({ resolver: zodResolver(BottleFeedSchema) })`  
Server: `BottleFeedSchema.parse(req.body)` — same schema, same validation rules.

### Consequences

- Positive: One schema definition covers client validation + server validation + TypeScript types
- Positive: RHF's uncontrolled approach means no re-renders on every keystroke — critical for mobile perf
- Negative: Zod error messages need customisation for user-facing display

---

## ADR-009: Config-Driven Design for Multi-Family Distribution

**Status:** Accepted  
**Date:** 2026-05

### Decision

All family-specific configuration lives in environment variables. No hardcoded family names, timezones, or personalisation exist in the codebase.

### Configuration Surface

| Variable | Purpose | Default |
|---|---|---|
| `FAMILY_NAME` | App header display name | `"Baby Tracker"` |
| `ADMIN_EMAIL` | VAPID push contact | required |
| `MAX_USERS` | Max accounts | `2` |
| `TIMEZONE` | IANA timezone for display | `"America/Chicago"` |
| `APP_URL` | Public URL (for WebAuthn origin) | required |

### User Account Creation for Forking Families

No public self-registration UI exists. Accounts are created once via the seed script, which reads from env vars:

```env
SEED_USER_1_NAME=Parent1
SEED_USER_1_EMAIL=parent1@example.com
SEED_USER_1_PASSWORD=changeme

SEED_USER_2_NAME=Parent2
SEED_USER_2_EMAIL=parent2@example.com
SEED_USER_2_PASSWORD=changeme
```

After seeding, users change passwords in Settings. No admin endpoint, no registration form, no source code edits needed.

### What Must Never Be Hardcoded

- User names or display names (come from DB)
- Baby name (optional field, entered via UI)
- Timezone (always from config)
- Any colour or theme personalisation

### Consequences

- Positive: Anyone can self-host with minimal friction; no accidental PII in git history; clean config/logic separation
- Negative: README must be kept up to date — becomes a maintenance responsibility

---

## ADR-010: TanStack AI for Streaming AI Responses

**Status:** Accepted  
**Date:** 2026-05

### Decision

Use **TanStack AI** (`@tanstack/ai` + `@tanstack/ai-react`) for all streaming AI interactions.

Server uses `chat()` + `toServerSentEventsResponse()`. Client uses `useChat({ connection: fetchServerSentEvents(...) })`.

**Version pinning rule:** Always use an exact version (no `^`). Check the TanStack AI changelog before any version bump.

### Rationale

| | TanStack AI (chosen) | Manual fetch + ReadableStream | Vercel AI SDK |
|---|---|---|---|
| Dependencies | Stays within TanStack ecosystem | Zero new deps | Pulls in Vercel ecosystem |
| Streaming | `toServerSentEventsResponse()` — no custom code | ~100+ lines of boilerplate | Stable, battle-tested |
| History management | Built-in | Manual | Built-in |
| Query integration | First-class (same ecosystem) | Manual | Duplicates TanStack Query |

### Implementation Pattern

```typescript
// Server
import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { anthropicText } from '@tanstack/ai-anthropic'

const stream = chat({
  adapter: anthropicText('claude-sonnet-4-6'),
  system: buildSystemPrompt(logSummary),
  messages,
})
return toServerSentEventsResponse(stream)

// Client
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'

return useChat({
  connection: fetchServerSentEvents('/api/ai/chat'),
  onFinish: (message) => {
    persistMutation.mutate({ babyId, role: 'assistant', content: message.content })
  },
})
```

### Consequences

- Positive: One fewer custom abstraction; consistent patterns across all AI features; `useChat` handles abort, reconnect, message history
- Negative: Pinned exact version must be manually reviewed and bumped; alpha label means potential breaking changes (isolated to AI feature files)

---

## ADR-011: VisitorSlot — Separate `date` Field, Optional Time Window

**Status:** Accepted  
**Date:** 2026-05-17

### Decision

Split date and time concerns into separate fields:

- `date String` — YYYY-MM-DD, always required; used for grouping and ordering
- `startTime DateTime?` — optional start of visit window
- `endTime DateTime?` — optional end; UI constrains to after `startTime`

The `date` field is a plain string (not DateTime) to avoid UTC-offset ambiguity when grouping by day — `2026-10-15` is unambiguous regardless of timezone; a midnight UTC DateTime shifts the visible date for users west of UTC.

### Consequences

- Positive: Users can add a visitor for just a day without exact times; date grouping is unambiguous
- Negative: `date` and `startTime` hold redundant date information when a time is provided; date-range filter now filters by the `date` String rather than `startTime` DateTime

---

## ADR-012: Vite + React Router vs Next.js App Router

**Status:** Accepted (stay with Vite + React Router)  
**Date:** 2026-05-17

### Decision

**Stay with Vite + React Router.** Do not pivot to Next.js App Router.

### Why Not Next.js

The two defining characteristics of this app — **fully behind authentication** and **separate Express backend** — are exactly the conditions under which Next.js's core advantages become irrelevant or liabilities.

| Dimension | Vite + React Router (chosen) | Next.js App Router |
|---|---|---|
| PWA support | Excellent — `vite-plugin-pwa` + Workbox is the gold standard | Possible but immature — `next-pwa` has had maintenance gaps |
| SSR benefit | **None** — all routes are authenticated; no SEO value | The main selling point — irrelevant here |
| Backend coupling | None — Vite builds static assets; Express handles data | Significant — Next.js assumes it IS the server |
| Docker output | Simple — `nginx:alpine` serves `dist/` | More complex — requires Node.js server process even for static content |
| Socket.io | No special handling needed | Requires custom server (`server.js`) — non-standard pattern |

### LOE If Pivoting Anyway

Full migration estimate: **~20–33 hours** (keeping Express as separate backend). Migrating Express into Next.js API routes would add another 20–40 hours. The PWA story carries the most uncertainty.

### Consequences

- Staying: No migration cost; PWA offline/push on well-understood Workbox path; Express + Socket.io + Prisma stay cleanly isolated
- If ever revisited: A pivot only makes sense if the app becomes public-facing (unauthenticated users, SEO requirements) or deployed to Vercel

---

## ADR-013: Code Organization — Utility Functions and Import Ordering

**Status:** Accepted  
**Date:** 2026-05-17

### Decision

Three related conventions for keeping the feature-colocated monorepo consistent:

#### 1. Utility Function Placement (Two-Tier Rule)

**Feature-scoped utils** — functions only meaningful within one feature domain:
```
packages/client/src/features/feeding/utils/formatFeedingDuration.ts
packages/client/src/features/diaper/utils/getDiaperColorLabel.ts
```

**Global utils** — functions used across two or more features:
```
packages/client/src/lib/utils/formatDate.ts
packages/client/src/lib/utils/convertOzToMl.ts
```

**The rule:** Never define a reusable function inline inside a component file. When a feature util is first needed in a second feature, promote it to `lib/utils/`.

Same rule server-side: feature utils near their route/service; shared server utils in `packages/server/src/lib/utils/`.

#### 2. Import Ordering (Three Groups)

```typescript
// Group 1: External packages
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// Group 2: @ absolute imports
import { formatDate } from '@lib/utils/formatDate'
import { Button } from '@components/Button'

// Group 3: Relative imports
import { formatFeedingDuration } from './utils/formatFeedingDuration'
import type { FeedingLog } from './types'
```

`@` imports always before relative imports. Enforced via ESLint `import/order`.

#### 3. Barrel Exports and Named Imports

Every public-facing directory has an `index.ts` barrel. The purpose is to prevent deep drilling into a feature's internals — not to flatten all sub-paths into a single top-level import.

```typescript
// ✅ Sub-paths are fine — the path tells you what you're getting
import { ClipboardIcon, HomeIcon } from '@components/icons'
import { groupBy } from '@lib/utils/groupBy'

// ✅ Top-level barrel also fine
import { Button, Card } from '@components'
import { formatDate } from '@lib/utils'

// ❌ Cross-feature deep drilling — leaks internal structure
import { FeedingForm } from '@features/feeding/components/FeedingForm'

// ✅ Cross-feature import goes through the feature barrel
import { FeedingForm } from '@features/feeding'
```

**Named exports everywhere.** Default exports only where a framework requires it. Internal imports within a feature use direct relative paths (not the barrel) to avoid circular references.

**TypeScript `paths` note:** Bare aliases like `@components` require an explicit entry in `tsconfig.app.json` separate from the wildcard `@components/*`:

```json
"@components": ["src/components/index.ts"],
"@components/*": ["src/components/*"]
```

Vite/Vitest resolve directory aliases to `index.ts` automatically; this gap only appears in `tsc`.

### Consequences

- Positive: Utility functions are discoverable; import order is machine-enforceable; cross-feature imports go through stable barrels; barrel files act as living manifests of each feature's public API
- Negative: Each new public export requires adding a line to the barrel; circular import risk if a barrel re-exports something that imports from the same barrel (mitigated by relative-path rule for internal imports)

---

## ADR-014: Branch Workflow — All Development on Feature Branches via PR

**Status:** Accepted  
**Date:** 2026-05-17

### Decision

All development work — including AI-assisted sessions with Claude Code — must follow this branch workflow:

1. **Start from a fresh pull of `main`:** Before beginning any work, run `git checkout main && git pull` to ensure the branch base reflects the latest deployed state.
2. **Create a dedicated feature/fix branch:** Branch name should follow the conventional commit scope pattern, e.g. `feat/feeding-tracker`, `fix/socket-reconnect`, `docs/update-plan`.
3. **Push the branch and open a PR:** Every piece of work lands via a pull request — never committed directly to `main`. This applies equally to feature work, docs, infra changes, and AI-generated code.
4. **PRs must pass CI before merge:** GitHub Actions runs lint, typecheck, and tests on every PR. Failing checks block merge.

### Rationale

`main` is the deployment branch — every merge triggers a production deploy via Watchtower within ~5 minutes. Direct commits to `main` skip CI checks, risk deploying broken code, and make it impossible to review changes before they reach the home server. The PR workflow provides a mandatory review gate and a clean rollback path (revert the PR merge commit).

This rule applies to Claude Code sessions specifically because agentic development can touch multiple files in a single turn. A PR gives a clear diff view of the full change set before anything reaches production.

### Enforcement

- **Branch protection on `main`:** Require PR reviews and status checks to pass before merging (configure in GitHub repo settings).
- **No `--no-verify`:** Never bypass husky/commitlint hooks with `--no-verify`. Fix the underlying lint or commit message issue instead.
- **Claude Code sessions:** Each session that produces code changes must start with `git checkout main && git pull`, create a branch, and end with a pushed branch and open PR.

### Consequences

- Positive: All changes are reviewable before production deploy; CI always runs; broken commits cannot reach `main`; clean git history with one commit per feature
- Negative: Small one-liner fixes require a PR — acceptable overhead given the automated deploy pipeline and the value of the change history

---

## ADR-015: Calendar View — Unified Timeline with Filter Chips

**Status:** Accepted  
**Date:** 2026-05-18  
**Deciders:** Nick  

### Context

Phase 4 adds a Calendar View screen that aggregates all tracked event types — feedings, sleep/naps, diaper changes, and visitor slots — into a single chronological view. Several design decisions needed to be made: whether to use a unified calendar or per-feature history lists, which calendar granularity to default to, how to implement filtering, and how the tablet layout should differ from mobile.

### Decision

Build a **unified month-view calendar** with **filter chips** defaulting to "All", a **tap-to-expand day-detail panel** on mobile, and a **split-panel layout** (month grid + day detail side-by-side) on tablet (≥768px). A single aggregated API endpoint serves all event types per date range.

### Options Considered

#### Calendar Architecture: Unified vs. Per-Feature History Lists

| Criterion | Unified Calendar | Per-Feature History Lists |
|-----------|-----------------|--------------------------|
| Cross-category pattern recognition | ✅ Excellent | ❌ Requires mental synthesis across screens |
| Implementation complexity | Medium — one view, aggregated endpoint | Low — reuses existing list UIs |
| Most useful for exhausted parents | ✅ Single place to review the day | ❌ Too many screens to check |

**Decision:** Unified calendar. The core value is seeing relationships across categories — e.g., "baby always naps 45 minutes after a feeding." Per-feature history lists already exist for category-specific review.

#### Default Calendar Granularity: Month vs. Week vs. Day

**Decision:** Month view as default, with day-detail accessible on tap. Week view provides no meaningful advantage for a 2-parent family. The day-level detail view is the drill-down panel, not the primary entry point.

#### Filter UX: Chips vs. Tab Bar vs. Dropdown

**Decision:** Filter chips. They make "All" the natural default, support future multi-select, and have a clear active state at a glance. The filter is client-side — chips change what indicator dots are visible without a new network request.

#### Tablet Layout: Split-Panel vs. Week Timeline

**Decision:** Split-panel. The month grid already exists; widening it and moving the day-detail into a persistent right panel is a small layout change with high value.

#### API Design: Aggregated Endpoint vs. Per-Category Queries

**Decision:** Aggregated endpoint. For a 2-user family, monthly payloads are small. A single cache key per month keeps the caching logic simple.

```
GET /api/calendar?babyId=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD

Response: {
  data: {
    feedings: FeedingLog[],
    sleep: SleepLog[],
    diapers: DiaperLog[],
    visitors: VisitorSlot[]
  },
  meta: { from, to, totalCount }
}
```

### Colour Coding Convention

| Category | CSS Variable | Hex |
|----------|-------------|-----|
| Feedings | `--accent-blue` | `#7eb8e8` |
| Sleep / Naps | `--accent-green` | `#7ec8a0` |
| Diapers | `--accent-amber` | `#e8c47e` |
| Visitors | `--accent-purple` | `#b4a0e8` |

### Consequences

- Positive: Parents can see daily patterns across all categories at a glance
- Positive: Client-side filtering means no additional network requests when toggling between categories
- Positive: Aggregated endpoint cached as one React Query key per month — navigating back is instant
- Positive: Split-panel tablet layout adds value with minimal implementation effort
- Negative: Indicator dots can get crowded on high-activity days — mitigated by capping at 4 + "+N" overflow
- Negative: Aggregated endpoint returns a larger payload — acceptable at this scale

---

## ADR-016: Self-Hosted Link Shortener

**Status:** Accepted  
**Date:** 2026-05-18  
**Deciders:** Nick  

### Context

The Purchases feature stores optional URLs (product pages, Amazon links, etc.). These links are often very long and unwieldy. An external shortener (bit.ly, TinyURL) conflicts with the project's principle that no data leaves the home network. A simple self-hosted solution fits naturally into the existing Express + Postgres stack.

### Decision

Build a minimal link shortener directly into the app:

- **`ShortLink` Prisma model** — `code` (6-char alphanumeric, unique), `originalUrl`, `babyId`, `createdById`, `createdAt`
- **`ShortLink` creation is automatic** — the purchase create/update service calls an internal `createShortLink()` function whenever a URL is present; no separate client-facing endpoint is exposed
- **`GET /s/:code`** — the only public surface; no auth required; 302 to `originalUrl`; 404 on miss
- Short codes are served from the same Express server — no separate service, no subdomain
- The UI exposes a "Visit" button on purchases; the short code and original URL are invisible to the user

### Options Considered

| Option | Verdict |
|--------|---------|
| External shortener (bit.ly, TinyURL) | Rejected — sends URLs to a third party; conflicts with home-network-only principle |
| Store full URL, truncate in UI only | Rejected — doesn't solve the problem when sharing a link externally |
| Self-hosted (this decision) | Accepted — zero new infrastructure, consistent with existing stack |
| Separate shortener service (YOURLS, etc.) | Rejected — overkill; adds another Docker container and admin surface |

### Consequences

- Positive: No data leaves the home network — URLs stay in the family's own Postgres instance
- Positive: Zero new infrastructure — one new table and two new routes on the existing Express server
- Positive: Short URLs work on the local network and via Tailscale without any extra config
- Negative: Short links only resolve while the server is running — not suitable for sharing outside Tailscale
- Negative: No analytics, click tracking, or expiry — intentional; not needed for this use case
- Negative: No deduplication — shortening the same URL twice creates two codes (acceptable; keeps implementation trivial)

---

*ADRs authored May 2026. Review after initial launch (target: Q4 2026 post-birth).*
