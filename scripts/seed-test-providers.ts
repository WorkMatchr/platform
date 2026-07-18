import 'dotenv/config'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { PrismaPg } from '@prisma/adapter-pg'
import { Client } from 'pg'
import { PrismaClient, type Prisma } from '../src/generated/prisma/client'
import {
  TEST_PROVIDER_DATABASE,
  TEST_PROVIDER_DATASET_VERSION,
  TEST_PROVIDER_PREFIX,
  testProviderSpecs,
  type ServiceCode,
} from './test-provider-dataset'

const command = process.argv[2] ?? 'seed'
const sourceConnectionString = process.env.DATABASE_URL

if (!sourceConnectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
if (process.env.NODE_ENV === 'production') throw new Error('De fictieve testdataset mag niet in productie worden gebruikt.')

const sourceUrl = new URL(sourceConnectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) {
  throw new Error('De fictieve testdataset mag uitsluitend op lokale PostgreSQL worden gebruikt.')
}

const databaseName = process.env.WORKMATCHR_TEST_PROVIDER_DATABASE ?? TEST_PROVIDER_DATABASE
if (!/^workmatchr_test_providers(?:_[a-z0-9_]+)?$/.test(databaseName)) {
  throw new Error('De gereserveerde testdatabasenaam is ongeldig.')
}

const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const targetUrl = new URL(sourceUrl)
targetUrl.pathname = `/${databaseName}`
targetUrl.searchParams.set('schema', 'public')

const fixedNow = new Date('2026-07-01T09:00:00.000Z')
const validUntil = new Date('2031-07-01T09:00:00.000Z')

function uuid(key: string): string {
  const bytes = Buffer.from(createHash('sha256').update(`${TEST_PROVIDER_DATASET_VERSION}:${key}`).digest().subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const value = bytes.toString('hex')
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`
}

function checksum(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

async function databaseExists(client: Client): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>('SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS exists', [databaseName])
  return result.rows[0]?.exists ?? false
}

async function dropDatabase(client: Client) {
  await client.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [databaseName])
  await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`)
}

function runNpmScript(script: 'db:deploy' | 'db:seed') {
  const npmExecPath = process.env.npm_execpath
  if (!npmExecPath) throw new Error('Het pad naar de actieve npm-CLI ontbreekt.')
  const result = spawnSync(process.execPath, [npmExecPath, 'run', script], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: targetUrl.toString(), NODE_ENV: 'test' },
    encoding: 'utf8',
    stdio: 'pipe',
  })
  if (result.status !== 0) {
    throw new Error(`${script} mislukte voor de provider-testdatabase:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
  }
}

type ReferenceMaps = {
  terms: Map<string, { id: string; code: string; version: { version: number; checksum: string | null; taxonomy: { kind: string } } }>
  taxonomyVersions: Array<{ kind: string; version: number; checksum: string }>
}

async function loadReferences(prisma: PrismaClient): Promise<ReferenceMaps> {
  const terms = await prisma.providerTaxonomyTerm.findMany({
    where: { version: { status: 'PUBLISHED' } },
    select: { id: true, code: true, version: { select: { version: true, checksum: true, taxonomy: { select: { kind: true } } } } },
  })
  const map = new Map(terms.map((term) => [`${term.version.taxonomy.kind}:${term.code}`, term]))
  const taxonomyVersions = [...new Map(terms.filter((term) => term.version.checksum).map((term) => [term.version.taxonomy.kind, {
    kind: term.version.taxonomy.kind,
    version: term.version.version,
    checksum: term.version.checksum!,
  }])).values()].sort((left, right) => left.kind.localeCompare(right.kind))
  return { terms: map, taxonomyVersions }
}

function requiredTerm(references: ReferenceMaps, kind: string, code: string) {
  const term = references.terms.get(`${kind}:${code}`)
  if (!term) throw new Error(`Vereiste taxonomieterm ontbreekt: ${kind}:${code}`)
  return term
}

const serviceDetails: Record<ServiceCode, { specialism: string; qualification: string }> = {
  RISK_ASSESSMENT: { specialism: 'rie', qualification: 'hvk-diploma' },
  SAFETY_ADVICE: { specialism: 'veiligheidskundige', qualification: 'hvk-diploma' },
  AUDIT_AND_INSPECTION: { specialism: 'operationele-veiligheid', qualification: 'iso-45001-lead-auditor' },
  IMPLEMENTATION_SUPPORT: { specialism: 'middelbare-veiligheidskundige', qualification: 'mvk-diploma' },
  TRAINING: { specialism: 'brandveiligheid', qualification: 'mvk-diploma' },
}

const professionalRoles = [
  ['HVK', 'hvk-diploma'],
  ['MVK', 'mvk-diploma'],
  ['Arbeidshygiënist', 'arbeidshygienist'],
  ['Veiligheidsadviseur', 'gecertificeerd-kerndeskundige'],
  ['Auditor', 'iso-45001-lead-auditor'],
  ['Trainer', 'mvk-diploma'],
  ['Incidentonderzoeker', 'hvk-diploma'],
] as const

async function seedProvider(
  prisma: PrismaClient,
  references: ReferenceMaps,
  spec: (typeof testProviderSpecs)[number],
  reviewerId: string,
  approverId: string,
) {
  const organizationId = uuid(`${spec.code}:organization`)
  const profileId = uuid(`${spec.code}:profile`)
  const ownerId = uuid(`${spec.code}:owner`)
  const verifiedLevel = spec.verified ? 'VERIFIED' : 'SELF_DECLARED'

  await prisma.user.create({ data: {
    id: ownerId,
    email: `owner-${String(spec.number).padStart(2, '0')}@test-wm.example.invalid`,
    displayName: `${TEST_PROVIDER_PREFIX}Gebruiker ${String(spec.number).padStart(2, '0')}`,
    emailVerified: true,
    status: 'ACTIVE',
  } })
  await prisma.organization.create({ data: {
    id: organizationId,
    name: spec.organizationName,
    tradeName: spec.organizationName,
    organizationType: spec.organizationType,
    status: 'ACTIVE',
    website: `https://dienstverlener-${String(spec.number).padStart(2, '0')}.example.invalid`,
    generalEmail: `contact@dienstverlener-${String(spec.number).padStart(2, '0')}.example.invalid`,
  } })
  await prisma.organizationMembership.create({ data: { id: uuid(`${spec.code}:membership`), userId: ownerId, organizationId, role: 'OWNER', status: 'ACTIVE' } })
  await prisma.organizationLocation.create({ data: {
    id: uuid(`${spec.code}:location`), organizationId, label: 'Fictieve testvestiging',
    addressLine: `Testlaan ${100 + spec.number}`, postalCode: `${1000 + spec.number} TA`, city: spec.city,
    province: spec.province, countryCode: 'NL', isPrimary: true,
  } })
  await prisma.providerProfile.create({ data: {
    id: profileId, organizationId, description: `${TEST_PROVIDER_DATASET_VERSION}:${spec.category}`,
    lifecycleStatus: spec.qualified ? 'QUALIFIED' : 'READY_FOR_REVIEW',
    readinessStatus: spec.selectable || spec.blocked ? 'READY' : 'INCOMPLETE',
    platformQualificationStatus: spec.qualified ? 'QUALIFIED' : 'NOT_ASSESSED',
    selectabilityStatus: spec.blocked ? 'BLOCKED' : spec.selectable ? 'SELECTABLE' : 'NOT_SELECTABLE',
    approvalStatus: spec.qualified ? 'APPROVED' : 'PENDING_REVIEW', version: 1,
  } })

  const capabilityRows: Array<{ id: string; revisionId: string; serviceCode: ServiceCode }> = []
  for (const [capabilityIndex, serviceCode] of spec.serviceCodes.entries()) {
    const id = uuid(`${spec.code}:capability:${serviceCode}`)
    const revisionId = uuid(`${spec.code}:capability-revision:${serviceCode}`)
    const details = serviceDetails[serviceCode]
    await prisma.providerCapability.create({ data: { id, providerProfileId: profileId } })
    await prisma.providerCapabilityRevision.create({ data: {
      id: revisionId, providerCapabilityId: id, version: 1,
      serviceTermId: requiredTerm(references, 'SERVICE', serviceCode).id,
      specialismTermId: requiredTerm(references, 'SPECIALISM', details.specialism).id,
      deliveryModes: capabilityIndex % 3 === 0 ? ['ON_SITE', 'HYBRID'] : capabilityIndex % 3 === 1 ? ['REMOTE', 'HYBRID'] : ['ON_SITE'],
      verificationLevel: 'SELF_DECLARED',
    } })
    capabilityRows.push({ id, revisionId, serviceCode })
  }

  const sectorRevisionIds: string[] = []
  for (const sectorCode of spec.sectorCodes) {
    const id = uuid(`${spec.code}:sector:${sectorCode}`)
    const revisionId = uuid(`${spec.code}:sector-revision:${sectorCode}`)
    await prisma.providerSectorExperience.create({ data: { id, providerProfileId: profileId } })
    await prisma.providerSectorExperienceRevision.create({ data: {
      id: revisionId, sectorExperienceId: id, version: 1,
      sectorTermId: requiredTerm(references, 'SECTOR', sectorCode).id,
      experienceYears: 2 + (spec.number % 18), verificationLevel: 'SELF_DECLARED',
    } })
    sectorRevisionIds.push(revisionId)
  }

  const workAreaRevisionIds: string[] = []
  for (const regionCode of spec.workAreaCodes) {
    const id = uuid(`${spec.code}:work-area:${regionCode}`)
    const revisionId = uuid(`${spec.code}:work-area-revision:${regionCode}`)
    await prisma.providerWorkArea.create({ data: { id, providerProfileId: profileId } })
    await prisma.providerWorkAreaRevision.create({ data: {
      id: revisionId, workAreaId: id, version: 1,
      regionTermId: requiredTerm(references, 'REGION', regionCode).id,
      maxTravelDistanceKm: ['REMOTE', 'NATIONWIDE'].includes(regionCode) ? null : 25 + (spec.number % 4) * 25,
      verificationLevel: 'SELF_DECLARED',
    } })
    workAreaRevisionIds.push(revisionId)
  }

  const qualificationRows: Array<{ id: string; revisionId: string; code: string }> = []
  const professionalIds: string[] = []
  for (let professionalIndex = 0; professionalIndex < spec.professionalCount; professionalIndex += 1) {
    const professionalId = uuid(`${spec.code}:professional:${professionalIndex}`)
    professionalIds.push(professionalId)
    const [role, defaultQualification] = professionalRoles[(spec.number + professionalIndex) % professionalRoles.length]
    await prisma.providerProfessional.create({ data: { id: professionalId, providerProfileId: profileId } })
    await prisma.providerProfessionalIdentityRevision.create({ data: {
      id: uuid(`${spec.code}:professional-identity:${professionalIndex}`), professionalId, version: 1,
      displayName: `${TEST_PROVIDER_PREFIX}Professional ${String(spec.number).padStart(2, '0')}-${professionalIndex + 1}`,
      functionalRole: role, createdByUserId: ownerId,
    } })
    await prisma.providerProfessionalPrivateData.create({ data: {
      professionalId,
      displayName: `${TEST_PROVIDER_PREFIX}Professional ${String(spec.number).padStart(2, '0')}-${professionalIndex + 1}`,
      contactEmail: `professional-${spec.number}-${professionalIndex + 1}@test-wm.example.invalid`,
    } })
    const qualificationCodes = professionalIndex === 0
      ? [...new Set(spec.serviceCodes.map((serviceCode) => serviceDetails[serviceCode].qualification))]
      : [defaultQualification]
    for (const qualificationCode of qualificationCodes) {
      const qualificationId = uuid(`${spec.code}:qualification:${professionalIndex}:${qualificationCode}`)
      const revisionId = uuid(`${spec.code}:qualification-revision:${professionalIndex}:${qualificationCode}`)
      await prisma.providerProfessionalQualification.create({ data: { id: qualificationId, professionalId } })
      await prisma.providerProfessionalQualificationRevision.create({ data: {
        id: revisionId, qualificationId, version: 1,
        qualificationTermId: requiredTerm(references, 'CERTIFICATION', qualificationCode).id,
        issuer: `${TEST_PROVIDER_PREFIX}Fictieve opleider`, isCertified: (spec.number + professionalIndex) % 3 !== 0,
        verificationLevel: 'SELF_DECLARED',
      } })
      qualificationRows.push({ id: qualificationId, revisionId, code: qualificationCode })
      for (const capability of capabilityRows.filter((item) => serviceDetails[item.serviceCode].qualification === qualificationCode)) {
        await prisma.providerProfessionalQualificationCapability.create({ data: { qualificationId, capabilityId: capability.id } })
      }
    }
  }

  let insuranceRevisionId: string | null = null
  if (spec.insured) {
    const evidenceId = uuid(`${spec.code}:evidence`)
    const evidenceRevisionId = uuid(`${spec.code}:evidence-revision`)
    const insuranceId = uuid(`${spec.code}:insurance`)
    insuranceRevisionId = uuid(`${spec.code}:insurance-revision`)
    await prisma.providerEvidenceDocument.create({ data: { id: evidenceId, providerProfileId: profileId, status: spec.verified ? 'AVAILABLE' : 'DRAFT' } })
    await prisma.providerEvidenceRevision.create({ data: {
      id: evidenceRevisionId, evidenceDocumentId: evidenceId, version: 1,
      storageKey: `test-wm-evidence/${spec.code.toLowerCase()}/fictieve-polis.pdf`,
      originalFileName: `${spec.code}-fictieve-polis.pdf`, mimeType: 'application/pdf', sizeBytes: 1024 + spec.number,
      sha256: checksum(`${spec.code}:fictieve-polis`), scanStatus: spec.verified ? 'CLEAN' : 'PENDING',
    } })
    if (spec.verified) await prisma.providerEvidenceScanDecision.create({ data: {
      id: uuid(`${spec.code}:scan-decision`), evidenceRevisionId, scanStatus: 'CLEAN',
      scannerReference: `${TEST_PROVIDER_PREFIX}SCANNER`, checksum: checksum(`${spec.code}:scan-clean`),
    } })
    await prisma.providerInsurance.create({ data: { id: insuranceId, providerProfileId: profileId } })
    await prisma.providerInsuranceRevision.create({ data: {
      id: insuranceRevisionId, insuranceId, version: 1,
      insuranceTypeTermId: requiredTerm(references, 'INSURANCE_TYPE', 'GENERAL_LIABILITY').id,
      insurer: `${TEST_PROVIDER_PREFIX}Fictieve verzekeraar`, policyReference: `${TEST_PROVIDER_PREFIX}POLIS-${String(spec.number).padStart(2, '0')}`,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'), expiresAt: new Date('2031-01-01T00:00:00.000Z'),
      insuredOrganizationId: organizationId, coverageAmountCents: BigInt(2_500_000_00), coverageGeography: 'NL',
      evidenceRevisionId, verificationLevel: 'SELF_DECLARED',
    } })
  }

  const reviewTargets: Array<Record<string, string>> = [
    ...capabilityRows.map((item) => ({ capabilityRevisionId: item.revisionId })),
    ...sectorRevisionIds.map((id) => ({ sectorExperienceRevisionId: id })),
    ...workAreaRevisionIds.map((id) => ({ workAreaRevisionId: id })),
    ...qualificationRows.map((item) => ({ professionalQualificationRevisionId: item.revisionId })),
    ...(insuranceRevisionId ? [{ insuranceRevisionId }] : []),
  ]
  if (spec.verified) {
    for (const [reviewIndex, target] of reviewTargets.entries()) {
      await prisma.providerVerificationReview.create({ data: {
        id: uuid(`${spec.code}:verification:${reviewIndex}`), providerProfileId: profileId,
        ...target, outcome: 'VERIFIED', resultingLevel: 'VERIFIED', reviewerUserId: reviewerId,
        reasonCode: 'TEST_DATASET_VERIFIED', validFrom: fixedNow, validUntil,
        checksum: checksum({ spec: spec.code, target }),
      } as Prisma.ProviderVerificationReviewUncheckedCreateInput })
    }
  }

  if (spec.qualified) {
    for (const capability of capabilityRows) {
      await prisma.providerQualificationDecision.create({ data: {
        id: uuid(`${spec.code}:capability-decision:${capability.serviceCode}`), providerProfileId: profileId,
        capabilityId: capability.id, scope: 'CAPABILITY', outcome: 'QUALIFIED',
        reviewedByUserId: reviewerId, approvedByUserId: approverId, reasonCode: 'TEST_DATASET_QUALIFIED',
        validFrom: fixedNow, validUntil, sourceChecksum: checksum({ spec: spec.code, capability: capability.id }),
      } })
    }
    await prisma.providerQualificationDecision.create({ data: {
      id: uuid(`${spec.code}:platform-decision`), providerProfileId: profileId, scope: 'PLATFORM', outcome: 'QUALIFIED',
      reviewedByUserId: reviewerId, approvedByUserId: approverId, reasonCode: 'TEST_DATASET_QUALIFIED',
      validFrom: fixedNow, validUntil, sourceChecksum: checksum({ spec: spec.code, scope: 'PLATFORM' }),
    } })
  }

  if (spec.blocked) await prisma.providerBlock.create({ data: {
    id: uuid(`${spec.code}:block`), providerProfileId: profileId, type: 'COMPLIANCE', reasonCode: 'TEST_DATASET_BLOCKED',
    reviewedByUserId: reviewerId, blockedByUserId: approverId,
  } })

  const readinessId = uuid(`${spec.code}:readiness`)
  const readinessStatus = spec.selectable || spec.blocked ? 'READY' : 'INCOMPLETE'
  const readinessReasons = readinessStatus === 'READY' ? [] : [spec.insured ? 'CONFIGURATION_INCOMPLETE' : 'INSURANCE_REQUIREMENTS_NOT_CONFIGURED']
  await prisma.providerReadinessAssessment.create({ data: {
    id: readinessId, providerProfileId: profileId, status: readinessStatus, reasonCodes: readinessReasons,
    sourceVersion: 1, assessedByUserId: reviewerId, checksum: checksum({ spec: spec.code, readinessStatus, readinessReasons }),
  } })
  const selectabilityId = uuid(`${spec.code}:selectability`)
  const selectabilityStatus = spec.blocked ? 'BLOCKED' : spec.selectable ? 'SELECTABLE' : 'NOT_SELECTABLE'
  const selectabilityReasons = spec.blocked ? ['PROVIDER_BLOCKED'] : spec.selectable ? [] : ['QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED']
  await prisma.providerSelectabilityAssessment.create({ data: {
    id: selectabilityId, providerProfileId: profileId, readinessAssessmentId: readinessId,
    status: selectabilityStatus, reasonCodes: selectabilityReasons, sourceVersion: 1,
    assessedByUserId: reviewerId, checksum: checksum({ spec: spec.code, selectabilityStatus, selectabilityReasons }),
  } })

  if (spec.selectable) {
    const payload = {
      providerProfileId: profileId, schemaVersion: 2, sourceVersion: 1,
      taxonomyVersions: references.taxonomyVersions,
      capabilities: capabilityRows.map((item) => ({
        serviceCode: item.serviceCode,
        specialismCode: serviceDetails[item.serviceCode].specialism,
        competencyCode: null,
        deliveryModes: ['HYBRID', 'ON_SITE'], verificationLevel: verifiedLevel,
      })),
      sectors: spec.sectorCodes.map((sectorCode) => ({ sectorCode, verificationLevel: verifiedLevel })),
      workAreas: spec.workAreaCodes.map((regionCode) => ({ regionCode, maxTravelDistanceKm: ['REMOTE', 'NATIONWIDE'].includes(regionCode) ? null : 50, verificationLevel: verifiedLevel })),
      platformQualificationDecisionId: uuid(`${spec.code}:platform-decision`),
    }
    await prisma.trustedProviderProjection.create({ data: {
      id: uuid(`${spec.code}:projection`), providerProfileId: profileId,
      readinessAssessmentId: readinessId, selectabilityAssessmentId: selectabilityId,
      schemaVersion: 2, canonicalizationVersion: 'WORKMATCHR-CJ-1', sourceVersion: 1,
      payload, sha256: checksum(payload), validFrom: fixedNow, validUntil, createdByUserId: approverId,
    } })
  }
}

async function seedDataset(prisma: PrismaClient) {
  const references = await loadReferences(prisma)
  const reviewerId = uuid('platform-reviewer')
  const approverId = uuid('platform-approver')
  await prisma.user.createMany({ data: [
    { id: reviewerId, email: 'reviewer@test-wm.example.invalid', displayName: `${TEST_PROVIDER_PREFIX}Beoordelaar`, emailVerified: true, platformRole: 'ADMIN', status: 'ACTIVE' },
    { id: approverId, email: 'approver@test-wm.example.invalid', displayName: `${TEST_PROVIDER_PREFIX}Goedkeurder`, emailVerified: true, platformRole: 'ADMIN', status: 'ACTIVE' },
  ] })
  for (const spec of testProviderSpecs) await seedProvider(prisma, references, spec, reviewerId, approverId)
}

export async function verifyTestProviderDataset(prisma: PrismaClient) {
  const organizations = await prisma.organization.findMany({
    where: { name: { startsWith: TEST_PROVIDER_PREFIX } },
    include: { memberships: { include: { user: true } }, locations: true, providerProfile: {
      include: { capabilities: true, professionals: { include: { privateData: true, qualifications: { include: { capabilities: true } } } }, trustedProjections: true },
    } },
  })
  if (organizations.length !== 50) throw new Error(`Verwacht 50 fictieve dienstverleners, gevonden: ${organizations.length}.`)
  if (new Set(organizations.map((item) => item.name)).size !== 50) throw new Error('Dubbele fictieve organisatienamen gevonden.')
  if (organizations.some((item) => item.memberships.length !== 1 || item.locations.length !== 1 || !item.providerProfile)) {
    throw new Error('Tenant-, membership- of providerrelaties zijn onvolledig.')
  }
  if (new Set(organizations.map((item) => item.locations[0]?.province)).size < 12) throw new Error('De geografische spreiding omvat minder dan twaalf provincies.')
  if (organizations.some((item) => !item.generalEmail?.endsWith('.example.invalid'))) throw new Error('Niet-fictief e-maildomein in de dataset.')
  if (organizations.some((item) => !item.memberships[0]?.user.email.endsWith('.example.invalid') || !item.memberships[0]?.user.displayName?.startsWith(TEST_PROVIDER_PREFIX))) {
    throw new Error('Niet-fictieve testgebruiker in de dataset.')
  }
  if (organizations.some((item) => !item.locations[0]?.addressLine.startsWith('Testlaan ') || !item.locations[0]?.city.startsWith('Testplaats '))) {
    throw new Error('Niet-fictief testadres in de dataset.')
  }
  if (organizations.some((item) => item.providerProfile?.professionals.some((professional) =>
    !professional.privateData?.displayName.startsWith(TEST_PROVIDER_PREFIX) || !professional.privateData.contactEmail?.endsWith('.example.invalid')))) {
    throw new Error('Niet-fictieve professional in de dataset.')
  }
  const professionalCount = organizations.reduce((total, item) => total + (item.providerProfile?.professionals.length ?? 0), 0)
  const qualificationCount = organizations.reduce((total, item) => total + (item.providerProfile?.professionals.reduce((sum, professional) => sum + professional.qualifications.length, 0) ?? 0), 0)
  const multiCapabilityQualifications = organizations.reduce((total, item) => total + (item.providerProfile?.professionals.reduce((sum, professional) => sum + professional.qualifications.filter((qualification) => qualification.capabilities.length > 1).length, 0) ?? 0), 0)
  if (professionalCount !== 150 || qualificationCount < 150 || multiCapabilityQualifications === 0) throw new Error('Variatie in professionals of kwalificaties klopt niet.')
  return {
    organizations: organizations.length,
    professionals: professionalCount,
    qualifications: qualificationCount,
    projections: organizations.reduce((total, item) => total + (item.providerProfile?.trustedProjections.length ?? 0), 0),
    multiCapabilityQualifications,
  }
}

async function inspectExistingDataset(): Promise<'missing-schema' | 'empty' | 'complete' | 'partial' | 'foreign'> {
  const client = new Client({ connectionString: targetUrl.toString() })
  await client.connect()
  try {
    const table = await client.query<{ exists: boolean }>(`SELECT to_regclass('public."Organization"') IS NOT NULL AS exists`)
    if (!table.rows[0]?.exists) return 'missing-schema'
    const result = await client.query<{ total: number; marked: number }>(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE name LIKE '${TEST_PROVIDER_PREFIX}%')::int AS marked
      FROM "Organization"
    `)
    const { total, marked } = result.rows[0] ?? { total: 0, marked: 0 }
    if (total === 0) return 'empty'
    if (marked === 50 && total === 50) return 'complete'
    if (marked > 0 && marked === total) return 'partial'
    return 'foreign'
  } finally {
    await client.end()
  }
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  try {
    if (command === 'remove') {
      await dropDatabase(admin)
      console.log(`Fictieve datasetdatabase ${databaseName} is verwijderd.`)
      return
    }
    if (command !== 'seed' && command !== 'verify') throw new Error(`Onbekend commando: ${command}`)
    const exists = await databaseExists(admin)
    if (!exists) {
      if (command === 'verify') throw new Error(`Testdatabase ${databaseName} bestaat niet.`)
      await admin.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`)
    } else {
      const state = await inspectExistingDataset()
      if (state === 'foreign') throw new Error(`Testdatabase ${databaseName} bevat niet-datasetgegevens en wordt niet overschreven.`)
      if (state === 'complete') {
        const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl.toString() }) })
        try {
          const result = await verifyTestProviderDataset(prisma)
          console.log(`Dataset is al compleet en ongewijzigd: ${JSON.stringify(result)}.`)
          return
        } finally {
          await prisma.$disconnect()
        }
      }
      if (command === 'verify') throw new Error(`Testdatabase ${databaseName} bevat geen complete dataset.`)
      if (state === 'partial') {
        await dropDatabase(admin)
        await admin.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`)
      }
    }
  } finally {
    await admin.end()
  }

  runNpmScript('db:deploy')
  runNpmScript('db:seed')
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl.toString() }) })
  try {
    await seedDataset(prisma)
    const result = await verifyTestProviderDataset(prisma)
    console.log(`Fictieve providerdataset geladen in ${databaseName}: ${JSON.stringify(result)}.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
