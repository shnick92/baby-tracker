/**
 * Playwright screenshot & GIF capture script.
 *
 * Run against the local dev servers (not Docker):
 *   npm run dev          ← starts Vite on :5173 and Express on :3001
 *   npm run screenshots  ← in a second terminal
 *
 * Environment variables (all optional — sensible defaults for local dev):
 *   FRONTEND_URL   Browser-facing URL (Vite dev server)  default: http://localhost:5173
 *   API_URL        Express server URL (Node.js fetch)    default: http://localhost:3001
 *   DEMO_EMAIL     Login email                           default: SEED_USER_1_EMAIL from server/.env
 *   DEMO_PASSWORD  Login password                        default: SEED_USER_1_PASSWORD from server/.env
 */

import 'dotenv/config'
import * as dotenvPath from 'dotenv'
import { chromium, type BrowserContext, type Page } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

// Also load the server .env so SEED_USER_1_EMAIL / SEED_USER_1_PASSWORD resolve
dotenvPath.config({ path: path.resolve(__dirname, '../packages/server/.env') })

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const API_URL = process.env.API_URL ?? 'http://localhost:3001'
const EMAIL = process.env.DEMO_EMAIL ?? process.env.SEED_USER_1_EMAIL ?? 'parent1@example.com'
const PASSWORD = process.env.DEMO_PASSWORD ?? process.env.SEED_USER_1_PASSWORD ?? 'changeme'

const ROOT = path.resolve(__dirname, '..')
const MOBILE_DIR = path.join(ROOT, 'docs/screenshots/mobile')
const VIDEOS_DIR = path.join(ROOT, 'docs/screenshots/videos')

// Read VITE_FAMILY_SURNAME from client .env so we can strip it from screenshots
const clientEnvRaw = fs.existsSync(path.join(ROOT, 'packages/client/.env'))
  ? fs.readFileSync(path.join(ROOT, 'packages/client/.env'), 'utf8')
  : ''
const FAMILY_SURNAME = (() => {
  const line = clientEnvRaw.split('\n').find((l) => l.startsWith('VITE_FAMILY_SURNAME='))
  return line ? line.split('=').slice(1).join('=').trim() : ''
})()

// Pixel 5 — 393×851 logical px, 2.75× DPR, Android Chrome UA
const PIXEL5 = {
  viewport: { width: 393, height: 851 },
  deviceScaleFactor: 2.75,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  locale: 'en-US',
  timezoneId: process.env.TIMEZONE ?? 'America/Chicago',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedDemo(): Promise<string> {
  // Use API_URL directly — Node.js fetch can't use Vite's proxy
  const r = await fetch(`${API_URL}/api/dev/seed-demo`, { method: 'POST' })
  if (!r.ok) {
    const body = await r.text()
    throw new Error(`Seed failed (${r.status}): ${body}`)
  }
  const json = (await r.json()) as { data: { episodeId: string } }
  console.log('  demo data seeded')
  return json.data.episodeId
}

async function seedPregnancy(): Promise<void> {
  const r = await fetch(`${API_URL}/api/dev/seed-pregnancy`, { method: 'POST' })
  if (!r.ok) {
    const body = await r.text()
    throw new Error(`Pregnancy seed failed (${r.status}): ${body}`)
  }
  console.log('  baby reset to pregnancy state')
}

async function newCtx(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  opts: { video?: boolean } = {},
): Promise<BrowserContext> {
  const ctx = await browser.newContext({
    ...PIXEL5,
    ...(opts.video
      ? { recordVideo: { dir: VIDEOS_DIR, size: { width: 393, height: 851 } } }
      : {}),
  })
  // Hide TanStack Query DevTools floating icon in every page loaded from this context
  await ctx.addInitScript(() => {
    const style = document.createElement('style')
    style.textContent = `
      .tsqd-parent-container,
      [data-testid="open-react-query-devtools"],
      button[aria-label*="TanStack" i],
      button[aria-label*="devtools" i]
      { display: none !important; }`
    document.head.appendChild(style)
  })
  return ctx
}

async function login(page: Page): Promise<void> {
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await Promise.all([
    page.click('button[type=submit]'),
    page.waitForURL(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' }),
  ])
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: path.join(MOBILE_DIR, name), fullPage: false })
  console.log(`  saved ${name}`)
}

// Rename the Playwright video UUID file to a meaningful name.
// Pass the page BEFORE calling ctx.close() — after close, ctx.pages() is empty.
// Playwright finalises the file on context close, so path() must be awaited after close.
// Login in a non-recording context and return cookies.
// The server rotates refresh tokens on every /api/auth/refresh call, so these cookies
// are single-use: consume them in one GIF context before calling this again.
async function getFreshCookies(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
): Promise<ReturnType<BrowserContext['cookies']>> {
  const ctx = await newCtx(browser)
  const page = await ctx.newPage()
  await login(page)
  const cookies = await ctx.cookies()
  await ctx.close()
  return cookies
}

async function renameVideo(page: Awaited<ReturnType<BrowserContext['newPage']>>, baseName: string): Promise<void> {
  const src = await page.video()?.path()
  if (src && fs.existsSync(src)) {
    const ext = path.extname(src) // .webm on all platforms
    const dest = path.join(VIDEOS_DIR, baseName + ext)
    fs.renameSync(src, dest)
    console.log(`  video saved ${baseName}${ext}`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  fs.mkdirSync(MOBILE_DIR, { recursive: true })
  // Clear videos dir so stale files from prior failed runs don't get converted to GIFs
  if (fs.existsSync(VIDEOS_DIR)) {
    for (const f of fs.readdirSync(VIDEOS_DIR)) fs.rmSync(path.join(VIDEOS_DIR, f))
  }
  fs.mkdirSync(VIDEOS_DIR, { recursive: true })

  const browser = await chromium.launch({ slowMo: 80 })

  // ─ dashboard-pregnancy.png — pregnancy dashboard (before born-baby seed) ─────
  console.log('\nCapturing pregnancy dashboard…')
  await seedPregnancy()
  {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    await login(page)
    await page.waitForTimeout(600)
    await shot(page, 'dashboard-pregnancy.png')
    await ctx.close()
  }

  // ─ Seed full born-baby demo data ─────────────────────────────────────────────
  console.log('\nSeeding born-baby demo data…')
  const episodeId = await seedDemo()

  // ─ login.png ─────────────────────────────────────────────────────────────────
  console.log('\nCapturing static screenshots…')
  {
    const ctx = await newCtx(browser)
    const page = await ctx.newPage()
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle' })
    await page.waitForSelector('form')
    await shot(page, 'login.png')
    await ctx.close()
  }

  // Shared authenticated context for the remaining static shots.
  // We extract cookies after login so GIF contexts can skip the login flow entirely
  // (avoids the flash of the login form being filled in the recording).
  const ctx = await newCtx(browser)
  const page = await ctx.newPage()
  await login(page)

  // ─ feeding.png ────────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/feeding`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await shot(page, 'feeding.png')

  // ─ diaper.png — tap Dirty to expand detail card ──────────────────────────────
  await page.goto(`${FRONTEND_URL}/diaper`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Dirty' }).first().click()
  await page.waitForTimeout(400)
  await shot(page, 'diaper.png')

  // ─ calendar-all.png ───────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/calendar`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await shot(page, 'calendar-all.png')

  // ─ calendar-feedings.png — click Feedings filter chip ────────────────────────
  await page.getByRole('button', { name: 'Feedings' }).click()
  await page.waitForTimeout(300)
  await shot(page, 'calendar-feedings.png')

  // ─ checklist.png ──────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/checklist/HOSPITAL_BAG_MOM`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'checklist.png')

  // ─ purchases.png ──────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/purchases`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'purchases.png')

  // ─ ai-chat.png ────────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/ai/chat`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await shot(page, 'ai-chat.png')

  // ─ growth-chart.png — wait for SVG to render ─────────────────────────────────
  await page.goto(`${FRONTEND_URL}/weight`, { waitUntil: 'networkidle' })
  await page.waitForSelector('svg', { timeout: 8000 }).catch(() => null)
  await page.waitForTimeout(500)
  await shot(page, 'growth-chart.png')

  // ─ history.png ────────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/history`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await shot(page, 'history.png')

  // ─ quick-log.png — dashboard with AI quick log visible ───────────────────────
  await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  // Scroll to the bottom where QuickLogInput lives, then screenshot
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(200)
  await shot(page, 'quick-log.png')

  // ─ illness-landing.png ────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/illness`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'illness-landing.png')

  // ─ illness-episode.png — episode detail with symptoms + temp log ──────────────
  await page.goto(`${FRONTEND_URL}/illness/${episodeId}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'illness-episode.png')

  // ─ illness-report.png — format picker open (PDF vs text) ─────────────────────
  // Click the chevron button (aria-label="Choose report format") to open the picker
  await page.getByRole('button', { name: /choose report format/i }).first().click()
  await page.waitForTimeout(400)
  await shot(page, 'illness-report.png')

  // ─ medication.png ─────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/medication`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await shot(page, 'medication.png')

  // ─ tummy-time.png ────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/tummy-time`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await shot(page, 'tummy-time.png')

  // ─ mood.png ───────────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/mood`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await shot(page, 'mood.png')

  // ─ visitors.png ──────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/visitors`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await shot(page, 'visitors.png')

  // ─ alerts.png ────────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/alerts`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await shot(page, 'alerts.png')

  // ─ more.png ───────────────────────────────────────────────────────────────────
  await page.goto(`${FRONTEND_URL}/more`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await shot(page, 'more.png')

  // ─ dashboard.png — newborn state dashboard (static, replaces dashboard.gif) ───
  await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  await shot(page, 'dashboard.png')

  // ─ sleep.png — sleep page with active nap timer (static, replaces sleep.gif) ──
  await page.goto(`${FRONTEND_URL}/sleep`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  await shot(page, 'sleep.png')

  // ─ baby-names.png — name candidates with emoji reactions ─────────────────────
  // Strips VITE_FAMILY_SURNAME from rendered text so no real surname appears in
  // the screenshot (it's baked into the bundle at build time).
  await page.goto(`${FRONTEND_URL}/names`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  if (FAMILY_SURNAME) {
    await page.evaluate((surname) => {
      const pattern = new RegExp('\\s+' + surname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          node.textContent = node.textContent.replace(pattern, '')
        }
        node.childNodes.forEach(walk)
      }
      walk(document.body)
    }, FAMILY_SURNAME)
  }
  await shot(page, 'baby-names.png')

  // ── Planned Phase 6 screens — add captures here when features ship ────────────
  // TODO vaccinations.png   → /vaccination   (Phase 6: Vaccination Tracker)
  // TODO milestones.png     → /milestones    (Phase 6: Milestone Tracking)
  // TODO settings.png       → /settings      (Phase 6: Settings Page)
  // TODO export.png         → /settings/export (Phase 6: Data Export Page)
  // TODO health-summary.png → /settings/export + health summary tab

  await ctx.close()

  // ── GIF flows (recorded as MP4/webm, converted by make-gifs.sh) ──────────────
  // The server rotates refresh tokens on every /api/auth/refresh call, so each GIF
  // context needs its own fresh login (captured in a non-recording context first).
  // This avoids the login-form flash inside the recording.
  console.log('\nRecording GIF flows…')

  // ─ dashboard.gif — feeding timer ticking for ~5s ─────────────────────────────
  {
    const gifCtx = await newCtx(browser, { video: true })
    await gifCtx.addCookies(await getFreshCookies(browser))
    const p = await gifCtx.newPage()
    await p.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(5500)
    await gifCtx.close()
    await renameVideo(p, 'dashboard')
  }

  // ─ sleep.gif — active nap timer already running from seed ────────────────────
  {
    const gifCtx = await newCtx(browser, { video: true })
    await gifCtx.addCookies(await getFreshCookies(browser))
    const p = await gifCtx.newPage()
    await p.goto(`${FRONTEND_URL}/sleep`, { waitUntil: 'networkidle' })
    await p.waitForTimeout(5500)
    await gifCtx.close()
    await renameVideo(p, 'sleep')
  }

  // ─ sos-sheet.gif — SOS bottom sheet slides up ────────────────────────────────
  {
    const gifCtx = await newCtx(browser, { video: true })
    await gifCtx.addCookies(await getFreshCookies(browser))
    const p = await gifCtx.newPage()
    await p.goto(`${FRONTEND_URL}/`, { waitUntil: 'networkidle' })
    // The SOS button renders after usePregnancyStatus resolves (born=true), which
    // fires sequentially after auth refresh. Poll the DOM directly rather than
    // using waitForSelector, which can be unreliable inside a recording context.
    await p.waitForFunction(() => document.querySelector('[title*="SOS"]') !== null, { timeout: 12000 })
    await p.waitForTimeout(300)
    // force:true bypasses Playwright's visibility actionability check — the button
    // may be partially obscured by header layering in headless mode
    await p.locator('[title*="SOS"]').first().click({ force: true })
    await p.waitForTimeout(3000)
    await gifCtx.close()
    await renameVideo(p, 'sos-sheet')
  }

  await browser.close()

  console.log('\nDone.')
  console.log('  Static screenshots → docs/screenshots/mobile/')
  console.log('  Video recordings   → docs/screenshots/videos/')
  console.log('  Run `npm run screenshots:gifs` to convert to GIFs.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
