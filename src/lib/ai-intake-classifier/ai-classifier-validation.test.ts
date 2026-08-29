import { describe, expect, it } from 'vitest'
import {
  AI_CLASSIFIER_OUTPUT_JSON_SCHEMA,
  parseAIClassifierOutput,
} from './ai-classifier-validation'
import { emptyCaseUnderstanding } from './case-understanding-contract'

describe('AI Intake Classifier-outputvalidatie', () => {
  it('accepteert uitsluitend het vaste structured-outputcontract', () => {
    const output = parseAIClassifierOutput({
      summary: 'De ondernemer wil weten hoe een RI&E past bij de situatie.',
      primarySubject: 'RIE',
      secondarySubjects: ['OCCUPATIONAL_HEALTH'],
      confidence: 'HIGH',
      alternatives: ['INCIDENT'],
    })

    expect(output).toEqual({
      summary: 'De ondernemer wil weten hoe een RI&E past bij de situatie.',
      primarySubject: 'RIE',
      secondarySubjects: ['OCCUPATIONAL_HEALTH'],
      confidence: 'HIGH',
      alternatives: ['INCIDENT'],
    })
    expect(Object.isFrozen(output)).toBe(true)
    expect(Object.isFrozen(output.secondarySubjects)).toBe(true)
  })

  it('weigert onbekende onderwerpen en extra velden', () => {
    expect(() =>
      parseAIClassifierOutput({
        summary: 'De ondernemer stelt een vraag over de werksituatie.',
        primarySubject: 'LEGAL_ADVICE',
        secondarySubjects: [],
        confidence: 'HIGH',
        alternatives: [],
      }),
    ).toThrow()

    expect(() =>
      parseAIClassifierOutput({
        summary: 'De ondernemer stelt een vraag over de werksituatie.',
        primarySubject: 'UNKNOWN',
        secondarySubjects: [],
        confidence: 'LOW',
        alternatives: [],
        advice: 'Niet toegestaan',
      }),
    ).toThrow()
  })

  it('weigert dubbele onderwerpen in lijsten', () => {
    expect(() =>
      parseAIClassifierOutput({
        summary: 'De ondernemer meldt een incident op de werkvloer.',
        primarySubject: 'INCIDENT',
        secondarySubjects: ['RIE', 'RIE'],
        confidence: 'MEDIUM',
        alternatives: [],
      }),
    ).toThrow()
  })

  it('gebruikt uitsluitend door OpenAI ondersteunde array-eigenschappen', () => {
    const serializedSchema = JSON.stringify(
      AI_CLASSIFIER_OUTPUT_JSON_SCHEMA,
    )

    expect(serializedSchema).not.toContain('uniqueItems')
    expect(
      AI_CLASSIFIER_OUTPUT_JSON_SCHEMA.properties.secondarySubjects,
    ).toMatchObject({ type: 'array', maxItems: 5 })
    expect(
      AI_CLASSIFIER_OUTPUT_JSON_SCHEMA.properties.alternatives,
    ).toMatchObject({ type: 'array', maxItems: 5 })
    expect(AI_CLASSIFIER_OUTPUT_JSON_SCHEMA.properties.summary).toEqual({
      type: 'string',
    })
    expect(AI_CLASSIFIER_OUTPUT_JSON_SCHEMA.required).toContain('caseUnderstanding')
    expect(AI_CLASSIFIER_OUTPUT_JSON_SCHEMA.properties.caseUnderstanding).toMatchObject({
      type: 'object',
      additionalProperties: false,
    })
  })

  it('behoudt hypotheses expliciet en promoveert ze niet tot feiten', () => {
    const output = parseAIClassifierOutput({
      summary: 'U wilt weten welke ondersteuning past bij een gemeld signaal.',
      primarySubject: 'UNKNOWN', secondarySubjects: [], confidence: 'MEDIUM', alternatives: [],
      caseUnderstanding: {
        ...emptyCaseUnderstanding(),
        recentChanges: {
          value: ['De installatieveroudering veroorzaakt de lekkage'],
          evidence: ['De technische dienst vermoedt veroudering'],
          confidence: 0.55,
          status: 'HYPOTHESIS',
        },
      },
    })
    expect(output.caseUnderstanding?.recentChanges.status).toBe('HYPOTHESIS')
  })

  it('weigert een ontbrekende, lege of te lange samenvatting server-side', () => {
    const base = {
      primarySubject: 'INCIDENT',
      secondarySubjects: [],
      confidence: 'HIGH',
      alternatives: [],
    }

    expect(() => parseAIClassifierOutput(base)).toThrow()
    expect(() => parseAIClassifierOutput({ ...base, summary: 'kort' })).toThrow()
    expect(() =>
      parseAIClassifierOutput({ ...base, summary: 'a'.repeat(301) }),
    ).toThrow()
  })
})
