import test from 'node:test'
import assert from 'node:assert/strict'
import { inspect, assess, cycle } from './monitor-pi.mjs'

test('a missed quarter, escalation and verified recovery retain one incident', async () => {
  const start = Date.UTC(2026,10,11,12)
  const source = { status:'COMPLETED', lastSuccessfulAt:new Date(start).toISOString(),
    counters:{claimed:12,sent:12,retry:0,failed:0}, ready:0, expiredLeases:0 }
  const request = async (url, options) => {
    assert.equal(new URL(url).pathname,'/api/maintenance/marketplace/status')
    assert.equal(options.method,'GET')
    assert.equal(options.redirect,'error')
    return Response.json(source)
  }
  const read = async now => assess(await inspect('fixture',now,request),now)
  assert.equal(await read(start),'OK')
  assert.equal(await read(start + 15*60000),'OK')
  const state = {level:'OK',pending:[]}, sent = []
  for (const minutes of [25,30,55,60,65]) {
    const now = start + minutes*60000
    if (minutes === 65) source.lastSuccessfulAt = new Date(now).toISOString()
    await cycle({state,now,level:await read(now),save:async()=>{},send:async e=>{sent.push(e);return 'fake'}})
  }
  assert.deepEqual(sent.map(e=>e.level),['WAARSCHUWING','KRITIEK','OK'])
  assert.equal(new Set(sent.map(e=>e.incident)).size,1)
  source.ready = 1
  assert.equal(await read(start + 65*60000),'VERWERKING_CONTROLEREN')
  source.status = 'FAILED'
  assert.equal(await read(start + 65*60000),'KRITIEK')
  source.counters.sent = 13
  await assert.rejects(inspect('fixture',start + 65*60000,request))
})
