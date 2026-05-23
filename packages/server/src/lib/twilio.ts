import twilio from 'twilio'

let _client: ReturnType<typeof twilio> | null = null

export function getTwilioClient(): ReturnType<typeof twilio> | null {
  if (_client) return _client
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) return null
  _client = twilio(sid, token)
  return _client
}
