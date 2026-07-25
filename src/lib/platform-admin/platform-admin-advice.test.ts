import { describe, expect, it } from 'vitest'
import {
  buildPlatformAdviceSignals,
  derivePlatformStatus,
  getDutchGreeting,
  selectCoreKpis,
  selectVisibleQueues,
  type PlatformAdminAdviceInput,
} from './platform-admin-advice'

const at = new Date('2026-07-25T10:00:00.000Z')

function emptyInput(overrides: Partial<PlatformAdminAdviceInput> = {}): PlatformAdminAdviceInput {
  return {
    at,
    platformConfigurationValid: true,
    organizationsWithoutActiveOwner: [],
    accountsWithoutValidContext: [],
    staleAssignmentsWithoutResponses: [],
    staleReviews: [],
    expiredInvitations: [],
    blockedAccounts: [],
    providersMissingVerification: [],
    assignmentsWithoutCandidates: [],
    failedOutboxCount: 0,
    ...overrides,
  }
}

describe('platformbeheeradvies', () => {
  it('maakt een kritisch signaal met bron en deeplink voor een organisatie zonder eigenaar', () => {
    const signals = buildPlatformAdviceSignals(emptyInput({
      organizationsWithoutActiveOwner: [{ id: 'organization-1', name: 'Voorbeeldorganisatie' }],
    }))

    expect(signals).toEqual([
      expect.objectContaining({
        id: 'organization-owner:organization-1',
        severity: 'CRITICAL',
        href: '/platformbeheer/organisaties/organization-1',
        ruleCode: 'ORGANIZATION_WITHOUT_ACTIVE_OWNER',
        sources: expect.arrayContaining([{ label: 'Actieve OWNERs', value: '0' }]),
      }),
    ])
    expect(derivePlatformStatus(signals).level).toBe('CRITICAL')
  })

  it('signaleert een opdracht die langer dan veertien dagen geen reactie heeft', () => {
    const signals = buildPlatformAdviceSignals(emptyInput({
      staleAssignmentsWithoutResponses: [{
        id: 'assignment-1',
        title: 'RI&E actualiseren',
        openedAt: new Date('2026-07-01T10:00:00.000Z'),
        responseCount: 0,
      }],
    }))

    expect(signals[0]).toMatchObject({
      severity: 'HIGH',
      ruleCode: 'STALE_ASSIGNMENT_WITHOUT_RESPONSES',
      recommendedAction: expect.stringContaining('selectie'),
    })
    expect(signals[0]?.sources).toContainEqual({ label: 'Reacties', value: '0' })
  })

  it('sorteert reproduceerbaar op ernst, regelcode en id', () => {
    const input = emptyInput({
      organizationsWithoutActiveOwner: [
        { id: 'b', name: 'B-organisatie' },
        { id: 'a', name: 'A-organisatie' },
      ],
      blockedAccounts: [{ id: 'account-1', label: 'Voorbeeldaccount', organizationName: null }],
      failedOutboxCount: 2,
    })

    const firstRun = buildPlatformAdviceSignals(input)
    const secondRun = buildPlatformAdviceSignals(input)

    expect(secondRun).toEqual(firstRun)
    expect(firstRun.map((signal) => signal.severity)).toEqual(['CRITICAL', 'CRITICAL', 'HIGH', 'NORMAL'])
    expect(firstRun.slice(0, 2).map((signal) => signal.id)).toEqual([
      'organization-owner:a',
      'organization-owner:b',
    ])
  })

  it('laat ontbrekende kerncijfers en lege wachtrijen weg', () => {
    expect(selectCoreKpis({
      activeOrganizations: 12,
      activeUsers: null,
      selectableProviders: 5,
      openAssignments: 3,
    }).map((metric) => metric.label)).toEqual([
      'Actieve organisaties',
      'Selecteerbare dienstverleners',
      'Open opdrachten',
    ])

    const queues = selectVisibleQueues([
      { label: 'Reviews', count: 12, items: [{ id: '1' }, { id: '2' }] },
      { label: 'Goedkeuringen', count: 0, items: [] },
    ])
    expect(queues).toHaveLength(1)
    expect(queues[0]?.count).toBe(12)
    expect(queues[0]?.items).toHaveLength(2)
  })

  it('geeft zonder signalen een gezonde status en een tijdgebonden Nederlandse begroeting', () => {
    expect(derivePlatformStatus([]).level).toBe('HEALTHY')
    expect(getDutchGreeting(new Date('2026-07-25T07:00:00.000Z'))).toBe('Goedemorgen')
  })
})
