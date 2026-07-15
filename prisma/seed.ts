import 'dotenv/config'
import { createHash } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { intakeQuestionnaireV1, type IntakeQuestionnaireQuestionSeed } from './intake-questionnaire-v1'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is niet geconfigureerd.')
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const sectors = [
  ['bouw', 'Bouw'],
  ['industrie', 'Industrie'],
  ['zorg', 'Zorg'],
  ['onderwijs', 'Onderwijs'],
  ['overheid', 'Overheid'],
  ['semioverheid', 'Semioverheid'],
  ['logistiek', 'Logistiek'],
  ['zakelijke-dienstverlening', 'Zakelijke dienstverlening'],
  ['detailhandel', 'Detailhandel'],
  ['horeca', 'Horeca'],
  ['landbouw', 'Landbouw'],
  ['overig', 'Overig'],
] as const

const specialisms = [
  ['rie', 'RI&E', null],
  ['bedrijfsarts', 'Bedrijfsarts', null],
  ['arbodienst', 'Arbodienst', null],
  ['pmo', 'PMO', null],
  ['veiligheidskundige', 'Veiligheidskundige', null],
  ['middelbare-veiligheidskundige', 'Middelbare veiligheidskundige', 'veiligheidskundige'],
  ['hogere-veiligheidskundige', 'Hogere veiligheidskundige', 'veiligheidskundige'],
  ['arbeidshygienist', 'Arbeidshygiënist', null],
  ['arbeidsdeskundige', 'Arbeidsdeskundige', null],
  ['verzuimbegeleiding', 'Verzuimbegeleiding', null],
  ['machineveiligheid', 'Machineveiligheid', null],
  ['brandveiligheid', 'Brandveiligheid', null],
  ['operationele-veiligheid', 'Operationele veiligheid', null],
] as const

const certifications = [
  ['hvk-diploma', 'HVK-diploma'],
  ['mvk-diploma', 'MVK-diploma'],
  ['gecertificeerd-kerndeskundige', 'Gecertificeerd kerndeskundige'],
  ['arbeidshygienist', 'Arbeidshygiënist'],
  ['arbeids-en-organisatiedeskundige', 'Arbeids- en organisatiedeskundige'],
  ['bedrijfsartsregistratie', 'Bedrijfsartsregistratie'],
  ['iso-45001-lead-auditor', 'ISO 45001 Lead Auditor'],
] as const

const providerTaxonomies = {
  SERVICE: [
    ['RISK_ASSESSMENT', 'Risico-inventarisatie en -evaluatie'],
    ['SAFETY_ADVICE', 'Veiligheidsadvies'],
    ['IMPLEMENTATION_SUPPORT', 'Implementatieondersteuning'],
    ['AUDIT_AND_INSPECTION', 'Audit en inspectie'],
    ['TRAINING', 'Training'],
  ],
  COMPETENCY: [
    ['RISK_ASSESSMENT_EXECUTION', 'Uitvoering risico-inventarisatie'],
    ['SAFETY_ADVISORY', 'Veiligheidsadvisering'],
    ['AUDIT_EXECUTION', 'Uitvoering audits'],
    ['IMPLEMENTATION_GUIDANCE', 'Implementatiebegeleiding'],
    ['TRAINING_DELIVERY', 'Verzorgen van trainingen'],
    ['INCIDENT_INVESTIGATION', 'Incidentonderzoek'],
    ['PROJECT_MANAGEMENT', 'Projectmanagement'],
    ['POLICY_DEVELOPMENT', 'Beleidsontwikkeling'],
  ],
  REGION: [
    ['DRENTHE', 'Drenthe'],
    ['FLEVOLAND', 'Flevoland'],
    ['FRIESLAND', 'Fryslân'],
    ['GELDERLAND', 'Gelderland'],
    ['GRONINGEN', 'Groningen'],
    ['LIMBURG', 'Limburg'],
    ['NOORD_BRABANT', 'Noord-Brabant'],
    ['NOORD_HOLLAND', 'Noord-Holland'],
    ['OVERIJSSEL', 'Overijssel'],
    ['UTRECHT', 'Utrecht'],
    ['ZEELAND', 'Zeeland'],
    ['ZUID_HOLLAND', 'Zuid-Holland'],
    ['NATIONWIDE', 'Landelijk'],
    ['REMOTE', 'Op afstand'],
  ],
  INSURANCE_TYPE: [
    ['GENERAL_LIABILITY', 'Bedrijfsaansprakelijkheidsverzekering'],
    ['PROFESSIONAL_LIABILITY', 'Beroepsaansprakelijkheidsverzekering'],
  ],
} as const

const providerReasonCodes = [
  ['CONFIGURATION_INCOMPLETE', 'CONFIGURATION', 'Configuratie is onvolledig'],
  ['REQUIREMENTS_NOT_CONFIGURED', 'CONFIGURATION', 'Vereisten zijn niet geconfigureerd'],
  ['TERMS_NOT_CONFIGURED', 'TERMS', 'Voorwaarden zijn niet geconfigureerd'],
  ['INSURANCE_REQUIREMENTS_NOT_CONFIGURED', 'INSURANCE', 'Verzekeringsvereisten zijn niet geconfigureerd'],
  ['QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED', 'QUALIFICATION', 'Kwalificatievereisten zijn niet geconfigureerd'],
  ['CAPACITY_STALE', 'READINESS', 'Capaciteitsgegevens zijn verlopen'],
  ['PROVIDER_BLOCKED', 'SELECTABILITY', 'Provider is geblokkeerd'],
] as const

const providerTermDocuments = [
  ['PLATFORM_TERMS', 'Platformvoorwaarden'],
  ['PRIVACY_NOTICE', 'Privacyverklaring'],
  ['PROVIDER_DATA_ACCURACY', 'Verklaring juistheid providergegevens'],
  ['ORGANIZATION_AUTHORITY', 'Verklaring bevoegdheid namens organisatie'],
  ['CONFLICTS_OF_INTEREST', 'Verklaring belangenconflicten'],
  ['LEGAL_COMPLIANCE', 'Verklaring naleving wet- en regelgeving'],
] as const

function taxonomyChecksum(terms: readonly (readonly [string, string])[]): string {
  return createHash('sha256').update(JSON.stringify(terms)).digest('hex')
}

async function seedProviderTaxonomy(
  kind: keyof typeof providerTaxonomies | 'SPECIALISM' | 'SECTOR' | 'CERTIFICATION',
  terms: readonly (readonly [string, string])[],
) {
  const taxonomy = await prisma.providerTaxonomy.upsert({
    where: { kind },
    update: {},
    create: { kind, code: kind, name: kind },
  })
  const checksum = taxonomyChecksum(terms)
  const existing = await prisma.providerTaxonomyVersion.findUnique({
    where: { taxonomyId_version: { taxonomyId: taxonomy.id, version: 1 } },
    include: { terms: { orderBy: { sortOrder: 'asc' } } },
  })

  if (existing) {
    const matches =
      existing.status === 'PUBLISHED' &&
      existing.checksum === checksum &&
      existing.terms.length === terms.length &&
      terms.every(([code, label], index) => existing.terms[index]?.code === code && existing.terms[index]?.label === label)
    if (!matches) throw new Error(`Gepubliceerde providertaxonomie ${kind} versie 1 wijkt af en wordt niet overschreven.`)
    return existing
  }

  return prisma.providerTaxonomyVersion.create({
    data: {
      taxonomyId: taxonomy.id,
      version: 1,
      status: 'PUBLISHED',
      checksum,
      publishedAt: new Date(),
      terms: { create: terms.map(([code, label], sortOrder) => ({ code, label, sortOrder })) },
    },
    include: { terms: true },
  })
}

async function seedProviderQualificationReferences() {
  for (const [kind, terms] of Object.entries(providerTaxonomies) as Array<
    [keyof typeof providerTaxonomies, readonly (readonly [string, string])[]]
  >) {
    await seedProviderTaxonomy(kind, terms)
  }

  const specialismVersion = await seedProviderTaxonomy('SPECIALISM', specialisms.map(([slug, name]) => [slug, name]))
  const sectorVersion = await seedProviderTaxonomy('SECTOR', sectors.map(([slug, name]) => [slug, name]))
  const certificationVersion = await seedProviderTaxonomy('CERTIFICATION', certifications)

  for (const term of specialismVersion.terms) {
    const specialism = await prisma.specialism.findUniqueOrThrow({ where: { slug: term.code } })
    await prisma.providerSpecialismTaxonomyMap.upsert({
      where: { termId: term.id },
      update: {},
      create: { termId: term.id, specialismId: specialism.id },
    })
  }
  for (const term of sectorVersion.terms) {
    const sector = await prisma.sector.findUniqueOrThrow({ where: { slug: term.code } })
    await prisma.providerSectorTaxonomyMap.upsert({
      where: { termId: term.id },
      update: {},
      create: { termId: term.id, sectorId: sector.id },
    })
  }
  for (const term of certificationVersion.terms) {
    const certification = await prisma.certification.findUniqueOrThrow({ where: { slug: term.code } })
    await prisma.providerCertificationTaxonomyMap.upsert({
      where: { termId: term.id },
      update: {},
      create: { termId: term.id, certificationId: certification.id },
    })
  }

  for (const [code, domain, label] of providerReasonCodes) {
    await prisma.providerReasonCode.upsert({ where: { code }, update: { domain, label, isActive: true }, create: { code, domain, label } })
  }

  for (const [code, label] of providerTermDocuments) {
    const document = await prisma.providerTermDocument.upsert({ where: { code }, update: { label }, create: { code, label } })
    await prisma.providerTermDocumentVersion.upsert({
      where: { documentId_version: { documentId: document.id, version: 1 } },
      update: {},
      create: { documentId: document.id, version: 1, label, status: 'DRAFT', isRequired: true, contentReference: `development://${code.toLowerCase()}/v1` },
    })
  }
}

async function backfillLegacyProviderClaims() {
  const legacySpecialisms = await prisma.providerSpecialism.findMany({
    include: { providerProfile: { select: { acceptsRemoteWork: true } } },
  })
  for (const legacy of legacySpecialisms) {
    const mapping = await prisma.providerSpecialismTaxonomyMap.findUniqueOrThrow({
      where: { specialismId: legacy.specialismId },
    })
    const capability = await prisma.providerCapability.upsert({
      where: { legacySourceId: legacy.id },
      update: {},
      create: { providerProfileId: legacy.providerProfileId, legacySourceId: legacy.id },
    })
    await prisma.providerCapabilityRevision.upsert({
      where: { providerCapabilityId_version: { providerCapabilityId: capability.id, version: 1 } },
      update: {},
      create: {
        providerCapabilityId: capability.id,
        version: 1,
        specialismTermId: mapping.termId,
        deliveryModes: legacy.providerProfile.acceptsRemoteWork ? ['ON_SITE', 'REMOTE'] : ['ON_SITE'],
        verificationLevel: 'SELF_DECLARED',
      },
    })
    await prisma.providerMigrationAudit.upsert({
      where: {
        migrationCode_sourceType_sourceId: {
          migrationCode: 'MODULE_6A2_LEGACY_BACKFILL_V1',
          sourceType: 'ProviderSpecialism',
          sourceId: legacy.id,
        },
      },
      update: {},
      create: {
        providerProfileId: legacy.providerProfileId,
        migrationCode: 'MODULE_6A2_LEGACY_BACKFILL_V1',
        sourceType: 'ProviderSpecialism',
        sourceId: legacy.id,
        targetType: 'ProviderCapability',
        targetId: capability.id,
        resultCode: 'MIGRATED_SELF_DECLARED',
      },
    })
  }

  const legacySectors = await prisma.providerSector.findMany()
  for (const legacy of legacySectors) {
    const mapping = await prisma.providerSectorTaxonomyMap.findUniqueOrThrow({ where: { sectorId: legacy.sectorId } })
    const experience = await prisma.providerSectorExperience.upsert({
      where: { legacySourceId: legacy.id },
      update: {},
      create: { providerProfileId: legacy.providerProfileId, legacySourceId: legacy.id },
    })
    await prisma.providerSectorExperienceRevision.upsert({
      where: { sectorExperienceId_version: { sectorExperienceId: experience.id, version: 1 } },
      update: {},
      create: {
        sectorExperienceId: experience.id,
        version: 1,
        sectorTermId: mapping.termId,
        experienceYears: legacy.experienceYears,
        verificationLevel: 'SELF_DECLARED',
      },
    })
    await prisma.providerMigrationAudit.upsert({
      where: {
        migrationCode_sourceType_sourceId: {
          migrationCode: 'MODULE_6A2_LEGACY_BACKFILL_V1',
          sourceType: 'ProviderSector',
          sourceId: legacy.id,
        },
      },
      update: {},
      create: {
        providerProfileId: legacy.providerProfileId,
        migrationCode: 'MODULE_6A2_LEGACY_BACKFILL_V1',
        sourceType: 'ProviderSector',
        sourceId: legacy.id,
        targetType: 'ProviderSectorExperience',
        targetId: experience.id,
        resultCode: 'MIGRATED_SELF_DECLARED',
      },
    })
  }

  const legacyCertifications = await prisma.providerCertification.findMany()
  for (const legacy of legacyCertifications) {
    const mapping = await prisma.providerCertificationTaxonomyMap.findUniqueOrThrow({
      where: { certificationId: legacy.certificationId },
    })
    const qualification = await prisma.providerOrganizationQualification.upsert({
      where: { legacySourceId: legacy.id },
      update: {},
      create: { providerProfileId: legacy.providerProfileId, legacySourceId: legacy.id },
    })
    await prisma.providerOrganizationQualificationRevision.upsert({
      where: { qualificationId_version: { qualificationId: qualification.id, version: 1 } },
      update: {},
      create: {
        qualificationId: qualification.id,
        version: 1,
        qualificationTermId: mapping.termId,
        registrationNumber: legacy.certificateNumber,
        issuedAt: legacy.issuedAt,
        validUntil: legacy.expiresAt,
        verificationLevel: 'SELF_DECLARED',
      },
    })
    await prisma.providerMigrationAudit.upsert({
      where: {
        migrationCode_sourceType_sourceId: {
          migrationCode: 'MODULE_6A2_LEGACY_BACKFILL_V1',
          sourceType: 'ProviderCertification',
          sourceId: legacy.id,
        },
      },
      update: {},
      create: {
        providerProfileId: legacy.providerProfileId,
        migrationCode: 'MODULE_6A2_LEGACY_BACKFILL_V1',
        sourceType: 'ProviderCertification',
        sourceId: legacy.id,
        targetType: 'ProviderOrganizationQualification',
        targetId: qualification.id,
        resultCode: 'MIGRATED_SELF_DECLARED',
      },
    })
  }
}

function nullableNumber(value: { toString(): string } | number | null, expected: number | undefined): boolean {
  return value === null ? expected === undefined : Number(value.toString()) === expected
}

function questionMatches(
  actual: {
    key: string
    category: string
    inputType: string
    label: string
    helpText: string | null
    isRequired: boolean
    sortOrder: number
    minLength: number | null
    maxLength: number | null
    minNumber: { toString(): string } | null
    maxNumber: { toString(): string } | null
    minSelections: number | null
    maxSelections: number | null
    options: Array<{ value: string; label: string; sortOrder: number; isActive: boolean; isExclusive: boolean }>
  },
  expected: IntakeQuestionnaireQuestionSeed,
): boolean {
  if (
    actual.key !== expected.key ||
    actual.category !== expected.category ||
    actual.inputType !== expected.inputType ||
    actual.label !== expected.label ||
    actual.helpText !== expected.helpText ||
    actual.isRequired !== expected.isRequired ||
    actual.sortOrder !== expected.sortOrder ||
    actual.minLength !== (expected.minLength ?? null) ||
    actual.maxLength !== (expected.maxLength ?? null) ||
    !nullableNumber(actual.minNumber, expected.minNumber) ||
    !nullableNumber(actual.maxNumber, expected.maxNumber) ||
    actual.minSelections !== (expected.minSelections ?? null) ||
    actual.maxSelections !== (expected.maxSelections ?? null)
  ) {
    return false
  }

  const expectedOptions = expected.options ?? []
  return (
    actual.options.length === expectedOptions.length &&
    expectedOptions.every((option, index) => {
      const stored = actual.options[index]
      return (
        stored?.value === option.value &&
        stored.label === option.label &&
        stored.sortOrder === option.sortOrder &&
        stored.isActive &&
        stored.isExclusive === (option.isExclusive ?? false)
      )
    })
  )
}

async function seedIntakeQuestionnaireV1() {
  const questionnaire = await prisma.intakeQuestionnaire.upsert({
    where: { slug: intakeQuestionnaireV1.slug },
    update: { name: intakeQuestionnaireV1.name, isActive: true },
    create: {
      id: intakeQuestionnaireV1.id,
      slug: intakeQuestionnaireV1.slug,
      name: intakeQuestionnaireV1.name,
      isActive: true,
    },
  })

  const version = await prisma.intakeQuestionnaireVersion.findUnique({
    where: {
      questionnaireId_version: {
        questionnaireId: questionnaire.id,
        version: intakeQuestionnaireV1.version,
      },
    },
    include: {
      questions: {
        orderBy: { sortOrder: 'asc' },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  })

  if (!version) {
    await prisma.$transaction(async (transaction) => {
      await transaction.intakeQuestionnaireVersion.create({
        data: {
          id: intakeQuestionnaireV1.versionId,
          questionnaireId: questionnaire.id,
          version: intakeQuestionnaireV1.version,
          status: 'DRAFT',
        },
      })

      for (const question of intakeQuestionnaireV1.questions) {
        const { options = [], ...questionData } = question
        await transaction.intakeQuestion.create({
          data: {
            ...questionData,
            questionnaireVersionId: intakeQuestionnaireV1.versionId,
            options: {
              create: options.map((option) => ({
                ...option,
                isExclusive: option.isExclusive ?? false,
              })),
            },
          },
        })
      }

      await transaction.intakeQuestionnaireVersion.update({
        where: { id: intakeQuestionnaireV1.versionId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      })
    })
    return
  }

  if (!['PUBLISHED', 'RETIRED'].includes(version.status) || !version.publishedAt) {
    throw new Error('Vraagset versie 1 bestaat, maar is niet gepubliceerd. De seed wijzigt geen bestaande conceptversie.')
  }

  if (
    version.questions.length !== intakeQuestionnaireV1.questions.length ||
    !intakeQuestionnaireV1.questions.every((question, index) => {
      const stored = version.questions[index]
      return stored ? questionMatches(stored, question) : false
    })
  ) {
    throw new Error('De gepubliceerde vraagset versie 1 wijkt af van de seeddefinitie en wordt niet overschreven.')
  }
}

async function main() {
  for (const [slug, name] of sectors) {
    await prisma.sector.upsert({ where: { slug }, update: { name, isActive: true }, create: { slug, name } })
  }

  const specialismIds = new Map<string, string>()

  for (const [slug, name, parentSlug] of specialisms) {
    const parentId = parentSlug ? specialismIds.get(parentSlug) : undefined
    const specialism = await prisma.specialism.upsert({
      where: { slug },
      update: { name, parentId, isActive: true },
      create: { slug, name, parentId },
    })
    specialismIds.set(slug, specialism.id)
  }

  for (const [slug, name] of certifications) {
    await prisma.certification.upsert({
      where: { slug },
      update: { name, isActive: true },
      create: { slug, name },
    })
  }

  await seedIntakeQuestionnaireV1()
  await seedProviderQualificationReferences()
  await backfillLegacyProviderClaims()

  const [sectorCount, specialismCount, certificationCount, questionnaireVersionCount] = await Promise.all([
    prisma.sector.count(),
    prisma.specialism.count(),
    prisma.certification.count(),
    prisma.intakeQuestionnaireVersion.count(),
  ])

  console.info(
    `Seed voltooid: ${sectorCount} sectoren, ${specialismCount} specialismen, ${certificationCount} certificeringstypen en ${questionnaireVersionCount} vraagsetversie(s).`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
