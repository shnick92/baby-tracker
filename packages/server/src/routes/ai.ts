import { Readable } from 'node:stream'
import { Router, type Request, type Response } from 'express'
import { chat, toServerSentEventsStream, chatParamsFromRequestBody } from '@tanstack/ai'
import { anthropicText } from '@tanstack/ai-anthropic'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import {
  parseNaturalLanguageLog,
  generateInsights,
  buildLogContext,
  getConversationHistory,
} from '../services/ai'

export const aiRouter = Router()
aiRouter.use(authMiddleware)

const CHAT_DAILY_LIMIT = 20
const INSIGHTS_CACHE_MS = 60 * 60 * 1000

const insightsCache = new Map<string, { data: Awaited<ReturnType<typeof generateInsights>>; cachedAt: number }>()

function requireApiKey(res: Response): boolean {
  if (!process.env['ANTHROPIC_API_KEY']) {
    res.status(503).json({ data: null, error: 'AI features are not configured on this server.' })
    return false
  }
  return true
}

// POST /api/ai/log — parse freeform text into a structured log entry
aiRouter.post('/log', async (req, res) => {
  if (!requireApiKey(res)) return
  const { text, babyId } = req.body as { text?: string; babyId?: string }
  if (!text || !babyId) {
    res.status(400).json({ data: null, error: 'text and babyId required' })
    return
  }
  if (text.length > 500) {
    res.status(400).json({ data: null, error: 'Text must be 500 characters or fewer' })
    return
  }

  try {
    const result = await parseNaturalLanguageLog(text, new Date().toISOString())
    res.json({ data: result, error: null })
  } catch (err) {
    console.error('[ai/log] parse error:', err)
    res.status(500).json({ data: null, error: 'Failed to parse log entry' })
  }
})

// GET /api/ai/insights?babyId= — pattern analysis (cached 1 hour)
aiRouter.get('/insights', async (req, res) => {
  if (!requireApiKey(res)) return
  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }

  const cached = insightsCache.get(babyId)
  if (cached && Date.now() - cached.cachedAt < INSIGHTS_CACHE_MS) {
    res.json({ data: cached.data, error: null })
    return
  }

  try {
    const data = await generateInsights(babyId)
    insightsCache.set(babyId, { data, cachedAt: Date.now() })
    res.json({ data, error: null })
  } catch (err) {
    console.error('[ai/insights] error:', err)
    res.status(500).json({ data: null, error: 'Failed to generate insights' })
  }
})

// GET /api/ai/chat/history?babyId=
aiRouter.get('/chat/history', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }
  const messages = await getConversationHistory(babyId)
  res.json({ data: messages, error: null })
})


// POST /api/ai/chat — streaming "Is This Normal?" chat via SSE (AG-UI protocol)
aiRouter.post('/chat', async (req: Request, res) => {
  if (!requireApiKey(res)) return

  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }

  try {
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const userMessageCount = await prisma.aIConversationLog.count({
      where: { babyId, role: 'USER', createdAt: { gte: dayStart } },
    })
    if (userMessageCount >= CHAT_DAILY_LIMIT) {
      res.status(429).json({ data: null, error: `Daily limit of ${CHAT_DAILY_LIMIT} questions reached. Try again tomorrow.` })
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let params: any
    try {
      params = await chatParamsFromRequestBody(req.body)
    } catch {
      res.status(400).json({ data: null, error: 'Invalid request body' })
      return
    }

    const logContext = await buildLogContext(babyId, 7)

    const systemPrompt = `You are a helpful baby care assistant for two parents tracking their baby.

${logContext}

Answer the parents' questions based on their baby's actual data when relevant. Be warm, practical, and specific.

IMPORTANT RULES:
- Never diagnose conditions or recommend specific medications
- Keep responses concise — 2-4 short paragraphs maximum
- When patterns in the data are relevant, reference them specifically
- Only when discussing specific symptoms, concerning health patterns, or medical topics, add one brief plain-text sentence at the end noting they should consult their pediatrician. Skip it for general pattern or behavior questions.`

    // Extract the user message text to persist (UIMessage uses parts[], ModelMessage uses content)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastUserMsg = [...params.messages].reverse().find((m: any) => m.role === 'user') as Record<string, unknown> | undefined
    let userText = ''
    if (lastUserMsg) {
      if ('parts' in lastUserMsg && Array.isArray(lastUserMsg['parts'])) {
        userText = (lastUserMsg['parts'] as Array<{ type: string; content?: string }>)
          .filter((p) => p.type === 'text')
          .map((p) => p.content ?? '')
          .join('')
      } else if (typeof lastUserMsg['content'] === 'string') {
        userText = lastUserMsg['content']
      } else if (Array.isArray(lastUserMsg['content'])) {
        userText = (lastUserMsg['content'] as Array<{ type: string; text?: string }>)
          .filter((p) => p.type === 'text')
          .map((p) => p.text ?? '')
          .join('')
      }
    }

    if (userText) {
      await prisma.aIConversationLog.create({
        data: { babyId, userId: req.user!.userId, role: 'USER', content: userText },
      })
    }

    const history = await getConversationHistory(babyId)

    const abortController = new AbortController()
    req.on('close', () => abortController.abort())

    const stream = chat({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adapter: anthropicText('claude-sonnet-4-6', { apiKey: process.env['ANTHROPIC_API_KEY'] }) as any,
      systemPrompts: [systemPrompt],
      messages: history.slice(-20),
      abortController,
    })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const sseStream = toServerSentEventsStream(stream, abortController)
    const nodeStream = Readable.fromWeb(sseStream as Parameters<typeof Readable.fromWeb>[0])
    nodeStream.pipe(res)

    // Collect assistant response text to persist
    let assistantContent = ''
    nodeStream.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString().split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6)) as { type?: string; delta?: string }
            if (parsed.type === 'TEXT_MESSAGE_CONTENT' && parsed.delta) {
              assistantContent += parsed.delta
            }
          } catch { /* non-JSON SSE lines (RUN_FINISHED etc.) */ }
        }
      }
    })

    nodeStream.on('end', async () => {
      if (assistantContent && !abortController.signal.aborted) {
        try {
          await prisma.aIConversationLog.create({
            data: { babyId, userId: req.user!.userId, role: 'ASSISTANT', content: assistantContent },
          })
          // Trim to last 20 messages (10 exchanges)
          const all = await prisma.aIConversationLog.findMany({
            where: { babyId },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          })
          if (all.length > 20) {
            await prisma.aIConversationLog.deleteMany({ where: { id: { in: all.slice(20).map((l) => l.id) } } })
          }
        } catch (err) {
          console.error('[ai/chat] persist error:', err)
        }
      }
    })
  } catch (err) {
    console.error('[ai/chat] error:', err)
    if (!res.headersSent) {
      res.status(500).json({ data: null, error: 'Chat request failed' })
    } else {
      res.end()
    }
  }
})

// GET /api/ai/weekly-summary?babyId=
aiRouter.get('/weekly-summary', async (req, res) => {
  const babyId = req.query['babyId'] as string
  if (!babyId) {
    res.status(400).json({ data: null, error: 'babyId required' })
    return
  }
  const summaries = await prisma.aIWeeklySummary.findMany({
    where: { babyId },
    orderBy: { weekOf: 'desc' },
    take: 12,
  })
  res.json({ data: summaries, error: null })
})
