import { pathToFileURL } from 'node:url'

// Only a clock/HTTP adapter. Selection, leases and retries belong to the app worker.
export async function dispatch({ secret, fetchImpl = fetch }) {
  if (!secret || secret.trim() !== secret || /[\r\n]/.test(secret)) throw new Error('DISPATCH_CONFIG_INVALID')
  const response = await fetchImpl('https://www.workmatchr.nl/api/maintenance/marketplace', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(70_000),
    headers: { Authorization: `Bearer ${secret}` },
  })
  if (response.status !== 200) throw new Error('DISPATCH_HTTP_FAILED')
  const data = await response.json()
  const report = {}
  for (const key of ['claimed', 'sent', 'retry', 'failed']) {
    if (!Number.isInteger(data?.[key]) || data[key] < 0 || data[key] > 10) throw new Error('DISPATCH_RESPONSE_INVALID')
    report[key] = data[key]
  }
  if (report.sent + report.retry + report.failed > report.claimed) throw new Error('DISPATCH_RESPONSE_INVALID')
  if (data.contact !== undefined) {
    const contact = {}
    for (const key of ['claimed', 'sent', 'retry', 'failed']) {
      if (!Number.isInteger(data.contact?.[key]) || data.contact[key] < 0 || data.contact[key] > 5) throw new Error('DISPATCH_RESPONSE_INVALID')
      contact[key] = data.contact[key]
    }
    if (contact.sent + contact.retry + contact.failed > contact.claimed) throw new Error('DISPATCH_RESPONSE_INVALID')
    if (data.contact.retention !== undefined) {
      const retention = data.contact.retention
      if (typeof retention?.pending !== 'boolean' || !Number.isInteger(retention.reviewRequired) || retention.reviewRequired < 0) throw new Error('DISPATCH_RESPONSE_INVALID')
      if (typeof retention.enabled !== 'boolean') throw new Error('DISPATCH_RESPONSE_INVALID')
      for (const [key, max] of [['redacted', 100], ['metadataDeleted', 100], ['countersDeleted', 1000]]) {
        if (!Number.isInteger(retention[key]) || retention[key] < 0 || retention[key] > max) throw new Error('DISPATCH_RESPONSE_INVALID')
      }
      contact.retention = { enabled: retention.enabled, pending: retention.pending, reviewRequired: retention.reviewRequired,
        redacted: retention.redacted, metadataDeleted: retention.metadataDeleted, countersDeleted: retention.countersDeleted }
    }
    report.contact = contact
  }
  return report
}

// Drain bounded server batches, rather than leaving a backlog after just ten records.
// A safety/time limit leaves remaining records due for the next scheduled invocation.
export async function drain({ secret, fetchImpl = fetch, now = Date.now, maxBatches = 100 } = {}) {
  const deadline = now() + 8 * 60_000
  const total = { claimed: 0, sent: 0, retry: 0, failed: 0 }
  for (let batch = 0; batch < maxBatches && now() < deadline; batch++) {
    const report = await dispatch({ secret, fetchImpl })
    for (const key of ['claimed', 'sent', 'retry', 'failed']) total[key] += report[key]
    if (report.contact) {
      total.contact ??= { claimed: 0, sent: 0, retry: 0, failed: 0 }
      for (const key of ['claimed', 'sent', 'retry', 'failed']) total.contact[key] += report.contact[key]
      if (report.contact.retention) {
        const previous = total.contact.retention
        total.contact.retention = { ...report.contact.retention }
        for (const key of ['redacted', 'metadataDeleted', 'countersDeleted']) total.contact.retention[key] += previous?.[key] ?? 0
      }
    }
    if (report.claimed < 10 && (!report.contact || report.contact.claimed < 5) && !report.contact?.retention?.pending) return total
  }
  throw new Error('DISPATCH_BACKLOG_REMAINING')
}

export async function run({ secret, fetchImpl = fetch, log = console.log, error = console.error } = {}) {
  try {
    const report = await drain({ secret, fetchImpl })
    log(JSON.stringify(report))
    return report.failed || report.contact?.failed || report.contact?.retention?.reviewRequired ? 1 : 0
  } catch {
    // Never log credentials, arbitrary response bodies or raw transport errors.
    error('MARKETPLACE_DISPATCH_FAILED')
    return 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run({ secret: process.env.CRON_SECRET })
}
