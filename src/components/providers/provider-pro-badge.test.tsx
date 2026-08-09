import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProviderDecisionProfile } from './provider-decision-profile'

function profile(hasActivePro: boolean) {
  return {
    hasActivePro,
    shortIntroduction: null,
    description: null,
    workingMethod: null,
    organization: { name: 'Voorbeeld Veiligheid', tradeName: null, logoStorageKey: null, logoWidth: null, logoHeight: null, locations: [], professionalSubscription: null },
    organizationQualifications: [],
    capabilities: [],
    sectors: [],
    workAreas: [],
    workModes: [],
    coreExpertises: [],
    professionals: [],
    completeness: { percentage: 100 },
  } as never
}

describe('WorkMatchr Pro-badge op het dienstverlenersprofiel', () => {
  it('toont de badge uitsluitend bij een effectief Pro-recht', () => {
    const active = renderToStaticMarkup(<ProviderDecisionProfile profile={profile(true)} backHref="/opdrachten/voorbeeld" backLabel="Terug" />)
    const inactive = renderToStaticMarkup(<ProviderDecisionProfile profile={profile(false)} backHref="/opdrachten/voorbeeld" backLabel="Terug" />)
    expect(active).toContain('WorkMatchr Pro')
    expect(active).toContain('Actief WorkMatchr Pro-abonnement')
    expect(inactive).not.toContain('WorkMatchr Pro')
  })
})
