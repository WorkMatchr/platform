import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dispatch, drain, run } from './dispatch.mjs'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

test('one authenticated, timeout-bounded POST; redirects forbidden; only counters returned', async () => {
  let calls = 0
  const result = await dispatch({ secret: 'synthetic-test-only', fetchImpl: async (url, options) => {
    calls++
    assert.equal(url, 'https://www.workmatchr.nl/api/maintenance/marketplace')
    assert.equal(options.method, 'POST')
    assert.equal(options.redirect, 'error')
    assert.ok(options.signal instanceof AbortSignal)
    assert.equal(options.headers.Authorization, 'Bearer synthetic-test-only')
    return { status: 200, json: async () => ({ claimed: 3, sent: 1, retry: 1, failed: 1, privateData: 'not returned' }) }
  } })
  assert.deepEqual(result, { claimed: 3, sent: 1, retry: 1, failed: 1 })
  assert.equal(calls, 1)
})

test('missing/malformed secret never makes an HTTP call', async () => {
  for (const secret of [undefined, '', ' padded ', 'a\nb']) {
    await assert.rejects(dispatch({ secret, fetchImpl: async () => assert.fail('Unexpected HTTP') }), /CONFIG_INVALID/)
  }
})

test('HTTP failures and redirects are not retried or parsed', async () => {
  for (const status of [301, 401, 429, 500]) {
    let calls = 0
    await assert.rejects(dispatch({ secret: 'synthetic', fetchImpl: async () => {
      calls++
      return { status, json: async () => assert.fail('Unexpected body read') }
    } }), /HTTP_FAILED/)
    assert.equal(calls, 1)
  }
})

test('malformed or inconsistent counters fail closed', async () => {
  for (const data of [null, {}, { claimed: 0, sent: 1, retry: 0, failed: 0 }, { claimed: 11, sent: 11, retry: 0, failed: 0 }]) {
    await assert.rejects(dispatch({ secret: 'synthetic', fetchImpl: async () => ({ status: 200, json: async () => data }) }), /RESPONSE_INVALID/)
  }
})

test('transport failure makes one attempt; next schedule handles catch-up', async () => {
  let calls = 0
  await assert.rejects(dispatch({ secret: 'synthetic', fetchImpl: async () => { calls++; throw new Error('simulated timeout') } }))
  assert.equal(calls, 1)
})

const response = data => ({ status: 200, json: async () => data })
test('zero due records completes without additional calls', async () => {
  let calls = 0
  assert.deepEqual(await drain({ secret: 'synthetic', fetchImpl: async () => { calls++; return response({ claimed: 0, sent: 0, retry: 0, failed: 0 }) } }), { claimed: 0, sent: 0, retry: 0, failed: 0 })
  assert.equal(calls, 1)
})
test('multiple due batches are drained, including missed-run backlog', async () => {
  const reports = [response({ claimed: 10, sent: 9, retry: 1, failed: 0 }), response({ claimed: 2, sent: 2, retry: 0, failed: 0 })]
  assert.deepEqual(await drain({ secret: 'synthetic', fetchImpl: async () => reports.shift() }), { claimed: 12, sent: 11, retry: 1, failed: 0 })
  assert.equal(reports.length, 0)
})
test('safety bound stops a continually full queue without unbounded calls', async () => {
  let calls = 0
  await assert.rejects(drain({ secret: 'synthetic', maxBatches: 2, fetchImpl: async () => { calls++; return response({ claimed: 10, sent: 10, retry: 0, failed: 0 }) } }), /BACKLOG_REMAINING/)
  assert.equal(calls, 2)
})
test('success logs only counters; provider/transport secrets never reach logs', async () => {
  const logs = []
  const secret = 'synthetic-must-not-be-logged'
  assert.equal(await run({ secret, log: x => logs.push(x), error: x => logs.push(x), fetchImpl: async () => response({ claimed: 0, sent: 0, retry: 0, failed: 0, secret }) }), 0)
  assert.equal(await run({ secret, log: x => logs.push(x), error: x => logs.push(x), fetchImpl: async () => { throw new Error(secret) } }), 1)
  assert.equal(logs.join('').includes(secret), false)
  assert.equal(logs[1], 'MARKETPLACE_DISPATCH_FAILED')
})
test('scheduled workflow uses 15 minutes, serialized runs and only endpoint authentication', () => {
  const yaml = createRequire(import.meta.url)('js-yaml')
  const workflow = yaml.load(readFileSync(new URL('../../.github/workflows/marketplace-notifications.yml', import.meta.url), 'utf8'))
  assert.deepEqual(workflow.on.schedule, [{ cron: '*/15 * * * *' }])
  assert.equal(workflow.concurrency['cancel-in-progress'], false)
  assert.deepEqual(workflow.permissions, { contents: 'read' })
  assert.equal(workflow.jobs.dispatch.if, "github.ref == 'refs/heads/main' && vars.MARKETPLACE_NOTIFICATIONS_ENABLED == 'true'")
  const commands = workflow.jobs.dispatch.steps.filter(step => step.run)
  assert.equal(commands.length, 1)
  assert.deepEqual(commands[0].env, { CRON_SECRET: '${{ secrets.CRON_SECRET }}' })
  assert.equal(commands[0].run, 'node ops/marketplace-notifications/dispatch.mjs')
})
