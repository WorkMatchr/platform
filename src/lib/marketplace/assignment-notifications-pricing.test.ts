import { describe, expect, it } from 'vitest'
import { resolveAssignmentPrice, readInvitationPrice, pricingExpertises, zeroExpertiseAdjustments } from './assignment-pricing'
import { marketplaceRuleSetInputSchema, INITIAL_MARKETPLACE_RULES } from './marketplace-rules-contract'
import { toAssignmentPreview, invitationMatchFromFactors } from './assignment-purchase-preview'
import { parseEmailRetryAfter } from '@/lib/email'
import { renderAssignmentEmail } from './assignment-email'
import { evaluateRequestedExpertises } from './matching-expertise'

const rule = { id: 'a9b57c86-4de6-4c98-a583-e99f583c806b', version: '2027.1', participationPriceCredits: 25, minimumParticipationPrice: 5, expertiseAdjustments: zeroExpertiseAdjustments }
const now = new Date('2027-01-01T00:00:00Z')
const code = 'hogere-veiligheidskundige'

describe('versioned invitation pricing', () => {
  it('supports all and only the canonical twenty with a managed global price', () => {
    expect(pricingExpertises).toHaveLength(20)
    for (const expertise of pricingExpertises) expect(resolveAssignmentPrice(rule, expertise.code, now).resolvedPrice).toBe(25)
    expect(marketplaceRuleSetInputSchema.safeParse({ ...INITIAL_MARKETPLACE_RULES, version: rule.version, validFrom: now, participationPriceCredits: 25, minimumParticipationPrice: 5, changeReason: 'Test leerprijs configureren', confirmed: true }).success).toBe(true)
    expect(() => resolveAssignmentPrice(rule, 'unknown', now)).toThrow()
    expect(() => resolveAssignmentPrice({ ...rule, expertiseAdjustments: { alien: 3 } }, code, now)).toThrow()
  })
  it.each([[5, 30], [0, 25], [-5, 20], [-100, 5]])('applies adjustment %s with minimum', (adjustment, expected) => {
    expect(resolveAssignmentPrice({ ...rule, expertiseAdjustments: { [code]: adjustment } }, code, now).resolvedPrice).toBe(expected)
  })
  it('prices only primary, independent of additional expertise', () => {
    expect(resolveAssignmentPrice({ ...rule, expertiseAdjustments: { ergonoom: 30 } }, 'bedrijfsarts', now).resolvedPrice).toBe(25)
  })
  it('retains historical price and refuses inconsistent snapshots', () => {
    const priceSnapshot = resolveAssignmentPrice(rule, code, now)
    const invitation = { snapshot: { priceSnapshot }, creditCost: 25 }
    expect(resolveAssignmentPrice({ ...rule, participationPriceCredits: 27 }, code, now).resolvedPrice).toBe(27)
    expect(readInvitationPrice(invitation).credits).toBe(25)
    expect(() => readInvitationPrice({ ...invitation, creditCost: 27 })).toThrow()
    expect(() => readInvitationPrice({ snapshot: { priceSnapshot: {} }, creditCost: 25 })).toThrow()
    expect(readInvitationPrice({ snapshot: {}, creditCost: 19 })).toEqual({ credits: 19, marketplaceRuleSetId: null, priceSnapshot: null })
  })
  it.each([1.5, NaN, Infinity])('refuses non-integer pricing %s', amount => {
    expect(() => resolveAssignmentPrice({ ...rule, participationPriceCredits: amount }, code, now)).toThrow()
  })
})

const unsafe = 'Klant Geheim BV / project Apollo, Jan Jansen, test@example.invalid, 0612345678, https://secret.invalid, Kerkstraat 18'
const source = { id: '98a39194-43f5-4f09-a573-3b0fc1a53582', title: unsafe, primarySpecialism: { name: unsafe }, sector: { name: unsafe }, employeeCount: null, desiredStartDate: null, responseDeadline: now, locationCity: unsafe, locationProvince: unsafe, locationRegion: unsafe, locationCount: null, allowsRemoteWork: false, maxSelections: 3 }
const invitationId = '1e037df6-c9b0-4e1f-b101-082ee2bbd190'
describe('safe preview and email', () => {
  it('excludes all raw user content, contact data, titles and addresses', () => {
    const preview = toAssignmentPreview(source, 30, { primaryExpertiseCode: code, recipientExpertise: code, matchType: 'PRIMARY' })
    const email = renderAssignmentEmail({ schemaVersion: 2, invitationId, preview }, 'recipient@example.invalid', 'https://workmatchr.test', 'stable-key')
    for (const value of ['Geheim', 'Apollo', 'Jansen', 'test@example.invalid', '0612345678', 'secret.invalid', 'Kerkstraat']) expect(JSON.stringify({ preview, email })).not.toContain(value)
    expect(email.text).toContain('30 credits')
    expect(email.html).toContain(`/uitnodigingen/${invitationId}`)
    expect(email.text).toContain('Bekijk de gratis preview')
    expect(email.html).not.toContain('checkout')
  })
  it('uses PRIMARY precedence without duplicate expertise notifications', () => {
    const result = evaluateRequestedExpertises({ assignmentId: 'assignment', capabilityCode: 'bedrijfsarts', sectorCode: null, regionCode: 'UTRECHT', allowsRemoteWork: false }, ['ergonoom'], {
      providerProfileId: 'provider', capabilities: ['bedrijfsarts', 'ergonoom'].map(specialismCode => ({ serviceCode: 'ADVICE', specialismCode, deliveryModes: ['ON_SITE'] })), sectors: [], workAreas: [{ regionCode: 'NATIONWIDE' }],
    })
    expect(invitationMatchFromFactors('bedrijfsarts', { factors: result.factors })).toEqual({ primaryExpertiseCode: 'bedrijfsarts', recipientExpertise: 'bedrijfsarts', matchType: 'PRIMARY' })
  })
  it('shows only the relevant additional expertise and preserves primary pricing', () => {
    const preview = toAssignmentPreview(source, 25, { primaryExpertiseCode: 'bedrijfsarts', recipientExpertise: 'ergonoom', matchType: 'ADDITIONAL' })
    expect(preview.additionalExpertises).toEqual(['Ergonoom'])
    const email = renderAssignmentEmail({ schemaVersion: 2, invitationId, preview }, 'recipient@example.invalid', 'https://workmatchr.test', 'stable-key')
    expect(email.subject).toBe('Nieuwe opdracht mogelijk relevant voor Ergonoom | WorkMatchr')
    expect(email.text).toContain('Bedrijfsarts')
    expect(email.text).toContain('25 credits')
    expect(email.text).toContain('Ergonoom — aanvullend')
  })
  it('refuses historical unsafe email payloads and unsafe origin URLs', () => {
    const preview = toAssignmentPreview(source, 25)
    expect(() => renderAssignmentEmail({ invitationId, preview }, 'test@example.invalid', 'https://workmatchr.test', 'key')).toThrow()
    expect(() => renderAssignmentEmail({ schemaVersion: 2, invitationId, preview }, 'test@example.invalid', 'javascript:alert(1)', 'key')).toThrow()
  })
})

it('respects numeric and HTTP-date Retry-After without echoing provider errors', () => {
  expect(parseEmailRetryAfter('120', 0)).toBe(120000)
  expect(parseEmailRetryAfter('Thu, 01 Jan 1970 00:02:00 GMT', 0)).toBe(120000)
  expect(parseEmailRetryAfter('invalid', 0)).toBe(null)
})
