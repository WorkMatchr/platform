import { describe, expect, it } from 'vitest'
import ai01 from '../../../data/knowledge/poc/AI-01.v1.json'
import { validateKnowledgeImport } from './knowledge-import-validation'

describe('Knowledge-importvalidatie', () => {
  it('accepteert het historische AI-01-conceptpakket', () => {
    const result = validateKnowledgeImport(ai01)
    expect(result.valid).toBe(true)
    expect(result.counts.claims).toBe(8)
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

  it('weigert te lange interne fragmenten en onbekende citaties', () => {
    const input = structuredClone(ai01) as Record<string, unknown>
    ;((input.fragments as Array<Record<string, unknown>>)[0]).internalExcerpt = 'x'.repeat(501)
    ;((input.citations as Array<Record<string, unknown>>)[1]).fragmentKey = 'ai-01:onbekend'
    const result = validateKnowledgeImport(input)
    expect(result.valid).toBe(false)
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
    expect(schema.properties.schemaVersion.const).toBe('1.0')
    expect(schema.required).toEqual(expect.arrayContaining(['source', 'claims', 'citations', 'importMetadata']))
    expect(schema.$defs.fragment.properties.internalExcerpt.maxLength).toBe(500)
    expect(schema.$defs.claim.properties.publicationStatus.const).toBe('DRAFT')
  })
})
