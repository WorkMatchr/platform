import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { detectKnowledgeSourceKind, inventoryKnowledgeSourceDirectory, knowledgeSourceManifestSchema, loadKnowledgeSourceManifest, mapSourceKindToType, resolveManifestSourceKind, verifyManifestSource } from './knowledge-source-manifest'

describe('generiek kennisbronmanifest', () => {
  it.each([
    ['ai-bladen/AI-01 Arbo- en verzuimbeleid.pdf', 'AI_SHEET', 'AI_SHEET'],
    ['legislation/arbowet/Arbowet.pdf', 'ARBO_WET', 'LEGISLATION'],
    ['legislation/arbobesluit/Arbobesluit.pdf', 'ARBO_DECREE', 'REGULATION'],
    ['legislation/arboregeling/Arboregeling.pdf', 'ARBO_REGULATION', 'REGULATION'],
    ['legislation/toekomstige-wet/bron.pdf', 'LEGISLATION', 'LEGISLATION'],
    ['arbocatalogi/Arbocatalogus Bouw.pdf', 'ARBOCATALOGUE', 'ARBOCATALOGUE'],
    ['beleidsregels/Beleidsregel boeteoplegging.pdf', 'POLICY_RULE', 'REGULATION'],
    ['inspectie/Nederlandse Arbeidsinspectie jaarplan.pdf', 'LABOUR_INSPECTORATE_PUBLICATION', 'INSPECTORATE_GUIDANCE'],
    ['tno/fysieke-belasting/TNO rapport.pdf', 'TNO_PUBLICATION', 'RESEARCH'],
    ['jurisprudentie/uitspraken/uitspraak.pdf', 'JURISPRUDENCE', 'CASE_LAW'],
    ['knowledge/algemeen/achtergrond.pdf', 'KNOWLEDGE', 'OTHER'],
    ['normen/metadata/NEN-verwijzing.pdf', 'STANDARD', 'STANDARD'],
    ['rivm/onderzoek/publicatie.pdf', 'RIVM_PUBLICATION', 'RESEARCH'],
    ['ser/adviezen/advies.pdf', 'SER_PUBLICATION', 'PROFESSIONAL_GUIDANCE'],
  ] as const)('herkent %s als %s', (logicalPath, kind, sourceType) => {
    expect(detectKnowledgeSourceKind(logicalPath)).toBe(kind)
    expect(mapSourceKindToType(kind)).toBe(sourceType)
  })

  it('weigert onbekende top-level bronmappen fail-closed', () => {
    expect(detectKnowledgeSourceKind('onbekend/bron.pdf')).toBeNull()
    expect(detectKnowledgeSourceKind('downloads/archief/bron.pdf')).toBeNull()
    expect(() => resolveManifestSourceKind({
      code: 'ONBEKEND-01',
      sourceKind: 'KNOWLEDGE',
      logicalPath: 'onbekend/bron.pdf',
    })).toThrow('ondersteunde bronmap')
  })

  it('weigert een bronsoort die het logische pad tegenspreekt', () => {
    expect(() => resolveManifestSourceKind({
      code: 'RIVM-01',
      sourceKind: 'SER_PUBLICATION',
      logicalPath: 'rivm/publicatie.pdf',
    })).toThrow('spreekt het logische bronpad tegen')
  })

  it('accepteert geneste logische paden en weigert absolute of ontsnappende paden', () => {
    const base = { schemaVersion: '2.0', sources: [{ code: 'ARBOWET-2026', sourceKind: 'ARBO_WET', sourceType: 'LEGISLATION', format: 'PDF', logicalPath: 'legislation/arbowet/arbowet.pdf', sha256: 'a'.repeat(64) }] }
    expect(knowledgeSourceManifestSchema.safeParse(base).success).toBe(true)
    expect(knowledgeSourceManifestSchema.safeParse({ ...base, sources: [{ ...base.sources[0], logicalPath: '../arbowet.pdf' }] }).success).toBe(false)
    expect(knowledgeSourceManifestSchema.safeParse({ ...base, sources: [{ ...base.sources[0], logicalPath: 'C:\\bronnen\\arbowet.pdf' }] }).success).toBe(false)
    expect(knowledgeSourceManifestSchema.safeParse({ schemaVersion: '2.0', sources: [{ code: 'ARBOWET-2026', format: 'PDF', logicalPath: 'wetgeving/arbowet.pdf', sha256: 'a'.repeat(64) }] }).success).toBe(false)
  })
})

describe.runIf(existsSync('local-sources/knowledge/knowledge-sources.local.json'))('lokaal kennisbronmanifest', () => {
  it('verifieert alle daadwerkelijk geconfigureerde PDF-bronnen', async () => {
    const manifest = await loadKnowledgeSourceManifest()
    expect(manifest.sources.length).toBeGreaterThan(0)
    expect(new Set(manifest.sources.map((source) => source.code)).size).toBe(manifest.sources.length)
    for (const source of manifest.sources) await expect(verifyManifestSource(source)).resolves.toMatchObject({ code: source.code, extractionStatus: 'READY' })
  })

  it('inventariseert PDF en legacy DOC zonder vaste lokale aantallen te veronderstellen', async () => {
    const manifest = await loadKnowledgeSourceManifest()
    const inventory = await inventoryKnowledgeSourceDirectory()
    expect(inventory.pdfCount).toBeGreaterThanOrEqual(manifest.sources.filter((source) => source.format === 'PDF').length)
    expect(inventory.legacyDocCount).toBeGreaterThanOrEqual(0)
    expect(inventory.sources).toHaveLength(inventory.pdfCount + inventory.legacyDocCount)
  })
})
