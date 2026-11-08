import { describe, expect, it, vi } from 'vitest'
import { assessProviderDossierCompletenessInTransaction, PROVIDER_COMPLETENESS_POLICY_VERSION } from './provider-dossier-completeness'

const completeState = {
  version: 7,
  organization: { provisioningEvents: [], name: 'Veilig Werken B.V.', chamberOfCommerceNumber: '12345678' },
  capabilities: [{ revisions: [{ serviceTermId: 'service', specialismTermId: null, deliveryModes: ['REMOTE'] }] }],
  sectorExperiences: [{ id: 'sector' }],
  workAreas: [{ id: 'area' }],
  professionals: [{ identityRevisions: [{ status: 'ACTIVE' }], qualifications: [{ id: 'qualification' }] }],
  organizationQualifications: [] as Array<{ id: string }>,
  insurances: [{ revisions: [{ expiresAt: new Date('2027-01-01'), evidenceRevision: { scanDecision: { scanStatus: 'CLEAN' } } }] }],
  evidenceDocuments: [{ revisions: [{ id: 'evidence' }] }],
  termAcceptances: [{ documentVersionId: 'term' }],
}

function transaction(overrides: Record<string, unknown> = {}, detectOverlap = false) {
  const state = { ...completeState, ...overrides }
  let activeQueries = 0
  let maximumConcurrentQueries = 0
  const query = <T>(value: T) => vi.fn(async () => {
    activeQueries += 1
    maximumConcurrentQueries = Math.max(maximumConcurrentQueries, activeQueries)
    if (detectOverlap) await new Promise<void>((resolve) => queueMicrotask(resolve))
    activeQueries -= 1
    return value
  })
  const capabilities = state.capabilities as Array<{ revisions: Array<{ serviceTermId: string | null; specialismTermId: string | null }> }>
  const professionals = state.professionals as Array<{ identityRevisions: Array<{ status: string }>; qualifications: Array<{ id: string }> }>
  const insurances = state.insurances as Array<{ revisions: Array<{ expiresAt: Date; evidenceRevision: { scanDecision: { scanStatus: string } | null } }> }>
  const evidenceDocuments = state.evidenceDocuments as Array<{ revisions: Array<{ id: string }> }>
  const client = {
    providerProfile: { findFirst: query({ version: state.version, organization: state.organization }) },
    providerCapabilityRevision: { findMany: query(capabilities.flatMap((item, index) => item.revisions.map((revision, revisionIndex) => ({ providerCapabilityId: `capability-${index}`, version: revisionIndex + 1, ...revision })))) },
    providerSectorExperience: { count: query((state.sectorExperiences as unknown[]).length) },
    providerWorkArea: { count: query((state.workAreas as unknown[]).length) },
    providerProfessionalIdentityRevision: { findMany: query(professionals.flatMap((item, index) => item.identityRevisions.map((revision, revisionIndex) => ({ professionalId: `professional-${index}`, version: revisionIndex + 1, ...revision })))) },
    providerProfessionalQualification: { count: query(professionals.reduce((total, item) => total + item.qualifications.length, 0)) },
    providerOrganizationQualification: { count: query((state.organizationQualifications as unknown[]).length) },
    providerInsuranceRevision: { findMany: query(insurances.flatMap((item, index) => item.revisions.map((revision, revisionIndex) => ({ insuranceId: `insurance-${index}`, version: revisionIndex + 1, expiresAt: revision.expiresAt, evidenceRevisionId: `evidence-${index}-${revisionIndex}` })))) },
    providerEvidenceScanDecision: { findMany: query(insurances.flatMap((item, index) => item.revisions.flatMap((revision, revisionIndex) => revision.evidenceRevision.scanDecision ? [{ evidenceRevisionId: `evidence-${index}-${revisionIndex}`, scanStatus: revision.evidenceRevision.scanDecision.scanStatus }] : []))) },
    providerEvidenceDocument: { count: query(evidenceDocuments.length) },
    providerEvidenceRevision: { count: query(evidenceDocuments.filter((item) => item.revisions.length > 0).length) },
    providerTermAcceptance: { findMany: query(state.termAcceptances) },
    providerTermDocumentVersion: { findMany: query([{ id: 'term' }]) },
    providerDossierSubmission: { findFirst: query(null) },
  }
  return { client, maximumConcurrentQueries: () => maximumConcurrentQueries }
}

describe('provider dossier completeness', () => {
  const empty = { capabilities: [], sectorExperiences: [], workAreas: [], professionals: [], insurances: [],
    organizationQualifications: [], evidenceDocuments: [], termAcceptances: [] }
  const enrolled = { ...completeState.organization, provisioningEvents: [{ id: 'cohort' }] }
  it.each([
    ['nieuw leeg', { ...empty, organization: { ...enrolled, name: '', chamberOfCommerceNumber: null } }, 0],
    ['nieuw gedeeltelijk', { ...empty, organization: enrolled }, 1],
    ['vier matchingonderdelen', { ...empty, organization: enrolled, capabilities: [{ revisions: [{ serviceTermId: 'service', deliveryModes: ['REMOTE'] }] }],
      sectorExperiences: [{}], workAreas: [{}] }, 4],
  ] as const)('%s geeft lege optionele onderdelen geen afronding', async (_, state, completed) => {
    const result = await assessProviderDossierCompletenessInTransaction(transaction(state).client as never, 'provider', new Date('2026-07-15'))
    expect(result).toMatchObject({ completed, required: 4, sections: { CAPACITY: 'NOT_APPLICABLE',
      PROFESSIONALS: 'OPTIONAL_EMPTY', QUALIFICATIONS: 'OPTIONAL_EMPTY', INSURANCE: 'OPTIONAL_EMPTY', EVIDENCE: 'OPTIONAL_EMPTY', DECLARATIONS: 'OPTIONAL_EMPTY' } })
  })
  it('onderscheidt een open bewijsstuk van een lege rubriek', async () => {
    const result = await assessProviderDossierCompletenessInTransaction(transaction({ ...empty, organization: enrolled,
      evidenceDocuments: [{ revisions: [] }] }).client as never, 'provider', new Date('2026-07-15'))
    expect(result.sections.EVIDENCE).toBe('OPTIONAL_OPEN')
  })

  it('meet uitsluitend volledigheid en maakt een compleet dossier indienbaar', async () => {
    const result = await assessProviderDossierCompletenessInTransaction(transaction().client as never, 'provider', new Date('2026-07-15'))
    expect(result).toMatchObject({ policyVersion: PROVIDER_COMPLETENESS_POLICY_VERSION, required: 4, completed: 4, percentage: 100, isSubmittable: true })
    expect(result.reasons).toEqual([])
    expect(result.sections).toMatchObject({ PROFESSIONALS: 'OPTIONAL_COMPLETE', QUALIFICATIONS: 'OPTIONAL_COMPLETE', DECLARATIONS: 'OPTIONAL_COMPLETE', CAPACITY: 'NOT_APPLICABLE' })
  })

  it.each([
    [null, 'specialism', ['REMOTE'], false],
    ['service', null, [], false],
    ['service', null, ['REMOTE'], true],
  ] as const)('controleert de dienst en leveringsvorm bij nieuwe aanmeldingen', async (serviceTermId, specialismTermId, deliveryModes, expected) => {
    const result = await assessProviderDossierCompletenessInTransaction(transaction({
      organization: { ...completeState.organization, provisioningEvents: [{ id: 'enrolled' }] },
      capabilities: [{ revisions: [{ serviceTermId, specialismTermId, deliveryModes }] }],
    }).client as never, 'provider', new Date('2026-07-15'))
    expect(result.policyVersion).toBe(PROVIDER_COMPLETENESS_POLICY_VERSION)
    expect(result.isSubmittable).toBe(expected)
  })

  it('vereist bij nieuwe aanbieders geen verzekeringen, documenten, verklaringen of personeelsdossiers', async () => {
    const result = await assessProviderDossierCompletenessInTransaction(transaction({
      organization: { ...completeState.organization, provisioningEvents: [{ id: 'enrolled' }] },
      capabilities: [{ revisions: [{ serviceTermId: 'service', specialismTermId: null, deliveryModes: ['REMOTE'] }] }],
      professionals: [], insurances: [], evidenceDocuments: [], termAcceptances: [],
    }).client as never, 'provider', new Date('2026-07-15'))
    expect(result).toMatchObject({ required: 4, completed: 4, percentage: 100, isSubmittable: true })
    expect(result.blockingSections).toEqual([])
    expect(result.sections).toMatchObject({ PROFESSIONALS: 'OPTIONAL_EMPTY', INSURANCE: 'OPTIONAL_EMPTY', EVIDENCE: 'OPTIONAL_EMPTY', DECLARATIONS: 'OPTIONAL_EMPTY', CAPACITY: 'NOT_APPLICABLE' })
  })

  it('vereist voor diensten geen competentie', async () => {
    const result = await assessProviderDossierCompletenessInTransaction(transaction({
      capabilities: [{ revisions: [{ serviceTermId: 'service', specialismTermId: null, deliveryModes: ['REMOTE'] }] }],
    }).client as never, 'provider', new Date('2026-07-15'))

    expect(result.blockingSections).not.toContain('CAPABILITIES')
  })

  it('rapporteert ontbrekende en verlopen secties zonder kwalificatieoordeel', async () => {
    const result = await assessProviderDossierCompletenessInTransaction(transaction({ capabilities: [] }).client as never, 'provider', new Date('2026-07-15'))
    expect(result.isSubmittable).toBe(false)
    expect(result.blockingSections).toEqual(['CAPABILITIES'])
    expect(result.reasons.some((reason) => reason.section === 'CAPACITY')).toBe(false)
    expect(JSON.stringify(result)).not.toMatch(/QUALIFIED|SELECTABLE|VERIFIED/)
  })

  it.each([
    ['ORGANIZATION', { organization: { provisioningEvents: [], name: '', chamberOfCommerceNumber: null } }],
    ['CAPABILITIES', { capabilities: [] }],
    ['SECTOR_EXPERIENCE', { sectorExperiences: [] }],
    ['WORK_AREA', { workAreas: [] }],
    ['PROFESSIONALS', { professionals: [] }],
    ['QUALIFICATIONS', { professionals: [{ identityRevisions: [{ status: 'ACTIVE' }], qualifications: [] }], organizationQualifications: [] }],
    ['INSURANCE', { insurances: [] }],
    ['EVIDENCE', { evidenceDocuments: [] }],
    ['DECLARATIONS', { termAcceptances: [] }],
  ])('bepaalt de toepasselijkheid van %s voor bestaande organisaties', async (section, overrides) => {
    const result = await assessProviderDossierCompletenessInTransaction(
      transaction(overrides).client as never,
      'provider',
      new Date('2026-07-15'),
    )
    const required = ['ORGANIZATION', 'CAPABILITIES', 'SECTOR_EXPERIENCE', 'WORK_AREA'].includes(String(section))
    expect(result.blockingSections.includes(section as keyof typeof result.sections)).toBe(required)
    expect(result.isSubmittable).toBe(!required)
  })

  it('start geen tweede query zolang dezelfde transactionele client nog bezig is', async () => {
    const guardedTransaction = transaction({}, true)

    await assessProviderDossierCompletenessInTransaction(
      guardedTransaction.client as never,
      'provider',
      new Date('2026-07-15'),
    )

    expect(guardedTransaction.maximumConcurrentQueries()).toBe(1)
  })
})
