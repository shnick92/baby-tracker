# Claude AI Integration — Baby Tracker

**Backend:** Node.js Express server (private home server)  
**API key:** Server-side only — never exposed to client  
**Implementation:** TanStack AI (`@tanstack/ai` + `@tanstack/ai-react`) for streaming; direct Anthropic SDK for non-streaming

---

## Quick-Start Priority Order

Build in this order — each feature shares infrastructure and prompts with the next:

1. **Natural Language Logging** — highest daily value, lowest complexity, cheapest to run
2. **"Is This Normal?" Assistant** — high emotional value, moderate complexity
3. **Weekly Digest** — periodic, easy to build once NLP and data model are solid
4. **Pattern Recognition** — requires 1–2 weeks of data before it's meaningful; build after launch
5. **Pregnancy Prep Assistant** — useful pre-birth, time-boxed feature

All features share the same Anthropic client setup and prompt-building utilities — build those as shared modules from the start.

---

## Section 1: Natural Language Logging

### The Problem

At 3am, opening an app and tapping through dropdowns is brutal. A parent has a baby on one arm and is half-asleep. Natural language input — typed or dictated via the device's native speech-to-text — removes all friction.

### System Prompt

```
You are a data extraction assistant for a baby tracking app. 
Your job is to parse a parent's natural language note into structured log entries.

Extract one or more events from the input. Each event must conform to one of these types:

FEEDING:
  type: "feeding"
  method: "breast" | "bottle" | "pump"
  side: "left" | "right" | "both" | null
  amount_oz: number | null
  duration_minutes: number | null
  notes: string | null

SLEEP:
  type: "sleep"
  start_time: ISO8601 string or null
  end_time: ISO8601 string or null
  duration_minutes: number | null
  location: "crib" | "bassinet" | "contact" | "car" | "stroller" | "other" | null
  notes: string | null

DIAPER:
  type: "diaper"
  diaper_type: "wet" | "dirty" | "both" | "dry"
  stool_color: string | null
  stool_consistency: string | null
  notes: string | null

MOOD:
  type: "mood"
  mood: "calm" | "fussy" | "crying" | "happy" | "sleeping"
  duration_minutes: number | null
  notes: string | null

Rules:
- The current timestamp is provided in each request. Use it for relative times ("just now", "an hour ago").
- If a value is ambiguous or missing, use null. Do not guess.
- If an input contains multiple events, return an array.
- Return ONLY valid JSON. No explanation, no markdown, no prose.
- If nothing can be extracted, return: {"error": "Could not parse input", "raw": "<original input>"}
```

### Example Inputs and Outputs

**Input:** `"fed 3oz from a bottle, seemed a bit gassy. Changed her diaper too — wet only."`

```json
[
  {
    "type": "feeding",
    "method": "bottle",
    "side": null,
    "amount_oz": 3,
    "duration_minutes": null,
    "notes": "seemed a bit gassy"
  },
  {
    "type": "diaper",
    "diaper_type": "wet",
    "stool_color": null,
    "stool_consistency": null,
    "notes": null
  }
]
```

**Input:** `"Nursed on the left for about 20 minutes starting around 2:30, fell asleep at the breast"`

```json
[
  {
    "type": "feeding",
    "method": "breast",
    "side": "left",
    "amount_oz": null,
    "duration_minutes": 20,
    "notes": "fell asleep at the breast"
  }
]
```

### Node.js Implementation

```typescript
// POST /api/log/natural-language
async function parseNaturalLanguageLog(req: Request, res: Response) {
  const { text } = req.body
  const now = new Date().toISOString()

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',  // Fast and cheap for structured extraction
    max_tokens: 512,
    system: NATURAL_LANGUAGE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Current time: ${now}\nParent input: "${text}"`
      }
    ]
  })

  let parsed
  try {
    parsed = JSON.parse(response.content[0].text)
  } catch {
    return res.status(422).json({ error: 'Failed to parse response', raw: text })
  }

  if (parsed.error) return res.status(422).json(parsed)

  const entries = Array.isArray(parsed) ? parsed : [parsed]
  const saved = await Promise.all(entries.map(entry => db.logs.insert({
    ...entry,
    logged_at: now,
    source: 'nlp'
  })))

  res.json({ data: saved, error: null })
}
```

### Edge Cases

| Scenario | Handling |
|---|---|
| Ambiguous time ("earlier today") | Pass current time in prompt; Claude uses relative reasoning. Set `start_time: null` if unresolvable. |
| Multiple events in one sentence | System prompt returns an array. Always normalize to array before saving. |
| Completely unparseable input | Claude returns `{"error": ..., "raw": ...}`. Surface "We couldn't understand that — try being more specific." |
| Very short input ("wet diaper") | Works — Claude handles minimal input. Test edge cases during development. |

**Model:** `claude-haiku-4-5` — fast (< 1 second), cheap (~$0.001 per parse), strong enough for structured extraction.

---

## Section 2: Pattern Recognition & Predictions

### Data Pre-Processing

Pull the last 7–14 days of logs, pre-aggregated into a compact readable format to minimize tokens:

```typescript
function formatLogsForAnalysis(logs: LogEntry[]): string {
  const byDay = groupBy(logs, log => log.logged_at.substring(0, 10))
  
  return Object.entries(byDay).map(([date, dayLogs]) => {
    const feedings = dayLogs.filter(l => l.type === 'feeding')
    const sleeps = dayLogs.filter(l => l.type === 'sleep')
    
    return [
      `=== ${date} ===`,
      `Feedings (${feedings.length}): ${feedings.map(f => 
        `${formatTime(f.logged_at)} ${f.method}${f.amount_oz ? ' ' + f.amount_oz + 'oz' : ''}${f.duration_minutes ? ' ' + f.duration_minutes + 'min' : ''}`
      ).join(', ')}`,
      `Sleep: ${sleeps.map(s => 
        `${formatTime(s.start_time || s.logged_at)}–${s.end_time ? formatTime(s.end_time) : '?'} (${s.duration_minutes || '?'}min) @ ${s.location || 'unknown'}`
      ).join(', ')}`
    ].join('\n')
  }).join('\n\n')
}
```

### System Prompt for Analysis

```
You are a baby development analyst for a parenting app. You receive structured logs of a baby's feedings and sleep over the past 1–2 weeks.

Identify patterns, make predictions, and flag anomalies. Be specific and practical.

Return a JSON object:
{
  "schedule_patterns": [
    {
      "event_type": "feeding" | "sleep",
      "pattern": "string describing the pattern",
      "confidence": "high" | "medium" | "low",
      "typical_times": ["HH:MM", ...]
    }
  ],
  "next_predicted_feeding": {
    "estimated_time": "HH:MM",
    "basis": "string explaining the prediction",
    "window_minutes": number
  },
  "anomalies": [
    {
      "description": "string",
      "severity": "info" | "watch" | "concern",
      "recommendation": "string"
    }
  ],
  "nap_suggestions": [
    {
      "suggested_nap_start": "HH:MM",
      "reasoning": "string"
    }
  ],
  "summary": "2-3 sentence plain-English summary"
}

Important:
- Base all observations on the data provided. Do not invent patterns.
- For anomalies flagged "concern", always include "Consult your pediatrician" in the recommendation.
- If insufficient data (< 3 days), set patterns to [] and note in the summary.
```

### Caching Strategy

Analysis is expensive (Sonnet) and doesn't need to run constantly:

```typescript
async function getAnalysis(babyId: string) {
  const cache = await db.analysisCache.findOne({ babyId })
  const latestLog = await db.logs.findLatest({ babyId })
  
  if (cache && cache.generated_at > latestLog.logged_at) {
    return cache.result  // Still fresh
  }
  
  const logs = await db.logs.findRecent({ babyId, days: 14 })
  const result = await runAnalysis(logs)
  
  await db.analysisCache.upsert({ babyId, result, generated_at: new Date() })
  return result
}

// Only re-analyze if sufficient new data exists
const MIN_NEW_LOGS_FOR_REANALYSIS = 5

async function shouldReanalyze(babyId: string): Promise<boolean> {
  const lastAnalysis = await db.analysisCache.findLatest({ babyId })
  if (!lastAnalysis) return true
  const newLogCount = await db.logs.countSince({ babyId, since: lastAnalysis.generated_at })
  return newLogCount >= MIN_NEW_LOGS_FOR_REANALYSIS
}
```

**Model:** `claude-sonnet-4-6` — pattern analysis requires genuine reasoning over time-series data.

---

## Section 3: "Is This Normal?" Assistant

### Liability Framing — Critical

This must be handled carefully. The app is not a medical device. Claude should be honest, informative, and evidence-based — but always frame responses as informational context, not diagnosis.

### System Prompt

```
You are a knowledgeable parenting support assistant for a baby tracking app. You have access to this baby's recent health data (provided in each message).

Your role:
1. Provide evidence-based, factual context about common newborn behaviors and symptoms
2. Help parents understand what is typical vs. worth monitoring
3. Always be clear you are providing informational context only, not medical advice
4. Know exactly when to recommend contacting a healthcare provider

Framing rules:
- Never say "this is normal" as a standalone reassurance. Say "this is commonly reported and is often normal, but..."
- Never diagnose. You can say "this sounds consistent with [common condition]" — not "this is [condition]."
- For ANY of the following, immediately and prominently recommend calling a doctor or going to the ER:
  * Fever over 100.4°F (38°C) in a baby under 3 months
  * Fewer than 6 wet diapers/day after day 5
  * Baby is difficult to wake or unusually lethargic
  * Breathing issues, persistent coughing, or blue-tinged skin
  * Blood in stool or urine
  * Inconsolable crying lasting more than 3 hours
  * Any symptom the parent describes as "severe" or "very worried"
- End responses with: "This is informational context, not medical advice. When in doubt, contact your pediatrician."
- Keep responses concise but complete. Bullet points are fine for lists of typical causes.

Tone: warm, calm, informed. Like a knowledgeable friend who has read every AAP guideline.
```

### Conversation Structure

```typescript
function buildBabyContext(baby: Baby, recentLogs: RecentLogSummary): string {
  return `
Baby profile:
- Age: ${baby.ageInDays} days (${baby.ageInWeeks} weeks)
- Birth weight: ${baby.birthWeightOz}oz, Current weight: ${baby.currentWeightOz || 'unknown'}oz

Recent summary (last 24 hours):
- Feedings: ${recentLogs.feedingCount} (total ${recentLogs.totalOz}oz)
- Wet diapers: ${recentLogs.wetDiapers}
- Dirty diapers: ${recentLogs.dirtyDiapers}
- Total sleep: ${recentLogs.totalSleepMinutes} minutes
- Last noted mood: ${recentLogs.lastMood || 'not recorded'}

Recent health notes: ${recentLogs.healthNotes.join('; ') || 'none'}
  `.trim()
}
```

### Streaming via TanStack AI

**Server — Express route:**

```typescript
// packages/server/src/routes/ai.ts
import { chat, toServerSentEventsResponse } from '@tanstack/ai'
import { anthropicText } from '@tanstack/ai-anthropic'

router.post('/chat', requireAuth, async (req, res) => {
  const { messages, babyId } = req.body
  const logSummary = await getLast14DaysSummary(babyId)
  const babyContext = await buildBabyContext(babyId)

  const stream = chat({
    adapter: anthropicText('claude-sonnet-4-6'),
    system: buildSystemPrompt(logSummary, babyContext),
    messages,
  })

  return toServerSentEventsResponse(stream)
})
```

**Client — React hook:**

```typescript
// packages/client/src/features/ai/useNormalAssistant.ts
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { useMutation } from '@tanstack/react-query'

export function useNormalAssistant(babyId: string) {
  const persistMutation = useMutation({ mutationFn: persistConversationExchange })

  return useChat({
    connection: fetchServerSentEvents('/api/ai/chat'),
    onFinish: (message) => {
      persistMutation.mutate({ babyId, role: 'assistant', content: message.content })
    },
  })
}

// Usage in component:
// const { messages, sendMessage, isLoading, stop } = useNormalAssistant(babyId)
```

`messages` updates incrementally as chunks arrive. `isLoading` drives the typing indicator. `stop()` handles cancellation if the parent navigates away.

**Persisting conversation history:** Store completed exchanges in `AIConversationLog` (sessionId, role, content, createdAt). Include the last 10 exchanges in subsequent prompts for cross-session context.

### Example Conversations

**Cluster feeding:**
> "She's been cluster feeding for 3 hours, is that normal?"

Claude response: Explains cluster feeding (supply regulation, growth spurts, witching hour), references baby's actual feeding data from the 24-hour summary, notes what to watch for (inconsolable even while feeding, arching back — possible reflux). Ends with disclaimer.

**Wet diaper concern:**
> "She's only had 4 wet diapers today at 1 week old"

Claude response: Flags clearly — 4 wet diapers at 1 week is below the expected range and warrants a call today. Lists what to check (tears, moist mouth, alertness). Does not hedge. Recommends calling nurse line now.

---

## Section 4: Weekly Digest

### Data Structure

```typescript
interface WeeklySummaryData {
  week: string                      // "2026-05-10 to 2026-05-16"
  baby_age_at_start: number         // days
  feedings: {
    total: number
    avg_per_day: number
    total_oz: number
    by_method: Record<string, number>
  }
  sleep: {
    total_minutes: number
    avg_per_day_minutes: number
    longest_stretch_minutes: number
  }
  diapers: {
    wet: number
    dirty: number
    avg_wet_per_day: number
  }
  health_notes: Array<{ date: string; note: string; severity: string }>
  milestone_notes: Array<{ date: string; milestone: string }>
}
```

### System Prompt

```
You are a pediatric data analyst writing a weekly summary for new parents.
Write a warm, clear, professional summary that parents could share with their pediatrician.

Return JSON:
{
  "title": "Week of [dates] — [Baby Name]'s Summary",
  "narrative_summary": "3-4 paragraph narrative. Use past tense. Be specific with numbers.",
  "stats_highlights": [
    { "label": "Avg feedings per day", "value": "string", "context": "brief note" }
  ],
  "trends": [
    { "trend": "string description", "direction": "positive" | "neutral" | "concerning" }
  ],
  "notable_events": ["string"],
  "questions_for_pediatrician": ["string"],
  "next_week_watch": "1-2 sentences on what to watch for developmentally"
}

Tone: warm and reassuring. Specific and data-driven. If something warrants pediatrician attention, say so clearly without alarming language.
Do not invent data. Only report what is in the provided summary.
```

### Scheduling

Use `node-cron` to run every Sunday at 8pm:

```typescript
import cron from 'node-cron'

cron.schedule('0 20 * * 0', async () => {
  const babies = await db.babies.findAll()
  await Promise.all(babies.map(baby => generateAndStoreWeeklyDigest(baby.id)))
})
```

### PDF Export

```typescript
app.get('/api/summary/:weekId/pdf', requireAuth, async (req, res) => {
  const summary = await db.weeklySummaries.findById(req.params.weekId)
  const pdf = await generatePDF(summary)  // pdfkit or pdf-lib
  
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="tracker-week-of-${summary.week_start}.pdf"`)
  res.send(pdf)
})
```

**Model:** `claude-sonnet-4-6` — output quality is the point; runs once a week so cost impact is minimal.

---

## Section 5: Pregnancy Prep Assistant

### Hospital Bag Suggestions

```typescript
const prompt = `
Generate a prioritized hospital bag checklist for a parent with these details:
- Due date: ${dueDateFormatted}
- Current date: ${today} (${weeksUntilDue} weeks away)
- Birth plan: ${birthPlan}
- First baby: ${isFirstBaby}
- Partner attending: ${partnerAttending}
- Breastfeeding intention: ${breastfeedingPlan}

Return JSON:
{
  "sections": [
    {
      "section": "For the Birthing Parent — Labor & Delivery",
      "items": [
        {
          "item": "string",
          "priority": "essential" | "recommended" | "nice-to-have",
          "why": "one sentence",
          "pack_by": number  // days before due date
        }
      ]
    }
  ],
  "personalized_notes": ["string"],
  "timing_advice": "string"
}

Sections: For the Birthing Parent (Labor), For the Birthing Parent (Recovery), For Baby, For Partner, Documents & Admin.
Be specific — not "comfortable clothing" but "loose-fitting nightgown (hospital provides gowns, but many prefer their own)".
`
```

### OB Appointment Question Generator

```typescript
const appointmentPrompt = `
Generate questions for an OB appointment at ${gestationalWeek} weeks gestation.

Context:
- First pregnancy: ${isFirstPregnancy}
- Reported symptoms this week: ${symptoms.join(', ') || 'none'}
- Upcoming appointment type: ${upcomingAppointmentType}
- Open concerns: ${openConcerns || 'none noted'}

Return JSON array:
[{
  "question": "string",
  "why_to_ask": "one sentence",
  "category": "routine" | "symptom-based" | "planning" | "test-related"
}]

Prioritize: specific to this gestational week, symptom-based concerns, parent-noted questions. Avoid generic questions they could Google.
`
```

---

## Section 6: Implementation Notes

### Model Selection by Feature

| Feature | Model | Reasoning |
|---|---|---|
| Natural language log parsing | `claude-haiku-4-5` | Fast, cheap, structured extraction |
| Pattern analysis & predictions | `claude-sonnet-4-6` | Requires genuine reasoning over time-series data |
| "Is This Normal?" chat | `claude-sonnet-4-6` | Quality and accuracy matter; parents are trusting this |
| Weekly digest | `claude-sonnet-4-6` | Output quality is the point; runs once a week |
| Pregnancy prep features | `claude-haiku-4-5` or `claude-sonnet-4-6` | Haiku for simple checklists; Sonnet for nuanced advice |

### Approximate Cost Per Feature (2 users)

All estimates based on approximate 2026 pricing — verify current pricing at console.anthropic.com.

| Feature | Model | Cost per call | Typical usage | Monthly est. |
|---|---|---|---|---|
| NLP log parsing | Haiku | ~$0.001 | 10–15×/day | ~$0.40 |
| Pattern analysis | Sonnet | ~$0.021 | 2–3×/day (cached) | ~$1.26 |
| "Is This Normal?" chat | Sonnet | ~$0.014 | 5–10×/day | ~$2.10 |
| Weekly digest | Sonnet | ~$0.030 | 4×/month | ~$0.12 |
| **Total** | | | | **~$4/month** |

The main cost driver is chat frequency. If a parent gets into long multi-turn conversations daily, Sonnet costs add up. Monitor via the Anthropic console.

### Rate Limiting Strategy

For a private 2-user home server, rate limiting is mostly cost control:

```typescript
const rateLimits = {
  nlp_parse: { requests: 60, window_minutes: 60 },
  pattern_analysis: { requests: 10, window_minutes: 60 },
  chat: { requests: 30, window_minutes: 60 },
  weekly_digest: { requests: 3, window_minutes: 1440 }
}
```

### API Client Setup

```typescript
// packages/server/src/lib/anthropic.ts
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,  // In .env, never committed
})
```

### Error Handling

```typescript
async function callClaude(params: Anthropic.MessageCreateParams) {
  try {
    return await anthropic.messages.create(params)
  } catch (err: any) {
    if (err.status === 429) {
      await sleep(60_000)
      return anthropic.messages.create(params)
    }
    if (err.status >= 500) {
      console.error('Anthropic API error:', err)
      throw new Error('AI features temporarily unavailable')
    }
    throw err
  }
}
```

### Batch Natural Language Parsing

If a parent enters multiple quick notes back-to-back, batch them into one API call:

```typescript
const pending = await db.pendingNotes.findUnprocessed({ babyId })
if (pending.length > 1) {
  const batchInput = pending.map((n, i) => `${i + 1}. [${n.created_at}] ${n.text}`).join('\n')
  // Parse as array, match results back to pending entries by index
}
```

### Environment Variables

```env
# packages/server/.env
ANTHROPIC_API_KEY=sk-ant-...
```

Never commit `.env`. Always add to `.gitignore`.
