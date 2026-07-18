import { describe, expect, it } from 'vitest'
import {
  presentProviderStatuses,
  providerDeliveryModeLabels,
  providerDossierSectionLabels,
  providerEvidenceScanStatusLabels,
  providerEvidenceStatusLabels,
  providerReviewLabels,
  providerVerificationLabels,
} from './provider-dossier-presentation'

describe('provider dossier presentatie', () => {
  it('vertaalt alle review- en verificatiestatussen naar Nederlands', () => {
    expect(Object.values(providerReviewLabels)).toEqual(['Ingediend', 'In beoordeling', 'Aanvullende informatie nodig', 'Goedgekeurd', 'Afgewezen', 'Verlopen', 'Ingetrokken'])
    expect(Object.values(providerVerificationLabels)).toEqual(['Zelf verklaard', 'Document gecontroleerd', 'Geverifieerd'])
  })

  it('houdt de vijf hoofstatussen afzonderlijk', () => {
    expect(presentProviderStatuses({ readinessStatus: 'INCOMPLETE', qualificationStatus: 'NOT_ASSESSED', selectabilityStatus: 'NOT_SELECTABLE', submissionStatus: null })).toEqual({
      dossierCompleteness: 'Dossier niet compleet', platformQualification: 'Nog niet beoordeeld', professionalQualification: 'Per kwalificatie weergegeven', reviewStatus: 'Nog niet ingediend', selectability: 'Nog niet selecteerbaar',
    })
  })

  it('vertaalt overige zichtbare enumwaarden naar Nederlandse labels', () => {
    expect(providerDossierSectionLabels.INSURANCE).toBe('Verzekeringen')
    expect(providerDeliveryModeLabels.ON_SITE).toBe('Op locatie')
    expect(providerEvidenceStatusLabels.AVAILABLE).toBe('Beschikbaar')
    expect(providerEvidenceScanStatusLabels.CLEAN).toBe('Veilig gecontroleerd')
  })
})
