import { describe, expect, it, vi } from 'vitest'
import { onboardKnowledgeSource, type KnowledgeOnboardingInput } from './knowledge-source-onboarding-service'

const base: KnowledgeOnboardingInput = {
  source: { code: 'PGS-6-2023', title: 'PGS 6:2023', publisher: 'PGS-beheerorganisatie', sourceType: 'PROFESSIONAL_GUIDANCE', sourceFormat: 'PDF', canonicalFamily: 'PGS', authorityStatus: 'AUTHORIZED_PUBLICATION', canonicalUrl: 'https://publicatiereeksgevaarlijkestoffen.nl/publicaties/online/pgs-6/2023', jurisdiction: 'NL', applicabilityScope: 'Seveso-inrichtingen', temporalStatus: 'CURRENT', sourceFamily: 'PGS', independenceGroup: 'PGS', isPrimarySource: false },
  version: { versionLabel: '2023-1.0', checksum: 'a'.repeat(64) },
  artifact: { type: 'BROWSER_RENDERED_SNAPSHOT', mediaType: 'application/pdf', locator: 'local-sources/pgs/PGS 6.pdf', checksum: 'a'.repeat(64), retrievedAt: new Date('2026-08-16T00:00:00Z') },
  scopes: [{ jurisdiction: 'NL', scopeCode: 'SEVESO', effect: 'CONDITIONAL', rationale: 'Alleen toepassen binnen de expliciete Seveso-scope.' }],
}

describe('multi-source onboarding', () => {
  it('staat uitsluitend NL / SEVESO / CONDITIONAL toe voor PGS', async () => {
    const allowedDatabase = { $transaction: vi.fn().mockResolvedValue({ created: true }) }
    await expect(onboardKnowledgeSource(base, allowedDatabase as never)).resolves.toEqual({ created: true })
    expect(allowedDatabase.$transaction).toHaveBeenCalledOnce()
  })

  it.each([
    ['bronjurisdictie US', { source: { ...base.source, jurisdiction: 'US' } }],
    ['applicability-jurisdictie US', { scopes: [{ ...base.scopes[0], jurisdiction: 'US' }] }],
    ['lege applicability-jurisdictie', { scopes: [{ ...base.scopes[0], jurisdiction: ' ' }] }],
    ['algemene scope', { scopes: [{ ...base.scopes[0], scopeCode: 'GENERAL' }] }],
    ['generiek effect', { scopes: [{ ...base.scopes[0], effect: 'APPLIES' as const }] }],
    ['geldige plus generieke scope', { scopes: [base.scopes[0], { ...base.scopes[0], scopeCode: 'GENERAL', effect: 'APPLIES' as const }] }],
    ['ontbrekende applicability', { scopes: [] }],
    ['lege bronjurisdictie', { source: { ...base.source, jurisdiction: ' ' } }],
  ])('weigert PGS met %s vóór databasetoegang', async (_label, change) => {
    const database = { $transaction: vi.fn() }
    const candidate = { ...base, ...change } as KnowledgeOnboardingInput
    await expect(onboardKnowledgeSource(candidate, database as never)).rejects.toMatchObject({ code: expect.stringMatching(/^(PGS_SCOPE_REQUIRED|SOURCE_SCOPE_REQUIRED)$/u) })
    expect(database.$transaction).not.toHaveBeenCalled()
  })

  it('weigert een niet-HTTPS canonieke bron en checksumverschil', async () => {
    const database = { $transaction: vi.fn() }
    await expect(onboardKnowledgeSource({ ...base, source: { ...base.source, canonicalUrl: 'http://example.invalid' } }, database as never)).rejects.toMatchObject({ code: 'CANONICAL_URL_INVALID' })
    await expect(onboardKnowledgeSource({ ...base, artifact: { ...base.artifact, checksum: 'b'.repeat(64) } }, database as never)).rejects.toMatchObject({ code: 'ARTIFACT_CHECKSUM_INVALID' })
  })
})
