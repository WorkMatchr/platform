import { describe, expect, it } from 'vitest'
import ai01 from '../../../data/knowledge/poc/AI-01.v1.json'
import { validateKnowledgeImport } from './knowledge-import-validation'

describe('Knowledge-importvalidatie', () => {
  it.each([
    ['AI-01', 'AI_SHEET'],
    ['ARBOWET-2026', 'LEGISLATION'],
    ['ARBOBESLUIT-2026', 'REGULATION'],
    ['ARBOREGELING-2026', 'REGULATION'],
    ['ARBOCAT-BOUW-2026', 'ARBOCATALOGUE'],
    ['BELEIDSREGEL-2026', 'REGULATION'],
    ['NLA-WERKINSTRUCTIE-2026', 'INSPECTORATE_GUIDANCE'],
    ['TNO-RAPPORT-2026', 'RESEARCH'],
  ] as const)('accepteert een conceptpakket voor %s', (code, sourceType) => {
    const input = structuredClone(ai01) as Record<string, unknown>
    const source = input.source as Record<string, unknown>
    source.code = code
    source.sourceType = sourceType
    source.metadataStatus = 'COMPLETE'
    source.applicabilityScope = 'Werkgevers en werknemers in Nederland'
    const result = validateKnowledgeImport(input)
    expect(result.valid).toBe(true)
  })

  it('accepteert het historische AI-01-conceptpakket', () => {
    const result = validateKnowledgeImport(ai01)
    expect(result.valid).toBe(true)
    expect(result.counts.claims).toBe(8)
    expect(result.package?.claims.every((claim) => claim.controlRisk === 'CRITICAL')).toBe(true)
  })

  it('vereist vanaf contract 1.1 een expliciet geldig claimrisico', () => {
    const missing = structuredClone(ai01) as Record<string, unknown>
    missing.schemaVersion = '1.1'
    expect(validateKnowledgeImport(missing).issues).toContainEqual(expect.objectContaining({
      code: 'SCHEMA_INVALID',
      path: 'claims.0.controlRisk',
    }))

    const invalid = structuredClone(missing) as Record<string, unknown>
    ;((invalid.claims as Array<Record<string, unknown>>)[0]).controlRisk = 'ONBEKEND'
    expect(validateKnowledgeImport(invalid).valid).toBe(false)
  })

  it('accepteert alle bestaande expliciete controlRisk-waarden in contract 1.1', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    input.schemaVersion = '1.1'
    const risks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    ;(input.claims as Array<Record<string, unknown>>).forEach((claim, index) => {
      claim.controlRisk = risks[index % risks.length]
    })
    expect(validateKnowledgeImport(input).valid).toBe(true)
  })

  it('weigert directe publicatie', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    ;((input.claims as Array<Record<string, unknown>>)[0]).publicationStatus = 'PUBLISHED'
    const result = validateKnowledgeImport(input)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'SCHEMA_INVALID')).toBe(true)
  })

  it('weigert historische bronnen die actuele claims produceren', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    ;((input.claims as Array<Record<string, unknown>>)[0]).temporalStatus = 'CURRENT'
    const result = validateKnowledgeImport(input)
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'HISTORICAL_AS_CURRENT' }))
  })

  it('vereist expliciete onzekerheden voor onvolledige metadata', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    ;(input.source as Record<string, unknown>).metadataStatus = 'INCOMPLETE'
    ;(input.importMetadata as Record<string, unknown>).uncertainties = []
    const result = validateKnowledgeImport(input)
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'METADATA_UNCERTAINTY_UNEXPLAINED' }))
  })

  it('vereist voor iedere conceptclaim een herleidbaar fragment met pagina of sectie', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    ;((input.citations as Array<Record<string, unknown>>)[0]).fragmentKey = undefined
    const result = validateKnowledgeImport(input)
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_FRAGMENT' }))
  })

  it('weigert een claim zonder concrete fragmentcitatie', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    ;(input.citations as Array<Record<string, unknown>>).splice(0, 1)
    const result = validateKnowledgeImport(input)
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'CLAIM_SOURCE_REQUIRED', path: 'ai-01:c1' }))
  })

  it('weigert te lange interne fragmenten en onbekende citaties', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    ;((input.fragments as Array<Record<string, unknown>>)[0]).internalExcerpt = 'x'.repeat(501)
    ;((input.citations as Array<Record<string, unknown>>)[1]).fragmentKey = 'ai-01:onbekend'
    const result = validateKnowledgeImport(input)
    expect(result.valid).toBe(false)
  })

  it('weigert een fragmentfingerprint die niet bij het bronfragment hoort', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    Object.assign((input.fragments as Array<Record<string, unknown>>)[0], {
      internalExcerpt: 'Controleerbaar bronfragment.',
      excerptHash: '0'.repeat(64),
    })
    const result = validateKnowledgeImport(input)
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'EXCERPT_HASH_MISMATCH',
      path: 'ai-01:f1',
    }))
  })

  it('detecteert dubbele claims en onveilige declaratieve sleutels', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    const claims = input.claims as Array<Record<string, unknown>>
    claims[1].statement = claims[0].statement
    input.rules = [{
      code: 'UNSAFE_RULE', title: 'Onveilig', description: 'Test', ruleType: 'DECISION_RULE', ruleVersion: 1,
      inputSchema: {}, expression: { execute: true }, outputSchema: {}, publicationStatus: 'DRAFT',
    }]
    const result = validateKnowledgeImport(input)
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'DUPLICATE_CLAIM' }),
      expect.objectContaining({ code: 'UNSAFE_JSON_KEY' }),
    ]))
  })

  it('houdt het TypeScript-contract synchroon met het formele schema', async () => {
    const schema = (await import('../../../data/knowledge/schema/knowledge-import.v1.schema.json')).default
    expect(schema.properties.schemaVersion.enum).toEqual(['1.0', '1.1'])
    expect(schema.required).toEqual(expect.arrayContaining(['source', 'claims', 'citations', 'importMetadata']))
    expect(schema.$defs.fragment.properties.internalExcerpt.maxLength).toBe(500)
    expect(schema.$defs.claim.properties.publicationStatus.const).toBe('DRAFT')
    expect(schema.$defs.claim.properties.controlRisk.enum).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  })
})
