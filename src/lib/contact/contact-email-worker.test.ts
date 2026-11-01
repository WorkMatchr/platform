import { randomBytes } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AuthEmailDeliveryResult } from '@/lib/email'
import { AuthEmailDeliveryError } from '@/lib/email'

vi.mock('server-only', () => ({}))
const cleanup = vi.hoisted(() => vi.fn())
vi.mock('./contact-retention', () => ({ cleanContactRetention: cleanup }))
const db = vi.hoisted(() => ({ $executeRaw: vi.fn(), $queryRaw: vi.fn(), notificationOutbox: { findUniqueOrThrow: vi.fn(), updateMany: vi.fn() } }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => db }))
import { sealContact } from './contact-envelope'
import { deliverContactEmails } from './contact-email-worker'

const accepted: AuthEmailDeliveryResult = { accepted: true, status: 'ACCEPTED', transport: 'RESEND', messageId: 'synthetic-provider-id' }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-31T12:00:00Z')); vi.resetAllMocks()
  cleanup.mockResolvedValue({ redacted: 0, metadataDeleted: 0, countersDeleted: 0, pending: false, reviewRequired: 0 })
  const key = randomBytes(32)
  vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'true'); vi.stubEnv('CONTACT_MESSAGE_ENCRYPTION_KEY', key.toString('hex'))
  vi.stubEnv('CONTACT_EMAIL_TO', 'contact@example.invalid')
  db.$executeRaw.mockResolvedValue(0); db.$queryRaw.mockResolvedValueOnce([{ id: 'synthetic-job' }]).mockResolvedValue([])
  db.notificationOutbox.findUniqueOrThrow.mockResolvedValue({ id: 'synthetic-job', idempotencyKey: 'contact:synthetic', attemptCount: 1, firstAttemptAt: new Date(), deliveryFingerprint: null,
    payload: sealContact({ name: 'Test', email: 'sender@example.invalid', subject: 'GENERAL', message: 'Synthetische vraag.', recipient: 'contact@example.invalid' }, key, 'contact:synthetic') })
  db.notificationOutbox.updateMany.mockResolvedValue({ count: 1 })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

it('begrenst een vastlopende provider tot acht seconden en blokkeert herverzending tot reconciliatie', async () => {
  const send = vi.fn(() => new Promise<AuthEmailDeliveryResult>(() => {}))
  let report: Awaited<ReturnType<typeof deliverContactEmails>> | undefined
  const work = deliverContactEmails({ send }).then(value => { report = value })
  await vi.advanceTimersByTimeAsync(7_999)
  expect(report).toBeUndefined()
  await vi.advanceTimersByTimeAsync(1)
  expect(report).toMatchObject({ claimed: 1, retry: 0, failed: 1, sent: 0 })
  await work
  expect(db.notificationOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', lastErrorCode: 'DELIVERY_RECONCILIATION_REQUIRED' }) }))
  expect(send).toHaveBeenCalledOnce()
})

it('een late provideracceptatie na timeout overschrijft de reconciliatieblokkade niet', async () => {
  let resolve!: (result: AuthEmailDeliveryResult) => void
  const work = deliverContactEmails({ send: () => new Promise(value => { resolve = value }) })
  await vi.advanceTimersByTimeAsync(8_000)
  expect(db.notificationOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', lastErrorCode: 'DELIVERY_RECONCILIATION_REQUIRED' }) }))
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


it('handhaaft retentie met gesloten verzendgate en ontbrekende sleutel, zonder claim of providercall', async () => {
  vi.stubEnv('CONTACT_OUTBOX_ENABLED', '')
  vi.stubEnv('CONTACT_MESSAGE_ENCRYPTION_KEY', '')
  cleanup.mockResolvedValue({ redacted: 2, metadataDeleted: 1, countersDeleted: 3, pending: false, reviewRequired: 0 })
  const send = vi.fn()
  expect(await deliverContactEmails({ send })).toMatchObject({ claimed: 0, sent: 0, retry: 0, failed: 0, redacted: 2, retention: { metadataDeleted: 1, countersDeleted: 3 } })
  expect(cleanup).toHaveBeenCalledOnce()
  expect(db.$queryRaw).not.toHaveBeenCalled()
  expect(db.notificationOutbox.updateMany).not.toHaveBeenCalled()
  expect(send).not.toHaveBeenCalled()
})

it('ruimt verlopen inhoud op voordat een ongeldige verzendconfiguratie gesloten faalt', async () => {
  vi.stubEnv('CONTACT_MESSAGE_ENCRYPTION_KEY', '')
  const send = vi.fn()
  await expect(deliverContactEmails({ send })).rejects.toThrow('CONTACT_CONFIGURATION_REQUIRED')
  expect(cleanup).toHaveBeenCalledOnce()
  expect(db.$queryRaw).not.toHaveBeenCalled()
  expect(send).not.toHaveBeenCalled()
})

it.each([500, 503])('blokkeert onzekere providerstatus %s zonder automatische retry', async code => {
  const report = await deliverContactEmails({ send: async () => { throw new AuthEmailDeliveryError('EMAIL_PROVIDER_REJECTED', 'synthetic', code) } })
  expect(report).toMatchObject({ failed: 1, retry: 0 })
  expect(db.notificationOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastErrorCode: 'DELIVERY_RECONCILIATION_REQUIRED' }) }))
})

it('behoudt begrensde backoff voor aantoonbare rate-limitafwijzing', async () => {
  expect(await deliverContactEmails({ send: async () => { throw new AuthEmailDeliveryError('EMAIL_PROVIDER_REJECTED', 'synthetic', 429) } })).toMatchObject({ retry: 1, failed: 0 })
  expect(db.notificationOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', lastErrorCode: 'EMAIL_RATE_LIMITED' }) }))
})

it.each(['PENDING', 'PROCESSING'])('reconcilieert oude onzekere %s zonder providerverzoek', async previousStatus => {
  db.$queryRaw.mockReset().mockResolvedValueOnce([{ id: 'synthetic-job', previousStatus }]).mockResolvedValue([])
  db.notificationOutbox.findUniqueOrThrow.mockResolvedValue({ id: 'synthetic-job', attemptCount: 2, firstAttemptAt: new Date(),
    deliveryFingerprint: 'a'.repeat(64), lastErrorCode: previousStatus === 'PENDING' ? 'EMAIL_PROVIDER_UNAVAILABLE' : null, payload: { digest: 'synthetic' } })
  const send = vi.fn()
  expect(await deliverContactEmails({ send })).toMatchObject({ failed: 1, retry: 0 })
  expect(send).not.toHaveBeenCalled()
})

it('een cleanupfout verhindert verzending en lekt geen inhoud via het workerresultaat', async () => {
  cleanup.mockRejectedValue(new Error('synthetic failure'))
  const send = vi.fn()
  await expect(deliverContactEmails({ send })).rejects.toThrow('synthetic failure')
  expect(send).not.toHaveBeenCalled(); expect(db.$queryRaw).not.toHaveBeenCalled()
})
