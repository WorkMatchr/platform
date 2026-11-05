import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '../../src/generated/prisma/client'
import type { ArboGuideViewer } from '../../src/lib/arbo-guides/arbo-guide-run-service'
import { f4PositiveAnswers } from '../../src/test-fixtures/compliance-f4'

export async function verifyF4Drafts(db: PrismaClient, actor: ArboGuideViewer, other: ArboGuideViewer) {
  const { saveF4Draft, listF4Drafts } = await import('../../src/lib/compliance/compliance-f4-drafts')
  const { POST } = await import('../../src/app/wijzers/compliance/v2/runs/route')
  const idempotencyKey = randomUUID()
  const input = { idempotencyKey, revision: null, answers: { HASEMPLOYEES: 'YES' } }
  const created = await Promise.all(Array.from({ length: 6 }, () => saveF4Draft(actor, input)))
  assert.equal(new Set(created.map(r => r.id)).size, 1)
  assert.ok(created.every(r => r.revision === 0))
  const race = await Promise.allSettled(['YES', 'NO'].map(RIE => saveF4Draft(actor, { ...input, revision: 0, answers: { ...input.answers, RIE } })))
  assert.equal(race.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal(race.filter(r => r.status === 'rejected').length, 1)
  assert.equal((await listF4Drafts(actor))[0].revision, 1)
  assert.equal((await listF4Drafts(other).catch(() => [] as unknown[])).length, 0)
  await assert.rejects(saveF4Draft(other, { ...input, revision: 1 }))
  const colleague = await db.user.create({ data: { email: `f4-colleague-${randomUUID()}@example.invalid`, accountType: 'CLIENT', status: 'ACTIVE', emailVerified: true, memberships: { create: { organizationId: actor.organizationId, role: 'ADMIN', status: 'ACTIVE' } } } })
  const colleagueActor = { userId: colleague.id, organizationId: actor.organizationId }
  assert.equal((await listF4Drafts(colleagueActor)).length, 0)
  await assert.rejects(saveF4Draft(colleagueActor, { ...input, revision: 1 }))
  await db.organizationMembership.update({ where: { userId: actor.userId }, data: { role: 'MEMBER' } })
  await assert.rejects(listF4Drafts(actor)); await assert.rejects(saveF4Draft(actor, input))
  await db.organizationMembership.update({ where: { userId: actor.userId }, data: { role: 'ADMIN' } })
  const saved = await saveF4Draft(actor, { ...input, revision: 1, answers: f4PositiveAnswers })
  assert.equal(saved.revision, 2)
  assert.equal((await saveF4Draft(actor, { ...input, revision: 1, answers: f4PositiveAnswers })).revision, 2, 'Lost save response is replayable')
  await db.organizationMembership.update({ where: { userId: actor.userId }, data: { status: 'SUSPENDED' } })
  await assert.rejects(listF4Drafts(actor))
  await db.organizationMembership.update({ where: { userId: actor.userId }, data: { status: 'ACTIVE' } })
  await assert.rejects(db.arboGuideRun.update({ where: { id: saved.id }, data: { organizationId: other.organizationId } }))
  await assert.rejects(db.arboGuideRun.update({ where: { id: saved.id }, data: { answersSnapshot: {} } }), 'Revision is mandatory in SQL')
  const completion = { idempotencyKey, startedAt: saved.startedAt, completedAt: new Date().toISOString(), answers: f4PositiveAnswers, draftRevision: saved.revision }
  const post = (body = completion) => POST(new Request('http://localhost/wijzers/compliance/v2/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))
  assert.equal((await post({ ...completion, draftRevision: 1 })).status, 409)
  assert.equal((await post({ ...completion, startedAt: new Date(Date.parse(saved.startedAt) - 1000).toISOString() })).status, 409, 'Draft start time is server-owned')
  assert.equal((await post()).status, 402, 'No paid entitlement')
  await (await import('./compliance-f4-payment-database')).fundF4Draft(db, actor, saved.id, 'FOLLOW_UP_SCAN')
  const responses = await Promise.all(Array.from({ length: 6 }, () => post()))
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 200, 200, 200, 200, 201])
  assert.equal((await listF4Drafts(actor)).length, 0)
  const completed = await db.arboGuideRun.findUniqueOrThrow({ where: { id: saved.id }, include: { results: true } })
  assert.equal(completed.results.length, 10)
  await assert.rejects(saveF4Draft(actor, { ...input, revision: 2 }))
  await assert.rejects(db.arboGuideRun.update({ where: { id: saved.id }, data: { answersSnapshot: {}, draftRevision: 3 } }))
  await assert.rejects(db.arboGuideRun.delete({ where: { id: saved.id } }))
  assert.deepEqual(await db.arboGuideRun.findUniqueOrThrow({ where: { id: saved.id }, include: { results: true } }), completed)
  console.log('F4 drafts PostgreSQL PASS: create replay 6/1; concurrent revisions 1/1; owner/admin/member, revoked rights, tenant; save replay; completion 6/1; SQL immutability.')
}
