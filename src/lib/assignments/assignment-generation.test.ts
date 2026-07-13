import { describe, expect, it } from 'vitest'
import { generateAssignmentDescription, generateAssignmentTitle } from './assignment-generation'

describe('deterministische opdrachtgeneratie', () => {
  it('gebruikt de eerste niet-lege hulpvraagregel als titel', () => {
    expect(generateAssignmentTitle('\n  Advies over veilig werken  \nAanvullende context')).toBe(
      'Advies over veilig werken',
    )
  })

  it('begrenst een lange titel op maximaal 120 tekens en een woordgrens', () => {
    const title = generateAssignmentTitle(
      'Wij zoeken ondersteuning voor een zeer uitgebreide veiligheidskundige beoordeling van meerdere werkprocessen en locaties binnen onze organisatie',
    )

    expect(title.length).toBeLessThanOrEqual(120)
    expect(title.endsWith('…')).toBe(true)
  })

  it('bouwt de omschrijving met vaste Nederlandstalige secties zonder AI', () => {
    expect(
      generateAssignmentDescription({
        helpRequest: 'Ondersteuning bij veilig werken.',
        desiredOutcome: 'Een praktisch verbeterplan.',
        situation: 'De huidige instructies zijn verouderd.',
      }),
    ).toBe(
      'Hulpvraag\nOndersteuning bij veilig werken.\n\nGewenst resultaat\nEen praktisch verbeterplan.\n\nHuidige situatie\nDe huidige instructies zijn verouderd.',
    )
  })
})
