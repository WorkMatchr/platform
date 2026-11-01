import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { alarmTransitions, evaluateContactOperations, fetchContactHealth, loadGithubScheduler, observe, runMonitor, schedulerEvidence } from './monitor.mjs'

const now = Date.parse('2026-11-01T12:00:00Z'), minute = 60_000
const health = (extra = {}) => ({ version: 1, checkedAt: new Date(now).toISOString(), retentionEnabled: false,
  metadataDueSoon: 0, metadataOverdue: 0, countersDueSoon: 0, countersOverdue: 0, contentOverdue: 0,
  reviewRequired: 0, triageDue: 0, escalationDue: 0, decisionDue: 0, ...extra })
const scheduler = { lastRun: now - 10 * minute, lastSuccess: now - 9 * minute }
const assess = (h = health(), s = scheduler) => evaluateContactOperations({ health: h, scheduler: s, now })

test('missing and stale runs have separate exact warning/critical boundaries', () => {
  assert.deepEqual(assess(), {})
  assert.deepEqual(assess(health(), { lastRun: now - 30 * minute, lastSuccess: now - 45 * minute }), { SCHEDULER: 'warning' })
  assert.deepEqual(assess(health(), { lastRun: now - 60 * minute, lastSuccess: now - 60 * minute }), { SCHEDULER: 'critical' })
  assert.equal(assess(health(), { lastRun: now, lastSuccess: null }).SCHEDULER, 'critical')
})
test('skipped, manual and non-main workflow successes cannot prove scheduled maintenance', () => {
  const run = { id: 1, head_branch: 'main', event: 'schedule', path: '.github/workflows/marketplace-notifications.yml', created_at: new Date(now - minute).toISOString() }
  const job = { name: 'dispatch', status: 'completed', conclusion: 'success', steps: [{ name: 'Trigger secured marketplace maintenance', conclusion: 'success', completed_at: new Date(now).toISOString() }] }
  assert.equal(schedulerEvidence([run], { 1: [job] }, now).lastSuccess, now)
  assert.equal(schedulerEvidence([run], { 1: [{ ...job, conclusion: 'skipped' }] }, now).lastSuccess, null)
  assert.equal(schedulerEvidence([{ ...run, event: 'workflow_dispatch' }, { ...run, head_branch: 'preview' }], { 1: [job] }, now).lastRun, null)
  assert.equal(schedulerEvidence([run], { 1: [{ ...job, steps: [] }] }, now).lastSuccess, null)
})
test('API adapter only reads fixed run/job metadata and never triggers a workflow', async () => {
  const paths = []
  const evidence = await loadGithubScheduler(now, path => { paths.push(path); return { workflow_runs: [] } })
  assert.equal(evidence.lastSuccess, null)
  assert.equal(paths.length, 1); assert.match(paths[0], /workflows\/marketplace-notifications.yml\/runs\?branch=main&event=schedule/)
})
test('read-only transport is authenticated, fixed-host, no-store and rejects redirects/failures', async () => {
  const secret = 'synthetic-monitor-auth-at-least-thirty-two-characters'
  assert.deepEqual(await fetchContactHealth(secret, async (url, options) => {
    assert.equal(url, 'https://www.workmatchr.nl/api/maintenance/contact-health')
    assert.equal(options.method, 'GET'); assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store')
    assert.equal(options.headers.Authorization, `Bearer ${secret}`)
    return { status: 200, json: async () => health() }
  }), health())
  await assert.rejects(fetchContactHealth('', async () => { assert.fail('must not call') }))
  await assert.rejects(fetchContactHealth(secret, async () => ({ status: 503 })))
})
test('retention prewarnings and breaches remain visible when retention/mail are disabled', () => {
  assert.equal(assess(health({ metadataDueSoon: 1 })).CONTACT_METADATA, 'warning')
  assert.equal(assess(health({ metadataDueSoon: 1, metadataOverdue: 1 })).CONTACT_METADATA, 'critical')
  assert.equal(assess(health({ countersDueSoon: 2 })).CONTACT_COUNTERS, 'warning')
  assert.equal(assess(health({ countersDueSoon: 2, countersOverdue: 1 })).CONTACT_COUNTERS, 'critical')
  assert.equal(assess(health({ contentOverdue: 1 })).CONTACT_CONTENT, 'critical')
})
test('unknown provider acceptance escalates one stable incident without retry or duplicate alerts', () => {
  let previous = {}
  for (const [extra, level] of [[{}, 'waiting'], [{ triageDue: 1 }, 'triage_due'], [{ triageDue: 1, escalationDue: 1 }, 'escalation_due'], [{ triageDue: 1, escalationDue: 1, decisionDue: 1 }, 'decision_due']]) {
    const current = assess(health({ reviewRequired: 1, ...extra }))
    assert.deepEqual(Object.keys(current), ['CONTACT_RECONCILIATION'])
    assert.equal(current.CONTACT_RECONCILIATION, level)
    assert.equal(alarmTransitions(previous, current).length, 1)
    assert.equal(alarmTransitions(current, current).length, 0)
    previous = current
  }
})
test('malformed/stale/future health never means healthy', () => {
  for (const extra of [{ version: 2 }, { decisionDue: 1 }, { metadataOverdue: 1 }, { countersDueSoon: -1 },
    { checkedAt: new Date(now - 5 * minute - 1).toISOString() }, { checkedAt: new Date(now + 1).toISOString() }]) {
    assert.equal(assess(health(extra)).CONTACT_HEALTH_UNVERIFIED, 'critical')
  }
})
test('scheduler outage does not suppress independent backlog monitoring; failure never resolves old alerts', async () => {
  const previous = { SCHEDULER: 'critical', CONTACT_METADATA: 'critical' }
  const result = await observe({ now, previous, loadScheduler: async () => { throw new Error('secret') }, readHealth: async () => { throw new Error('private@example.invalid') } })
  assert.equal(result.alarms.CONTACT_METADATA, 'critical'); assert.equal(result.alarms.SCHEDULER, 'critical')
  assert.ok(result.transitions.every(t => t.transition !== 'resolved'))
  const independent = await observe({ now, loadScheduler: async () => { throw new Error() }, readHealth: async () => health({ countersDueSoon: 1, countersOverdue: 1 }) })
  assert.equal(independent.alarms.CONTACT_COUNTERS, 'critical')
})
test('catchup resolves scheduler only; unresolved provider/retention case stays open', async () => {
  const previous = { SCHEDULER: 'critical', CONTACT_RECONCILIATION: 'waiting' }
  const r = await observe({ now, previous, loadScheduler: async () => scheduler, readHealth: async () => health({ reviewRequired: 1 }) })
  assert.equal(r.alarms.CONTACT_RECONCILIATION, 'waiting')
  assert.deepEqual(r.transitions.map(t => t.code), ['SCHEDULER'])
  assert.ok(r.transitions.every(t => t.transition === 'resolved'))
})
test('persistent dedup emits once, escalates, recovers; state/log never stores payload or credentials', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'contact-monitor-synthetic-')), stateFile = join(dir, 'state.json'), logs = []
  try {
    let value = health({ reviewRequired: 1, private: 'private@example.invalid' })
    const options = { stateFile, now, log: line => logs.push(line), loadScheduler: async () => scheduler, readHealth: async () => value }
    assert.equal(await runMonitor(options), 1); assert.equal(await runMonitor(options), 1)
    assert.equal(logs.length, 1)
    value = health({ reviewRequired: 1, triageDue: 1 }); await runMonitor(options); assert.equal(logs.length, 2)
    value = health(); assert.equal(await runMonitor(options), 0); assert.equal(logs.length, 3)
    assert.equal(JSON.parse(logs[2]).transition, 'resolved')
    assert.doesNotMatch(readFileSync(stateFile, 'utf8') + logs.join(''), /private|example.invalid|Bearer/)
    writeFileSync(stateFile, 'invalid')
    const errors = []; assert.equal(await runMonitor({ ...options, error: x => errors.push(x) }), 2)
    assert.deepEqual(errors, ['CONTACT_MONITOR_UNAVAILABLE'])
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
