import { getTwilioClient } from '../lib/twilio'

const IOS_DELAY_MS = 5_000
const ANDROID_DELAY_MS = 20_000

type PendingCall = {
  timeout: ReturnType<typeof setTimeout>
  callSid: string | null
}

const pending = new Map<string, PendingCall>()

function buildTwiml(senderFirstName: string): string {
  const escaped = senderFirstName.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] ?? c),
  )
  const line = `SOS from ${escaped}. You're needed urgently.`
  return [
    '<Response>',
    `<Say voice="Polly.Joanna">${line}</Say>`,
    '<Pause length="2"/>',
    `<Say voice="Polly.Joanna">${line}</Say>`,
    '</Response>',
  ].join('')
}

export function scheduleSosCall(
  alertId: string,
  recipientPhone: string,
  senderName: string,
  hasIosSubscription: boolean,
): void {
  const client = getTwilioClient()
  const from = process.env.TWILIO_FROM_NUMBER
  if (!client) {
    console.warn('[sos-call] Twilio client unavailable — check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN env vars')
    return
  }
  if (!from) {
    console.warn('[sos-call] TWILIO_FROM_NUMBER env var not set — skipping call')
    return
  }
  if (!recipientPhone) {
    console.warn('[sos-call] Recipient has no phone number — skipping call')
    return
  }

  const delayMs = hasIosSubscription ? IOS_DELAY_MS : ANDROID_DELAY_MS
  console.log(`[sos-call] Scheduling call to ${recipientPhone} in ${delayMs}ms (alertId=${alertId})`)
  const twiml = buildTwiml(senderName.split(' ')[0])
  const entry: PendingCall = { timeout: null as unknown as ReturnType<typeof setTimeout>, callSid: null }

  entry.timeout = setTimeout(async () => {
    try {
      const call = await client.calls.create({ to: recipientPhone, from, twiml })
      entry.callSid = call.sid
      console.log(`[sos-call] Call placed — SID=${call.sid}`)
    } catch (err) {
      console.error('[sos-call] Twilio call failed:', err)
    } finally {
      pending.delete(alertId)
    }
  }, delayMs)

  pending.set(alertId, entry)
}

export async function cancelSosCall(alertId: string): Promise<void> {
  const entry = pending.get(alertId)
  if (!entry) return

  pending.delete(alertId)
  clearTimeout(entry.timeout)

  if (entry.callSid) {
    try {
      const client = getTwilioClient()
      await client?.calls(entry.callSid).update({ status: 'canceled' })
    } catch {
      // Call may already be in-progress — not an error worth surfacing
    }
  }
}
