import { prisma } from './prisma'
import type { AIUsageRoute } from '@prisma/client'

// Haiku 4.5 and Sonnet 4.6 pricing in USD per token (as of 2026-05)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80 / 1_000_000, output: 4.00 / 1_000_000 },
  'claude-sonnet-4-6': { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
}

export function isAIEnabled(): boolean {
  if (process.env['AI_ENABLED'] === 'false') return false
  if (!process.env['ANTHROPIC_API_KEY']) return false
  return true
}

export function isSeedGuarded(): boolean {
  return process.env['SEED_DATA_GUARD'] === 'true'
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? { input: 0, output: 0 }
  const raw = inputTokens * pricing.input + outputTokens * pricing.output
  return Math.round(raw * 1_000_000) / 1_000_000
}

interface UsageParams {
  route: AIUsageRoute
  model: string
  inputTokens: number
  outputTokens: number
  babyId?: string | null
  userId?: string | null
}

export async function logAIUsage(params: UsageParams): Promise<void> {
  const costUsdEstimate = estimateCost(params.model, params.inputTokens, params.outputTokens)
  try {
    await prisma.aIUsageLog.create({
      data: {
        route: params.route,
        model: params.model,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costUsdEstimate,
        babyId: params.babyId ?? null,
        userId: params.userId ?? null,
      },
    })
  } catch (err) {
    console.error('[aiGuards] failed to write usage log:', err)
  }
}

export async function isDailyCallCapExceeded(): Promise<boolean> {
  const limit = parseInt(process.env['AI_DAILY_CALL_LIMIT'] ?? '200', 10)
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const count = await prisma.aIUsageLog.count({ where: { calledAt: { gte: dayStart } } })
  return count >= limit
}

export async function isInsightsDailyLimitExceeded(babyId: string): Promise<boolean> {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const count = await prisma.aIUsageLog.count({
    where: { babyId, route: 'INSIGHTS', calledAt: { gte: dayStart } },
  })
  return count >= 50
}
