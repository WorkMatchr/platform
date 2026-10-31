import { randomBytes } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AuthEmailDeliveryResult } from '@/lib/email'

vi.mock('server-only', () => ({}))
const db = vi.hoisted(() => ({ $executeRaw: vi.fn(), $queryRaw: vi.fn(), notificationOutbox: { findUniqueOrThrow: vi.fn(), updateMany: vi.fn() } }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => db }))
import { sealContact } from './contact-envelope'
import { deliverContactEmails } from './contact-email-worker'

const accepted: AuthEmailDeliveryResult = { accepted: true, status: 'ACCEPTED', transport: 'RESEND', messageId: 'synthetic-provider-id' }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-31T12:00:00Z')); vi.resetAllMocks()
  const key = randomBytes(32)
  vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'true'); vi.stubEnv('CONTACT_MESSAGE_ENCRYPTION_KEY', key.toString('hex'))
  vi.stubEnv('CONTACT_EMAIL_TO', 'contact@example.invalid')
  db.$executeRaw.mockResolvedValue(0); db.$queryRaw.mockResolvedValueOnce([{ id: 'synthetic-job' }]).mockResolvedValue([])
  db.notificationOutbox.findUniqueOrThrow.mockResolvedValue({ id: 'synthetic-job', idempotencyKey: 'contact:synthetic', attemptCount: 1, firstAttemptAt: new Date(), deliveryFingerprint: null,
    payload: sealContact({ name: 'Test', email: 'sender@example.invalid', subject: 'GENERAL', message: 'Synthetische vraag.', recipient: 'contact@example.invalid' }, key, 'contact:synthetic') })
  db.notificationOutbox.updateMany.mockResolvedValue({ count: 1 })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

it('begrenst een vastlopende provider tot acht seconden en bewaart de onzekere uitkomst voor retry', async () => {
  const send = vi.fn(() => new Promise<AuthEmailDeliveryResult>(() => {}))
  let report: Awaited<ReturnType<typeof deliverContactEmails>> | undefined
  const work = deliverContactEmails({ send }).then(value => { report = value })
  await vi.advanceTimersByTimeAsync(7_999)
  expect(report).toBeUndefined()
  await vi.advanceTimersByTimeAsync(1)
  expect(report).toMatchObject({ claimed: 1, retry: 1, sent: 0 })
  await work
  expect(db.notificationOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', lastErrorCode: 'EMAIL_PROVIDER_UNAVAILABLE', availableAt: new Date('2026-10-31T12:01:08Z') }) }))
  expect(send).toHaveBeenCalledOnce()
})

it('een late provideracceptatie na timeout overschrijft de retry-status niet', async () => {
  let resolve!: (result: AuthEmailDeliveryResult) => void
  const work = deliverContactEmails({ send: () => new Promise(value => { resolve = value }) })
  await vi.advanceTimersByTimeAsync(8_000)
  expect(db.notificationOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) }))
  await work
  const updates = db.notificationOutbox.updateMany.mock.calls.length
  resolve(accepted); await vi.advanceTimersByTimeAsync(0)
  expect(db.notificationOutbox.updateMany).toHaveBeenCalledTimes(updates)
})

it('ruimt de timer op na tijdige acceptatie zonder een tweede statusupdate', async () => {
  expect(await deliverContactEmails({ send: async () => accepted })).toMatchObject({ sent: 1, retry: 0 })
  expect(vi.getTimerCount()).toBe(0)
  const updates = db.notificationOutbox.updateMany.mock.calls.length
  await vi.advanceTimersByTimeAsync(60_000)
  expect(db.notificationOutbox.updateMany).toHaveBeenCalledTimes(updates)
})
