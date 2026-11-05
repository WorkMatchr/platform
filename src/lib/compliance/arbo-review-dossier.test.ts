import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'))
describe('Arbo reviewdossier: volledige dekking zonder juridische vrijgave', () => {
  it('behoudt alle bestaande claimidentiteiten, vragen, regels en negen holds', () => {
    const review = read('docs/compliance/arbo-compliance-knowledge-review.json')
    const original = read('docs/compliance-f4-legal-matrix.json')
    const claims = read('docs/compliance-f4-claim-review.json')
    const keys = (items: Record<string, string>[], key: string) => items.map(item => item[key]).sort()
    expect(keys(review.claims, 'externalKey')).toEqual(keys(claims.claims, 'externalKey'))
    expect(keys(review.questions, 'code')).toEqual(keys(original.questions, 'code'))
    expect(keys(review.rules, 'code')).toEqual(keys(original.rules, 'code'))
    expect(review.rules).toHaveLength(141)
    expect(review.holds).toHaveLength(9)
    for (const item of review.rules) {
      expect(item.templateChecksum).toBe(original.rules.find((rule: { code: string }) => rule.code === item.code).templateChecksum)
      expect(item.boundRuleChecksum).toBeNull()
      expect(item.legalConclusionSupported).toBe(false)
      expect(item.humanAcceptance).toBe('PENDING HUMAN ACCEPTANCE')
    }
    expect(review.holds.every((hold: { status: string }) => hold.status === 'NOT_ASSESSED')).toBe(true)
    expect(review.sources.every((source: { legalApproval: boolean; sourceVersionId: string | null }) => !source.legalApproval && source.sourceVersionId === null)).toBe(true)
    expect(review.decision).toBe('NO_GO_FOR_PUBLICATION')
  })
})
