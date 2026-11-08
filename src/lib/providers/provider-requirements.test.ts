import { describe, expect, it, vi } from 'vitest'
import { requireProfessionalLiability } from './provider-requirements'

const at = new Date('2026-07-14T12:00:00Z')
const until = new Date('2026-08-14T12:00:00Z')
const window = { reviewerUserId: 'reviewer', dossierCandidateId: 'candidate', validUntil: until }
const rule = { insuranceTypeTerm: { code: 'PROFESSIONAL_LIABILITY' }, minimumVerification: 'VERIFIED',
  minimumCoverageCents: BigInt(100), coverageGeography: 'NL' }
const policy = { insuranceTypeTerm: rule.insuranceTypeTerm, effectiveFrom: at, expiresAt: until,
  coverageAmountCents: BigInt(100), coverageGeography: 'NL', verificationReviews: [{ ...window, outcome: 'VERIFIED', resultingLevel: 'VERIFIED' }],
  evidenceRevision: { version: 1, scanDecision: { scanStatus: 'CLEAN' }, evidenceDocument: { version: 1, providerProfileId: 'provider', status: 'AVAILABLE' } } }

function assess(revisions: unknown[], configured = true) {
  const tx = { providerInsuranceRequirementConfig: { findFirst: vi.fn().mockResolvedValue(configured ? { requirements: [rule] } : null) },
    providerInsurance: { findMany: vi.fn().mockResolvedValue(revisions.map(revision => ({ revisions: [revision] }))) } }
  return requireProfessionalLiability(tx as never, 'provider', at, window)
}

describe('dienstspecifieke beroepsaansprakelijkheid', () => {
  it('weigert een ontbrekend dekkingsbeleid', async () => {
    await expect(assess([], false)).rejects.toMatchObject({ code: 'INSURANCE_REQUIREMENTS_NOT_CONFIGURED' })
  })
  it.each([ { policies: [] }, { policies: [{ ...policy, coverageAmountCents: BigInt(99) }] }, { policies: [{ ...policy, expiresAt: at }] },
    { policies: [{ ...policy, evidenceRevision: { ...policy.evidenceRevision, scanDecision: null } }] },
    { policies: [{ ...policy, verificationReviews: [] }] }])('weigert onvoldoende onderbouwing (%#)', async ({ policies }) => {
    await expect(assess(policies)).rejects.toMatchObject({ code: 'SERVICE_INSURANCE_REQUIRED' })
  })
  it('accepteert een geldige gecontroleerde polis voor de hele besluitperiode', async () => {
    await expect(assess([policy])).resolves.toBeUndefined()
  })
})
