import { afterEach, expect, it, vi } from 'vitest'
import { isLearningRuntimeEnabled } from './learning-runtime-policy'
import { deliverLearningCertificateEmails } from './learning-certificate-email-worker'
import { deliverLearningRetentionEmails } from './learning-retention-email-worker'
import CertificatePage from '@/app/certificaat/[code]/page'

const database = vi.hoisted(() => vi.fn(() => { throw new Error('Unexpected database access') }))
vi.mock('@/lib/prisma', () => ({ getPrisma: database }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND') } }))
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

it.each([undefined, '', 'false', 'TRUE', '1'])('weigert ongeldige of ontbrekende vrijgave %s zonder database/mail', async value => {
  vi.stubEnv('LEARNING_RUNTIME_ENABLED', value)
  const send = vi.fn()
  expect(isLearningRuntimeEnabled()).toBe(false)
  const empty = { claimed: 0, sent: 0, retry: 0, failed: 0 }
  expect(await deliverLearningCertificateEmails({ send })).toEqual(empty)
  expect(await deliverLearningRetentionEmails({ send })).toEqual(empty)
  await expect(CertificatePage({ params: Promise.resolve({ code: 'WM-RIE-2026-0123456789ABCDEF01234567' }) })).rejects.toThrow('NOT_FOUND')
  expect(database).not.toHaveBeenCalled()
  expect(send).not.toHaveBeenCalled()
})

it('vereist een expliciete servervrijgave; geeft op zichzelf geen gebruikersrechten', () => {
  vi.stubEnv('LEARNING_RUNTIME_ENABLED', 'true')
  expect(isLearningRuntimeEnabled()).toBe(true)
  expect(database).not.toHaveBeenCalled()
})
