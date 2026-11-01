import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs'
import { isAbsolute, dirname, resolve, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const minute = 60_000
const repo = 'WorkMatchr/platform'
const workflow = 'marketplace-notifications.yml'
const stepName = 'Trigger secured marketplace maintenance'
const countKeys = ['metadataDueSoon', 'metadataOverdue', 'countersDueSoon', 'countersOverdue', 'contentOverdue',
  'reviewRequired', 'triageDue', 'escalationDue', 'decisionDue']
const codes = ['SCHEDULER', 'SCHEDULER_UNVERIFIED', 'CONTACT_HEALTH_UNVERIFIED',
  'CONTACT_METADATA', 'CONTACT_COUNTERS', 'CONTACT_CONTENT', 'CONTACT_RECONCILIATION']
const levels = ['warning', 'critical']
const timestamp = value => typeof value === 'string' ? Date.parse(value) : NaN

export function schedulerEvidence(runs, jobsByRun, now) {
  if (!Array.isArray(runs)) throw new Error('MONITOR_DATA_INVALID')
  const eligible = runs.filter(r => r.head_branch === 'main' && r.event === 'schedule'
    && r.path === `.github/workflows/${workflow}` && Number.isSafeInteger(r.id)
    && Number.isFinite(timestamp(r.created_at)) && timestamp(r.created_at) <= now)
  const lastRun = Math.max(0, ...eligible.map(r => timestamp(r.created_at))) || null
  let lastSuccess = null
  for (const r of eligible) {
    const jobs = jobsByRun[r.id] ?? []
    for (const job of jobs) {
      // A green workflow with a skipped dispatch is not a maintenance heartbeat.
      if (job.name !== 'dispatch' || job.status !== 'completed' || job.conclusion !== 'success') continue
      const step = job.steps?.find(s => s.name === stepName && s.conclusion === 'success')
      const completed = timestamp(step?.completed_at)
      if (completed >= timestamp(r.created_at) && completed <= now) lastSuccess = Math.max(lastSuccess ?? 0, completed)
    }
  }
  return { lastRun, lastSuccess }
}

export function evaluateContactOperations({ scheduler, health, now = Date.now() }) {
  const alarms = {}
  if (!scheduler) alarms.SCHEDULER_UNVERIFIED = 'critical'
  else {
    const age = time => time === null ? Infinity : now - time
    if (age(scheduler.lastRun) >= 30 * minute || age(scheduler.lastSuccess) >= 45 * minute) {
      alarms.SCHEDULER = Math.max(age(scheduler.lastRun), age(scheduler.lastSuccess)) >= 60 * minute ? 'critical' : 'warning'
    }
  }
  const checked = timestamp(health?.checkedAt)
  const valid = health?.version === 1 && typeof health.retentionEnabled === 'boolean'
    && checked <= now && now - checked <= 5 * minute
    && countKeys.every(k => Number.isSafeInteger(health[k]) && health[k] >= 0)
    && health.metadataOverdue <= health.metadataDueSoon && health.countersOverdue <= health.countersDueSoon
    && health.decisionDue <= health.escalationDue && health.escalationDue <= health.triageDue && health.triageDue <= health.reviewRequired
  if (!valid) alarms.CONTACT_HEALTH_UNVERIFIED = 'critical'
  else {
    for (const [code, soon, overdue] of [['CONTACT_METADATA', 'metadataDueSoon', 'metadataOverdue'], ['CONTACT_COUNTERS', 'countersDueSoon', 'countersOverdue']]) {
      if (health[soon]) alarms[code] = health[overdue] ? 'critical' : 'warning'
    }
    if (health.contentOverdue) alarms.CONTACT_CONTENT = 'critical'
    // One incident family, no simultaneous waiting/triage/escalation/day-7 alerts.
    if (health.reviewRequired) alarms.CONTACT_RECONCILIATION = health.decisionDue ? 'decision_due'
      : health.escalationDue ? 'escalation_due' : health.triageDue ? 'triage_due' : 'waiting'
  }
  return alarms
}

export function alarmTransitions(previous, current) {
  return codes.filter(code => previous[code] !== current[code]).map(code => ({ code,
    transition: !current[code] ? 'resolved' : !previous[code] ? 'opened' : 'changed',
    level: current[code] ?? 'resolved' }))
}

export async function observe({ loadScheduler, readHealth, previous = {}, now }) {
  // Missing scheduler must not prevent an independent contact backlog check, or vice versa.
  const results = await Promise.allSettled([Promise.resolve().then(loadScheduler), Promise.resolve().then(readHealth)])
  const alarms = evaluateContactOperations({ now: now ?? Date.now(),
    scheduler: results[0].status === 'fulfilled' ? results[0].value : null,
    health: results[1].status === 'fulfilled' ? results[1].value : null })
  // Failed observation is not evidence of recovery of earlier incidents.
  if (alarms.SCHEDULER_UNVERIFIED && previous.SCHEDULER) alarms.SCHEDULER = previous.SCHEDULER
  if (alarms.CONTACT_HEALTH_UNVERIFIED) for (const code of codes.filter(c => c.startsWith('CONTACT_') && c !== 'CONTACT_HEALTH_UNVERIFIED')) if (previous[code]) alarms[code] = previous[code]
  return { alarms, transitions: alarmTransitions(previous, alarms) }
}

export async function loadGithubScheduler(now = Date.now(), api = path => JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15_000 }))) {
  const data = api(`repos/${repo}/actions/workflows/${workflow}/runs?branch=main&event=schedule&per_page=30`)
  const jobs = {}
  let inspected = 0
  for (const run of data.workflow_runs ?? []) {
    // Beyond the critical horizon, exact older success adds no useful health evidence.
    if (timestamp(run.updated_at) < now - 60 * minute) continue
    if (run.status === 'completed' && run.conclusion === 'success') {
      if (inspected++ === 5) break
      jobs[run.id] = api(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`).jobs
      if (schedulerEvidence([run], jobs, now).lastSuccess) break
    }
  }
  return schedulerEvidence(data.workflow_runs, jobs, now)
}

export async function fetchContactHealth(secret, fetchImpl = fetch) {
  if (!secret || secret.length < 32 || secret.trim() !== secret || /[\r\n]/.test(secret)) throw new Error('MONITOR_AUTH_MISSING')
  const response = await fetchImpl('https://www.workmatchr.nl/api/maintenance/contact-health', {
    method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15_000), cache: 'no-store',
    headers: { Authorization: `Bearer ${secret}` },
  })
  if (response.status !== 200) throw new Error('MONITOR_HEALTH_UNAVAILABLE')
  return response.json()
}

function readState(file) {
  try {
    const state = JSON.parse(readFileSync(file, 'utf8'))
    if (state.version !== 1 || !state.alarms || !Number.isFinite(timestamp(state.checkedAt))
      || Object.entries(state.alarms).some(([k, v]) => !codes.includes(k)
        || !(k === 'CONTACT_RECONCILIATION' ? ['waiting', 'triage_due', 'escalation_due', 'decision_due'] : levels).includes(v))) throw new Error('INVALID_STATE')
    return state.alarms
  } catch (error) { if (error.code === 'ENOENT') return {}; throw error }
}

/** Operator adapter only: no scheduled task, notification channel or production configuration is created. */
export async function runMonitor({ stateFile, secret, log = console.log, error = console.error,
  loadScheduler = loadGithubScheduler, readHealth = () => fetchContactHealth(secret), now } = {}) {
  let lock
  try {
    if (!stateFile || !isAbsolute(stateFile)) throw new Error('STATE_PATH_REQUIRED')
    // Refuse state inside this checkout. Operator also verifies private storage/ACLs.
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
    const rel = relative(root, resolve(stateFile))
    if (!rel.startsWith('..') && !isAbsolute(rel)) throw new Error('STATE_OUTSIDE_REPOSITORY_REQUIRED')
    lock = openSync(`${stateFile}.lock`, 'wx', 0o600)
    const previous = readState(stateFile)
    const result = await observe({ loadScheduler, readHealth, previous, now })
    // Commit only aggregate incident state. No IDs, source responses, keys or hostnames.
    writeFileSync(`${stateFile}.next`, JSON.stringify({ version: 1, checkedAt: new Date(now ?? Date.now()).toISOString(), alarms: result.alarms }), { mode: 0o600 })
    for (const transition of result.transitions) log(JSON.stringify(transition))
    renameSync(`${stateFile}.next`, stateFile)
    return Object.keys(result.alarms).length ? 1 : 0
  } catch {
    error('CONTACT_MONITOR_UNAVAILABLE')
    return 2
  } finally {
    if (lock !== undefined) { closeSync(lock); unlinkSync(`${stateFile}.lock`) }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runMonitor({ stateFile: process.env.CONTACT_MONITOR_STATE_FILE, secret: process.env.CRON_SECRET })
}
