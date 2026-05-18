# Baby Tracker — AI Development Guidelines

This file is the authoritative reference for AI-assisted development on this project. It consolidates all coding standards, architectural decisions, and workflow rules so that no additional guidance is needed to produce correct, consistent code.

---

## Project Overview

A private pregnancy and newborn tracker PWA for two parents. Baby due October 2026. Self-hosted on a home Unraid server, accessed remotely via Tailscale. No data ever leaves the home network.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS + React Compiler |
| PWA | `vite-plugin-pwa` + Workbox service worker |
| State | Zustand (UI state) + TanStack Query (server state) |
| Backend | Node.js + Express + TypeScript |
| Real-time | Socket.io (server + client) |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | JWT (15-min access token in memory + 30-day refresh in httpOnly cookie) + WebAuthn passkeys |
| AI | Anthropic Claude API (server-side only) + TanStack AI (`@tanstack/ai` + `@tanstack/ai-react`) |
| Deployment | Docker Compose on Unraid |
| Remote access | Tailscale |
| CI/CD | GitHub Actions → Docker Hub → Watchtower |

**React 19 note:** The React Compiler handles automatic memoization. Never add manual `useMemo` or `useCallback` — it is unnecessary and contradicts the compiler's purpose.

**TanStack AI version pinning:** Always use an exact version (no `^`) for `@tanstack/ai` and `@tanstack/ai-react`. Manually review the changelog before any version bump.

---

## Monorepo Structure

```
/
├── packages/
│   ├── client/          # Vite + React PWA
│   │   └── src/
│   │       ├── features/    # Feature-colocated components, hooks, api
│   │       │   ├── feeding/
│   │       │   ├── sleep/
│   │       │   ├── diaper/
│   │       │   ├── checklist/
│   │       │   ├── visitors/
│   │       │   ├── health/
│   │       │   ├── mood/
│   │       │   ├── milestones/
│   │       │   ├── ai/
│   │       │   └── alerts/
│   │       ├── components/  # Shared UI components
│   │       ├── hooks/       # Shared hooks
│   │       ├── lib/         # axios instance, socket client, queryClient
│   │       └── stores/      # Zustand stores
│   ├── server/          # Express + Socket.io + Prisma
│   │   └── src/
│   │       ├── routes/      # Express routers (one per feature)
│   │       ├── middleware/  # auth, error, rate-limit
│   │       ├── services/    # Business logic (not in routes)
│   │       ├── socket/      # Socket.io event handlers
│   │       └── lib/         # prisma client, anthropic client, cron
│   └── shared/          # Shared TypeScript types (no runtime deps)
│       └── src/
│           └── types/       # DTOs, API envelope types, socket event types
├── docker/
│   ├── client.Dockerfile
│   ├── server.Dockerfile
│   ├── nginx.conf
│   └── docker-compose.prod.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml   # Local dev
└── docs/
    ├── ADRs.md
    ├── project-plan.md
    └── ai/
        ├── ai-integration.md
        └── claude.md    # This file
```

---

## Branch Workflow (ADR-014) — REQUIRED

Every session that produces code changes must follow this workflow exactly. `main` is the live production branch — a merge triggers a production deploy within ~5 minutes via Watchtower.

### Steps

1. **Start from fresh `main`:**
   ```bash
   git checkout main && git pull
   ```

2. **Create a feature/fix branch** using the conventional commit scope pattern:
   ```
   feat/feeding-tracker
   fix/socket-reconnect
   docs/update-plan
   db/add-weight-log
   refactor/auth-middleware
   ```

3. **Commit** following Conventional Commits (see below). Never use `--no-verify` to skip hooks.

4. **Push and open a PR.** No code lands on `main` without a PR — not even one-liners.

5. **PR must pass CI** (lint + typecheck + build) before merging.

### Enforcement Rules

- Branch protection on `main` requires PR reviews and status checks
- Never run `git push --force` to `main` or `origin/main`
- Never bypass husky/commitlint with `--no-verify` — fix the underlying issue
- If a commit fails due to a pre-commit hook, fix the issue and create a **new** commit (never amend after hook failure)

---

## Commit Conventions (REQUIRED)

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/). Enforced by `commitlint` + `husky`.

**Format:** `<type>(<scope>): <description>`

| Type | When to use |
|------|-------------|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `refactor` | Code change that is neither a fix nor a feature |
| `db` | Prisma schema or migration changes |
| `ci` | GitHub Actions, Docker, Watchtower config |
| `docs` | Documentation only |
| `test` | Tests only |
| `perf` | Performance improvement |
| `style` | Formatting, lint-only changes |
| `chore` | Tooling, deps, config that don't affect runtime |

Common scopes: `auth`, `feeding`, `sleep`, `diaper`, `health`, `mood`, `checklist`, `visitors`, `milestones`, `ai`, `sync`, `export`, `pwa`, `infra`, `db`, `ui`, `alerts`

**Good examples:**
```
feat(feeding): add breastfeed timer with left/right side tracking
fix(sync): reconnect socket after Tailscale dropout
feat(ai): implement natural language log parsing via Claude Haiku
db: add WeightLog and TummyTimeLog to Prisma schema
ci: build and push multi-arch Docker images on push to main
```

**Never use:** `fix bug`, `update`, `wip`, `changes`, `misc`, or any message that doesn't convey intent.

---

## API Conventions (ADR-007)

- Architecture: REST with Express — one router per feature domain (not GraphQL)
- All responses use the standard envelope:
  ```ts
  { data: T | null, error: string | null, meta?: { ... } }
  ```
- All IDs: CUID via Prisma `@default(cuid())`
- All timestamps: stored UTC in DB; client converts to local time for display
- Auth header: `Authorization: Bearer <access_token>` on all protected routes
- Validation: `BottleFeedSchema.parse(req.body)` — Zod schemas from `packages/shared` validate both server and client inputs with the same schema

---

## Form and Validation Conventions (ADR-008)

Use **React Hook Form** + **Zod** everywhere. Zod schemas live in `packages/shared/src/schemas/` and are shared verbatim between client and server.

```ts
// packages/shared/src/schemas/feeding.ts
export const BottleFeedSchema = z.object({
  volumeOz: z.number().min(0.1).max(16),
  feedType: z.literal('BOTTLE'),
  fedAt: z.string().datetime(),
  notes: z.string().optional(),
})
export type BottleFeedInput = z.infer<typeof BottleFeedSchema>

// Client — no controlled inputs, minimal re-renders
const form = useForm<BottleFeedInput>({ resolver: zodResolver(BottleFeedSchema) })

// Server — same schema validates the request body
BottleFeedSchema.parse(req.body)
```

Never use controlled `<input value={state} onChange={...} />` patterns for forms — RHF's uncontrolled approach is required for mobile performance.

---

## Real-Time Sync — Socket.io (ADR-003)

### Connection State

Three states — never a binary `connected: boolean`:

```ts
type SocketStatus = 'connecting' | 'synced' | 'unsynced'
```

| State | Trigger | Avatar ring color |
|-------|---------|-------------------|
| `connecting` | App load (default) | Amber — `box-shadow: 0 0 0 2px var(--accent-amber)` |
| `synced` | Socket `connect` event | Green — `box-shadow: 0 0 0 2px var(--accent-green)` |
| `unsynced` | Socket `disconnect` event | Red — `box-shadow: 0 0 0 2px #ef4444` |

The avatar **always** has one of these rings. There is no ringless or default state. This is stored in the Zustand socket store.

### Event Rules

- Event names follow `resource:action`: `feeding:created`, `sleep:ended`, `checklist:item:toggled`
- Server emits events **after** a successful DB write — never emit from the client
- All clients join a room on authentication: `family:<babyId>`
- On socket event receipt: call `queryClient.invalidateQueries([key])` — never manually merge the socket payload into the query cache

```ts
socket.on('feeding:created', () => {
  queryClient.invalidateQueries({ queryKey: ['feedings', babyId] })
})
```

---

## State Management

- **Zustand:** global UI state only — current user, active timers, socket status, theme
- **TanStack Query:** all server data — caching, background refetch, optimistic updates, invalidation
- Never fetch data with `useEffect` + `useState` — use TanStack Query exclusively for server data

---

## Authentication (ADR-004)

- JWT access token: 15 minutes, stored in memory (never `localStorage`)
- Refresh token: 30 days, `httpOnly` + `Secure` + `SameSite=Strict` cookie
- Silent refresh via Axios interceptor — users never see a login prompt during normal use
- Passkeys: WebAuthn via `@simplewebauthn/server` (backend) + `@simplewebauthn/browser` (client)
- No self-registration, no password reset UI, no OAuth
- Accounts created once via the seed script (configured via env vars)

---

## Database Conventions (ADR-002)

- PostgreSQL 16 via Docker, managed via Prisma ORM
- Run migrations for every schema change:
  ```bash
  cd packages/server
  npx prisma migrate dev --name add_feeding_log
  ```
- Migration names match the conventional commit scope: `add_feeding_log`, `add_weight_and_tummy_time`
- Never edit a migration file after it has been run
- All IDs are CUID: `@default(cuid())`
- All datetimes stored as UTC

---

## Utility Function Placement (ADR-013)

Two-tier rule — never define reusable logic inline inside a component file.

**Feature-scoped utils** — only used within one feature:
```
packages/client/src/features/feeding/utils/formatFeedingDuration.ts
packages/client/src/features/diaper/utils/getDiaperColorLabel.ts
```

**Global utils** — used across two or more features:
```
packages/client/src/lib/utils/formatDate.ts
packages/client/src/lib/utils/convertOzToMl.ts
```

**Promotion rule:** When a feature util is first needed by a second feature, move it to `lib/utils/` at that point.

Same rule applies server-side: feature utils near their route/service; shared utils in `packages/server/src/lib/utils/`.

---

## Import Ordering (ADR-013)

Three groups, each separated by a blank line. `@` imports always before relative imports:

```typescript
// Group 1: External packages
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// Group 2: @ absolute imports (always before relative)
import { formatDate } from '@/lib/utils/formatDate'
import { Button } from '@/components/Button'
import { useFeedingTimer } from '@/features/feeding'

// Group 3: Relative imports
import { formatFeedingDuration } from './utils/formatFeedingDuration'
import type { FeedingLog } from './types'
```

Enforced via ESLint `import/order` with `pathGroups` for the `@` alias.

---

## Barrel Exports and Named Imports (ADR-013)

Every public-facing directory has an `index.ts` barrel. The rule prevents deep drilling into another feature's internals — sub-paths within the same conceptual group are fine.

```typescript
// ✅ Named imports through a feature barrel
import { FeedingForm, useFeedingTimer } from '@/features/feeding'

// ✅ Sub-paths are fine — the path conveys intent
import { ClipboardIcon, HomeIcon } from '@/components/icons'
import { groupBy } from '@/lib/utils/groupBy'

// ❌ Cross-feature deep path — leaks internal structure, brittle
import { FeedingForm } from '@/features/feeding/components/FeedingForm'
```

- Prefer named exports everywhere
- Default exports only where a framework requires it (e.g., route-level page components)
- Internal sibling imports within the same feature use direct relative paths to avoid circular barrel references
- `tsconfig.app.json` needs both bare and wildcard entries for `@` aliases:
  ```json
  "@components": ["src/components/index.ts"],
  "@components/*": ["src/components/*"]
  ```

---

## AI Feature Conventions (ADR-010)

The Anthropic API key is **server-side only** — it is never sent to the client or exposed in client bundles.

Use **TanStack AI** for all streaming interactions:

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

const { messages, sendMessage } = useChat({
  connection: fetchServerSentEvents('/api/ai/chat'),
  onFinish: (message) => {
    persistMutation.mutate({ babyId, role: 'assistant', content: message.content })
  },
})
```

`useChat` handles abort, reconnect, and message history — do not re-implement these manually.

---

## Config-Driven Design (ADR-009)

No family-specific values may be hardcoded in source:

| Never hardcode | Always use |
|---|---|
| User or baby names | DB fields set via seed/UI |
| Timezones | `TIMEZONE` env var |
| App URL / origin | `APP_URL` env var |
| Display names | `FAMILY_NAME` env var |

Accounts are created once via the seed script:
```env
SEED_USER_1_NAME=Parent1
SEED_USER_1_EMAIL=parent1@example.com
SEED_USER_1_PASSWORD=changeme
```

No registration UI. No admin endpoint. No hardcoded names in code or git history.

---

## PWA and Platform Conventions (ADR-001)

The app is built as a PWA using `vite-plugin-pwa` + Workbox. The primary targets are Android phones and a nursery tablet.

### iOS Compatibility

| Capability | Android Chrome | iOS Safari 16.4+ |
|---|---|---|
| Install to Home Screen | Native "Install App" prompt | Manual: Share → Add to Home Screen |
| Web Push notifications | Full | Only when installed to Home Screen |
| DND bypass via push | Yes (with channel permission) | **Not possible** |
| WebAuthn / passkeys | FIDO2 fingerprint | Face ID / Touch ID |

**Critical:** iOS cannot bypass DND via Web Push under any circumstances. Twilio phone call fallback is mandatory for iOS deployments that need SOS alerts. Show an install prompt banner on first load for iOS users not in standalone mode.

```typescript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
const isStandalone =
  (navigator as any).standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches
```

### Mobile-First UI Rules

- Minimum tap target: 44×44px
- Primary action buttons: full-width on mobile
- Test on an actual Android device at least once per feature — DevTools emulation is not sufficient

---

## Routing (ADR-012)

The app uses **Vite + React Router** — not Next.js App Router. This decision is final for the current architecture.

- All routes are behind authentication — SSR provides no benefit
- `vite-plugin-pwa` + Workbox is the PWA standard; Next.js PWA support is immature
- The Express backend is separate — Next.js API routes are not used
- Docker output is `nginx:alpine` serving `dist/` — simpler and lighter than a Node server

---

## Security Rules

- No SQL injection: always use Prisma's type-safe query API — never raw string interpolation in queries
- No XSS: never use `dangerouslySetInnerHTML` without explicit sanitization
- CSRF: `SameSite=Strict` on refresh cookie; access token in memory (not cookie or localStorage)
- Input validation at every system boundary: Zod schemas on all API request bodies
- The Anthropic API key never appears in client-side code, client bundles, or environment variables prefixed with `VITE_`
- No secrets in git history — use `.env` files listed in `.gitignore`

---

## Running Locally

```bash
# Full stack (PostgreSQL + server + client with hot reload)
docker compose up

# Or individual services:
cd packages/server && npm run dev   # tsx watch — port 3001
cd packages/client && npm run dev   # Vite — port 5173

# Database
cd packages/server
npx prisma migrate dev              # run pending migrations
npx prisma db seed                  # seed nick + jess + baby record
npx prisma studio                   # visual DB browser — port 5555
```

### Environment Variables

```env
# packages/server/.env
DATABASE_URL=postgresql://tracker:tracker@localhost:5432/tracker
JWT_ACCESS_SECRET=<strong-random-32-chars>
JWT_REFRESH_SECRET=<strong-random-32-chars>
ANTHROPIC_API_KEY=<from-anthropic-console>
VAPID_PUBLIC_KEY=<generate with web-push>
VAPID_PRIVATE_KEY=<generate with web-push>
VAPID_EMAIL=mailto:your@email.com
APP_URL=https://<tailscale-hostname>
FAMILY_NAME=Baby Tracker
TIMEZONE=America/Chicago

# packages/client/.env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_VAPID_PUBLIC_KEY=<same-as-server>
```

---

## CI/CD Pipeline (ADR-005)

1. Push to any branch → GitHub Actions runs lint + typecheck + build
2. Merge to `main` → also builds and pushes Docker images to Docker Hub
3. Watchtower on Unraid polls Docker Hub every 5 minutes → pulls new image → restarts containers
4. Images are tagged with both `latest` and the git SHA (`tracker-server:<sha>`) for rollback

**Rollback:** Re-push the previous SHA tag or revert the PR merge commit and let the pipeline redeploy.

**Required GitHub secrets:** `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

---

## Architecture Decision Index

All ADRs are in `docs/ADRs.md`. Summary:

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | PWA (React + Vite + Workbox) over React Native | Accepted |
| ADR-002 | PostgreSQL over SQLite (concurrent writes) | Accepted |
| ADR-003 | Socket.io for real-time sync; 3-state connection model | Accepted |
| ADR-004 | JWT + httpOnly cookie + WebAuthn passkeys; no self-registration | Accepted |
| ADR-005 | GitHub Actions → Docker Hub → Watchtower deploy pipeline | Accepted |
| ADR-006 | Tailscale for remote access (data never leaves home network) | Accepted |
| ADR-007 | REST over GraphQL; one Express router per feature | Accepted |
| ADR-008 | React Hook Form + Zod; schemas shared between client and server | Accepted |
| ADR-009 | Config-driven design; all family-specific values via env vars | Accepted |
| ADR-010 | TanStack AI for streaming; exact version pinning | Accepted |
| ADR-011 | VisitorSlot: separate `date` String field to avoid UTC offset issues | Accepted |
| ADR-012 | Stay with Vite + React Router; do not migrate to Next.js | Accepted |
| ADR-013 | Utility placement two-tier rule; import ordering; barrel exports | Accepted |
| ADR-014 | All work on feature branches via PR; no direct commits to `main` | Accepted |

---

*Last updated: 2026-05-17. Update this file whenever a new ADR is accepted or a convention changes.*
