import { readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
const keys = ['claimed', 'sent', 'retry', 'failed']
const minute = 60_000
const credential = async name => (await readFile(join(process.env.CREDENTIALS_DIRECTORY, name), 'utf8')).trim()
async function boundedText(response) {
  if (!response.ok || !response.body) throw Error('response')
  const chunks = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    if (size > 1024 * 1024) throw Error('size')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}
export async function inspect(token, now, request = fetch) {
  const response = await request('https://www.workmatchr.nl/api/maintenance/marketplace/status', {
    method: 'GET', headers: { Authorization: 'Bearer ' + token }, redirect: 'error',
    cache: 'no-store', signal: AbortSignal.timeout(6000),
  })
  const { lastSuccessfulAt, counters, ready, expiredLeases, status } = JSON.parse(await boundedText(response))
  const count = value => Number.isSafeInteger(value) && value >= 0
  if (!count(ready) || !count(expiredLeases) || !['NEVER', 'RUNNING', 'COMPLETED', 'FAILED'].includes(status)) throw Error('status')
  const success = lastSuccessfulAt === null ? null : Date.parse(lastSuccessfulAt)
  if (success === null) {
    if (counters !== null || status === 'COMPLETED') throw Error('inconsistent status')
  } else if (!Number.isFinite(success) || success > now || !keys.every(k => count(counters?.[k])) ||
    counters.sent + counters.retry + counters.failed > counters.claimed) throw Error('invalid dispatch')
  return { success, report: counters, ready, expiredLeases, status }
}
export function assess(observation, now) {
  if (!observation) return 'METING_ONBEKEND'
  const age = observation.success === null ? Infinity : now - observation.success
  if (observation.status === 'FAILED') return 'KRITIEK'
  if (age >= 54 * minute) return 'KRITIEK'
  if (age >= 24 * minute) return 'WAARSCHUWING'
  if (!observation.report) return 'VERWERKING_ONBEKEND'
  const r = observation.report
  if (observation.ready || observation.expiredLeases || r.failed || r.retry || r.claimed !== r.sent) return 'VERWERKING_CONTROLEREN'
  return 'OK'
}
export async function cycle({ state, save, send, level, now }) {
  if (state.level !== level) {
    if (level !== 'OK' && (!state.incident || state.level === 'OK')) state.incident = randomUUID()
    if (level !== 'OK' || state.level) state.pending.push({ key: randomUUID(), incident: state.incident, level, at: now })
    state.level = level
    await save(state)
  }
  while (state.pending.length) {
    const event = state.pending[0]
    // Beyond the provider idempotency window require human reconciliation.
    if (now - event.at >= 23 * 3600000) throw Error('ALARM_HANDMATIG_CONTROLEREN')
    const id = await send(event)
    if (!id) throw Error('delivery')
    state.lastReceipt = { key: event.key, id, level: event.level, at: now }
    state.pending.shift()
    await save(state)
    console.log(JSON.stringify({ fase: event.level, incident: event.incident, provider: id }))
  }
}
export async function main() {
  const now = Date.now()
  const path = join(process.env.STATE_DIRECTORY, 'status.json')
  const save = async state => {
    await writeFile(path + '.next', JSON.stringify(state), { mode: 0o600, flush: true })
    await rename(path + '.next', path)
  }
  let state
  try { state = JSON.parse(await readFile(path, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error; state = { pending: [], level: null, incident: null } }
  const statusToken = await credential('status-read')
  const resend = await credential('resend-send')
  const from = await credential('afzender')
  if (!statusToken || !resend || !from || /[\r\n]/.test(from)) throw Error('config')
  let observation
  try { observation = await inspect(statusToken, now) } catch { observation = null }
  const level = assess(observation, Date.now())
  await cycle({ state, level, now, save, send: async event => {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', redirect: 'error',
      signal: AbortSignal.timeout(6000), headers: { Authorization: 'Bearer ' + resend, 'Content-Type': 'application/json', 'Idempotency-Key': event.key },
      body: JSON.stringify({ from, to: ['info@workmatchr.nl'], subject: 'WorkMatchr Marketplace — ' + event.level,
        text: 'Incident ' + event.incident + '\nFase ' + event.level + '\nTijd ' + new Date(event.at).toISOString() +
          '\nControleer de dispatchrun, telleruitkomst en eventuele achterstand.' }) })
    return JSON.parse(await boundedText(response)).id
  } })
  console.log(JSON.stringify({ level, counters: observation?.report ?? null }))
  if (process.env.WATCHDOG_ENABLED === 'yes') {
    const endpoint = new URL(await credential('heartbeat-url'))
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw Error('heartbeat')
    const response = await fetch(endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slot: Math.floor(now / 300000), level }) })
    if (!response.ok) throw Error('heartbeat')
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(error => { console.error(error.message === 'ALARM_HANDMATIG_CONTROLEREN' ? error.message : 'MONITORCONTROLE_MISLUKT'); process.exitCode = 1 })
