import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

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

  const [sectorCount, specialismCount, certificationCount] = await Promise.all([
    prisma.sector.count(),
    prisma.specialism.count(),
    prisma.certification.count(),
  ])

  console.info(`Seed voltooid: ${sectorCount} sectoren, ${specialismCount} specialismen, ${certificationCount} certificeringstypen.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
