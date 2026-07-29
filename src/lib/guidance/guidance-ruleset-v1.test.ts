import { describe, expect, it } from 'vitest'
import {
  GUIDANCE_RULE_SET_VERSION,
  guidanceRulesV1,
  guidanceTopicCodes,
  selectGuidanceRules,
  toGuidanceRuleReference,
} from './guidance-ruleset-v1'

describe('ADR-021 Guidance ruleset v1', () => {
  it('bevat uitsluitend de vijf voor M7B ondersteunde onderwerpen', () => {
    expect(GUIDANCE_RULE_SET_VERSION).toBe('guidance-rules/1.1.0')
    expect(guidanceRulesV1.map((rule) => rule.when.situationCode)).toEqual([
      guidanceTopicCodes.rie,
      guidanceTopicCodes.incident,
      guidanceTopicCodes.hazardousSubstances,
      guidanceTopicCodes.occupationalHealth,
      guidanceTopicCodes.emergencyResponse,
    ])
  })

  it('selecteert uitsluitend op een exacte situatiecode', () => {
    expect(selectGuidanceRules('RIE')).toHaveLength(1)
    expect(selectGuidanceRules('rie')).toEqual([])
    expect(selectGuidanceRules('Een incident is gebeurd')).toEqual([])
  })

  it('maakt een expliciete, versieerbare regelreferentie', () => {
    expect(toGuidanceRuleReference(guidanceRulesV1[0])).toEqual({
      code: 'GUIDANCE_RIE',
      version: '1.0.0',
    })
  })
})
