import { describe, expect, it } from 'vitest'
import ai01 from '../../../data/knowledge/poc/AI-01.v1.json'
import { fingerprintKnowledgeImportPackage } from './knowledge-import-fingerprint'
import { validateKnowledgeImport } from './knowledge-import-validation'

function packageFrom(input: unknown) {
  const validation = validateKnowledgeImport(input)
  if (!validation.package) throw new Error(`Ongeldige testfixture: ${JSON.stringify(validation.issues)}`)
  return validation.package
}

function changed(mutator: (input: Record<string, unknown>) => void) {
  const input = structuredClone(ai01) as Record<string, unknown>
  mutator(input)
  return fingerprintKnowledgeImportPackage(packageFrom(input))
}

describe('Knowledge-importfingerprint', () => {
  const original = fingerprintKnowledgeImportPackage(packageFrom(ai01))

  it('is deterministisch voor identieke invoer', () => {
    expect(fingerprintKnowledgeImportPackage(packageFrom(structuredClone(ai01)))).toBe(original)
  })

  it.each([
    ['claimtekst', (input: Record<string, unknown>) => { (input.claims as Array<Record<string, unknown>>)[0].statement = 'Inhoudelijk gewijzigde claim.' }],
    ['claimtype', (input: Record<string, unknown>) => { (input.claims as Array<Record<string, unknown>>)[0].claimType = 'OTHER' }],
    ['claimrisico', (input: Record<string, unknown>) => { (input.claims as Array<Record<string, unknown>>)[0].controlRisk = 'HIGH' }],
    ['pagina', (input: Record<string, unknown>) => { (input.fragments as Array<Record<string, unknown>>)[0].pageFrom = 8 }],
    ['sectie', (input: Record<string, unknown>) => { (input.fragments as Array<Record<string, unknown>>)[0].sectionPath = 'Andere sectie' }],
    ['bronfragment', (input: Record<string, unknown>) => { (input.fragments as Array<Record<string, unknown>>)[0].internalExcerpt = 'Een gecontroleerd kort bronfragment.' }],
    ['citatie', (input: Record<string, unknown>) => { (input.citations as Array<Record<string, unknown>>)[0].supportType = 'CONTEXT' }],
    ['bronidentificatie', (input: Record<string, unknown>) => { (input.source as Record<string, unknown>).title = 'Andere brontitel' }],
    ['bronmetadata', (input: Record<string, unknown>) => { (input.source as Record<string, unknown>).notes = 'Inhoudelijk gewijzigde bronmetadata.' }],
    ['bronversiemetadata', (input: Record<string, unknown>) => { delete (input.sourceVersion as Record<string, unknown>).publicationDate }],
  ] as const)('detecteert gewijzigde %s bij gelijke aantallen', (_label, mutate) => {
    expect(changed(mutate)).not.toBe(original)
  })

  it('is onafhankelijk van de volgorde van claims, fragmenten en citaties', () => {
    const reordered = structuredClone(ai01) as Record<string, unknown>
    reordered.claims = (reordered.claims as unknown[]).toReversed()
    reordered.fragments = (reordered.fragments as unknown[]).toReversed()
    reordered.citations = (reordered.citations as unknown[]).toReversed()
    expect(fingerprintKnowledgeImportPackage(packageFrom(reordered))).toBe(original)
  })

  it('onderscheidt zowel risicoverhoging als risicoverlaging', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    input.schemaVersion = '1.1'
    for (const claim of input.claims as Array<Record<string, unknown>>) claim.controlRisk = 'HIGH'
    const high = fingerprintKnowledgeImportPackage(packageFrom(input))
    ;((input.claims as Array<Record<string, unknown>>)[0]).controlRisk = 'MEDIUM'
    expect(fingerprintKnowledgeImportPackage(packageFrom(input))).not.toBe(high)
  })
})
