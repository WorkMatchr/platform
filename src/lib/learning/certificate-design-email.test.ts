import { afterEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ db: null as unknown, pdf: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => state.db }))
vi.mock('./learning-certificate-pdf', () => ({ buildLearningCertificatePdf: state.pdf, learningCertificateFilename: () => 'synthetic.pdf' }))
import { deliverLearningCertificateEmails } from './learning-certificate-email-worker'
afterEach(() => vi.unstubAllEnvs())
it('uses the immutable design and course version for the initial certificate attachment', async () => {
  vi.stubEnv('LEARNING_RUNTIME_ENABLED', 'true')
  state.pdf.mockResolvedValue(new Uint8Array(Buffer.from('%PDF-synthetic')))
  const now = new Date('2026-11-04T12:00:00Z')
  const certificate = { certificateNumber: 'DEMO-000001', courseTitle: 'Synthetische opleiding', firstName: 'Test', lastName: 'Cursist', issuedAt: now, templateVersion: 'ACADEMY-DESIGN-1', courseVersion: 3, designSnapshot: { checksum: 'synthetic', definition: {} }, user: { email: 'student@example.invalid', emailVerified: true, status: 'ACTIVE' } }
  const findFirst = vi.fn().mockResolvedValue(certificate)
  state.db = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: 'synthetic-job' }]),
    notificationOutbox: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'synthetic-job', templateKey: 'LEARNING_CERTIFICATE_ISSUED', recipientUserId: 'synthetic-user', payload: { certificateId: 'synthetic-certificate' }, attemptCount: 1, firstAttemptAt: now, idempotencyKey: 'synthetic-issue-once', deliveryFingerprint: null }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    learningCertificate: { findFirst },
  }
  const send = vi.fn().mockResolvedValue({ accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: 'synthetic-only' })
  expect(await deliverLearningCertificateEmails({ limit: 1, now: () => now, send })).toMatchObject({ sent: 1, failed: 0 })
  expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ courseVersion: true, designSnapshot: true }) }))
  expect(state.pdf).toHaveBeenCalledWith(expect.objectContaining({ courseVersion: 3, designSnapshot: certificate.designSnapshot, templateVersion: 'ACADEMY-DESIGN-1' }))
  expect(send).toHaveBeenCalledTimes(1)
  expect(send.mock.calls[0][0].idempotencyKey).toBe('synthetic-issue-once')
})
