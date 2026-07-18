import type { ProviderDossierSection } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import type { ProviderCompletenessAssessment } from './provider-dossier-completeness'
import { buildProviderDossierOpenActions } from './provider-dossier-open-actions'

const complete: ProviderCompletenessAssessment = {
  policyVersion: 'v1',
  sourceProfileVersion: 1,
  required: 9,
  completed: 9,
  actionRequired: 0,
  expired: 0,
  notStarted: 0,
  percentage: 100,
  blockingSections: [],
  warnings: [],
  reasons: [],
  editableSections: [],
  isSubmittable: true,
  checksum: 'a',
}

function incomplete(section: ProviderDossierSection, code: string): ProviderCompletenessAssessment {
  return {
    ...complete,
    completed: 8,
    actionRequired: 1,
    percentage: 89,
    blockingSections: [section],
    reasons: [{ code, section, state: 'ACTION_REQUIRED' }],
    isSubmittable: false,
  }
}

describe('provider dossier open actions', () => {
  it('biedt indienen aan bij een compleet concept', () => {
    expect(buildProviderDossierOpenActions(complete, null)[0]).toMatchObject({
      code: 'SUBMIT_DOSSIER',
      title: 'Controleer en dien het dossier in',
      routeHint: '/aanbiedersdossier/controleren',
      pageTitle: 'Dossier controleren',
      groupLabel: 'Verklaringen en indienen',
    })
  })

  it('toont tijdens review uitsluitend een veilige wachtactie', () => {
    expect(buildProviderDossierOpenActions(complete, 'UNDER_REVIEW')).toEqual([
      expect.objectContaining({ code: 'AWAIT_REVIEW', blocking: false }),
    ])
  })

  it('verwijst aanvullingen naar de Nederlandstalige dossierroute', () => {
    expect(
      buildProviderDossierOpenActions(complete, 'ADDITIONAL_INFORMATION_REQUIRED', ['INSURANCE'])[0],
    ).toMatchObject({
      routeHint: '/aanbiedersdossier/verzekeringen',
      pageTitle: 'Verzekeringen',
      groupLabel: 'Verzekeringen en bewijsstukken',
    })
  })

  it('verwijst de sectorervaringactie rechtstreeks naar Sectorervaring via de juiste hoofdgroep', () => {
    expect(
      buildProviderDossierOpenActions(
        incomplete('SECTOR_EXPERIENCE', 'SECTOR_EXPERIENCE_INCOMPLETE'),
        null,
      )[0],
    ).toMatchObject({
      title: 'Vul sectorervaring in',
      routeHint: '/aanbiedersdossier/sectorervaring',
      pageTitle: 'Sectorervaring',
      groupLabel: 'Diensten en ervaring',
      groupHref: '/aanbiedersdossier/diensten-en-ervaring',
    })
  })

  it.each([
    ['ORGANIZATION', 'ORGANIZATION_INCOMPLETE', 'Vul de bedrijfsgegevens aan', '/aanbiedersdossier/bedrijfsgegevens', 'Bedrijfsgegevens', 'Bedrijfsgegevens'],
    ['CAPABILITIES', 'CAPABILITIES_INCOMPLETE', 'Voeg een dienst toe', '/aanbiedersdossier/diensten', 'Diensten en specialismen', 'Diensten en ervaring'],
    ['SECTOR_EXPERIENCE', 'SECTOR_EXPERIENCE_INCOMPLETE', 'Vul sectorervaring in', '/aanbiedersdossier/sectorervaring', 'Sectorervaring', 'Diensten en ervaring'],
    ['WORK_AREA', 'WORK_AREA_INCOMPLETE', 'Vul het werkgebied in', '/aanbiedersdossier/werkgebied', 'Werkgebied', 'Werkgebied'],
    ['PROFESSIONALS', 'PROFESSIONALS_INCOMPLETE', 'Voeg een professional toe', '/aanbiedersdossier/professionals', 'Professionals', 'Professionals en kwalificaties'],
    ['INSURANCE', 'INSURANCE_EXPIRED', 'Werk de verzekering bij', '/aanbiedersdossier/verzekeringen', 'Verzekeringen', 'Verzekeringen en bewijsstukken'],
    ['EVIDENCE', 'EVIDENCE_UNAVAILABLE', 'Maak bewijs beschikbaar', '/aanbiedersdossier/bewijsstukken', 'Bewijsstukken', 'Verzekeringen en bewijsstukken'],
    ['DECLARATIONS', 'TERM_NOT_ACCEPTED', 'Accepteer de vereiste verklaring', '/aanbiedersdossier/verklaringen', 'Verklaringen', 'Verklaringen en indienen'],
  ] as const)(
    'houdt %s-code, titel, route, doelpagina en hoofdgroep consistent',
    (section, code, title, routeHint, pageTitle, groupLabel) => {
      expect(buildProviderDossierOpenActions(incomplete(section, code), null)[0]).toMatchObject({
        code,
        section,
        title,
        routeHint,
        pageTitle,
        groupLabel,
      })
    },
  )

  it('negeert historische capaciteitsredenen en -findings', () => {
    const legacy = incomplete('CAPACITY', 'CAPACITY_EXPIRED')
    expect(buildProviderDossierOpenActions(legacy, null)).toEqual([])
    expect(buildProviderDossierOpenActions(complete, 'ADDITIONAL_INFORMATION_REQUIRED', ['CAPACITY']))
      .not.toEqual(expect.arrayContaining([expect.objectContaining({ section: 'CAPACITY' })]))
  })
})
