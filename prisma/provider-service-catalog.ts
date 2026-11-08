import { createHash } from 'node:crypto'
import type { PrismaClient } from '../src/generated/prisma/client'

export const providerServiceTerms = [
  ['RISK_ASSESSMENT', 'RI&E'],
  ['OCCUPATIONAL_SAFETY', 'Arbeidsveiligheid'],
  ['ABSENCE_REINTEGRATION', 'Verzuim en re-integratie'],
  ['OCCUPATIONAL_EXPERT_ADVICE', 'Arbeidsdeskundig advies'],
  ['REINTEGRATION_FIRST_TRACK', 'Re-integratie eerste spoor'],
  ['REINTEGRATION_SECOND_TRACK', 'Re-integratie tweede spoor'],
  ['PMO', 'Preventief medisch onderzoek (PMO)'],
  ['PAGO', 'Periodiek arbeidsgezondheidskundig onderzoek (PAGO)'],
  ['OCCUPATIONAL_PHYSICIAN', 'Bedrijfsarts'],
  ['OCCUPATIONAL_HEALTH_SERVICE', 'Arbodienstverlening'],
  ['ERGONOMICS', 'Ergonomie'],
  ['OCCUPATIONAL_HYGIENE', 'Arbeidshygiëne'],
  ['MACHINERY_SAFETY', 'Machineveiligheid'],
  ['INCIDENT_INVESTIGATION', 'Incidentonderzoek'],
  ['EMERGENCY_RESPONSE', 'BHV en ontruiming'],
  ['SAFETY_ADVICE', 'Veiligheidsadvies'],
  ['IMPLEMENTATION_SUPPORT', 'Ondersteuning bij implementatie'],
  ['AUDIT_AND_INSPECTION', 'Audit en inspectie'],
  ['TRAINING', 'Opleiding en training'],
] as const

// Provision only the existing SERVICE v2 catalogue. Never retire or replace a version.
export async function ensureProviderServiceCatalog(prisma: PrismaClient, apply = false) {
  const checksum = createHash('sha256').update(JSON.stringify(providerServiceTerms)).digest('hex')
  return prisma.$transaction(async tx => {
    const existing = await tx.providerTaxonomy.findUnique({
      where: { kind: 'SERVICE' },
      include: { versions: { include: { terms: { orderBy: { sortOrder: 'asc' } } } } },
    })
    if (existing) {
      const published = existing.versions.filter(version => version.status === 'PUBLISHED')
      const version = published[0]
      if (published.length !== 1 || version.version !== 2 || version.checksum !== checksum ||
          version.terms.length !== providerServiceTerms.length || !providerServiceTerms.every(([code, label], index) => {
            const term = version.terms[index]
            return term.code === code && term.label === label && term.isActive && term.sortOrder === index
          })) throw new Error('Afwijkende dienstencatalogus. Controleer de bestaande versies vóór verdere verwerking.')
      return 'ALREADY_PRESENT'
    }
    if (!apply) return 'MISSING'
    await tx.providerTaxonomy.create({ data: {
      kind: 'SERVICE', code: 'SERVICE', name: 'SERVICE',
      versions: { create: { version: 2, status: 'PUBLISHED', checksum, publishedAt: new Date(),
        terms: { create: providerServiceTerms.map(([code, label], sortOrder) => ({ code, label, sortOrder })) },
      } },
    } })
    return 'CREATED'
  }, { isolationLevel: 'Serializable' })
}
