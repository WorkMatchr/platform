import { expect, it } from 'vitest'
import { evaluateRequestedExpertises } from './matching-expertise'
import { toAssignmentPreview } from './assignment-purchase-preview'

const assignment = { assignmentId: 'request', capabilityCode: 'hogere-veiligheidskundige', sectorCode: null, regionCode: 'UTRECHT', allowsRemoteWork: false }
const provider = (code: string) => ({ providerProfileId: 'provider', capabilities: [{ serviceCode: 'SAFETY_ADVICE', specialismCode: code, deliveryModes: ['ON_SITE'] }], sectors: [], workAreas: [{ regionCode: 'NATIONWIDE' }] })
it('keeps primary and explicit additional matches distinct', () => {
  const primary = evaluateRequestedExpertises(assignment, ['middelbare-veiligheidskundige'], provider('hogere-veiligheidskundige'))
  expect(primary.status).toBe('ELIGIBLE')
  expect(primary.factors.at(-1)?.key).toBe('PRIMARY_EXPERTISE')
  const additional = evaluateRequestedExpertises(assignment, ['middelbare-veiligheidskundige'], provider('middelbare-veiligheidskundige'))
  expect(additional.status).toBe('ELIGIBLE')
  expect(additional.factors.at(-1)?.key).toBe('ADDITIONAL_EXPERTISE')
  expect(evaluateRequestedExpertises(assignment, [], provider('middelbare-veiligheidskundige')).status).toBe('EXCLUDED')
  expect(evaluateRequestedExpertises(assignment, ['middelbare-veiligheidskundige'], provider('bedrijfsarts')).status).toBe('EXCLUDED')
})
it('presents canonical identity and additional references without internal ID or client data', () => {
  const preview = toAssignmentPreview({ id: 'internal', requestId: 'external', title: 'Veilig werken', primarySpecialism: { name: 'HVK' },
    specialisms: [{ isRequired: true, specialism: { name: 'HVK' } }, { isRequired: false, specialism: { name: 'MVK' } }],
    employeeCount: null, desiredStartDate: null, responseDeadline: null, locationCity: null, locationProvince: null, locationRegion: null, locationCount: null, allowsRemoteWork: false, maxSelections: 3 }, 27, { primaryExpertiseCode: 'hogere-veiligheidskundige', matchType: 'ADDITIONAL', recipientExpertise: 'middelbare-veiligheidskundige' })
  expect(preview.assignmentId).toBe('external')
  expect(preview.expertise).toBe('Hogere veiligheidskundige (HVK)')
  expect(preview.additionalExpertises).toEqual(['Middelbare veiligheidskundige (MVK)'])
  expect(JSON.stringify(preview)).not.toContain('internal')
})
