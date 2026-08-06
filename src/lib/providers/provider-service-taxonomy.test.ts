import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const requiredServices = [
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
] as const

describe('dienstentaxonomie versie 2', () => {
  it('publiceert de vereiste centrale diensten zonder gepubliceerde versie 1 te overschrijven', () => {
    const seed = readFileSync(join(process.cwd(), 'prisma', 'seed.ts'), 'utf8')
    const migration = readFileSync(join(process.cwd(), 'prisma', 'migrations', '20260802140000_expand_provider_service_taxonomy', 'migration.sql'), 'utf8')

    for (const [code, label] of requiredServices) {
      expect(seed).toContain(`['${code}', '${label}']`)
      expect(migration).toContain(`('${code}', '${label}'`)
    }
    expect(seed).toContain("['IMPLEMENTATION_SUPPORT', 'Ondersteuning bij implementatie']")
    expect(seed).not.toContain("['IMPLEMENTATION_SUPPORT', 'Implementatieondersteuning']")
    expect(migration).toContain('"version" = 2')
    expect(migration).toContain('"status" = \'RETIRED\'')
    expect(migration.indexOf('UPDATE "ProviderTaxonomyVersion"')).toBeLessThan(migration.indexOf('INSERT INTO "ProviderTaxonomyVersion"'))
  })
})
