import 'dotenv/config'
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
