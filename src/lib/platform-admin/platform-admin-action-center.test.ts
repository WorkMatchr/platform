import { describe, expect, it } from 'vitest'
import {
  getPlatformActionCategory,
  getPlatformActionLabel,
  isOpenPlatformActionStatus,
  platformActionStatusLabels,
  platformSignalAuditId,
} from './platform-admin-action-center'

describe('platformbeheeractiecentrum', () => {
  it('vertaalt WOS-regels naar begrijpelijke categorieën en acties', () => {
    expect(getPlatformActionCategory('ACCOUNT_WITHOUT_VALID_CONTEXT')).toBe('Gebruikers')
    expect(getPlatformActionCategory('ORGANIZATION_WITHOUT_ACTIVE_OWNER')).toBe('Governance')
    expect(getPlatformActionCategory('REVIEW_WAITING_LONGER_THAN_SEVEN_DAYS')).toBe('Reviews')
    expect(getPlatformActionCategory('APPROVAL_QUEUE_ITEM')).toBe('Goedkeuringen')
    expect(getPlatformActionLabel('PROVIDER_MISSING_REQUIRED_VERIFICATION')).toBe('Open dossier')
    expect(getPlatformActionLabel('ORGANIZATION_WITHOUT_ACTIVE_OWNER')).toBe('Handel af')
  })

  it('maakt voor hetzelfde signaal steeds dezelfde geldige UUID-auditreferentie', () => {
    const first = platformSignalAuditId('organization-owner:organization-1')
    const second = platformSignalAuditId('organization-owner:organization-1')

    expect(second).toBe(first)
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('houdt alleen niet-terminale statussen in de open werkvoorraad', () => {
    expect(isOpenPlatformActionStatus('NEW')).toBe(true)
    expect(isOpenPlatformActionStatus('WAITING_FOR_ORGANIZATION')).toBe(true)
    expect(isOpenPlatformActionStatus('COMPLETED')).toBe(false)
    expect(isOpenPlatformActionStatus('CLOSED')).toBe(false)
    expect(platformActionStatusLabels.IN_PROGRESS).toBe('In behandeling')
  })
})
