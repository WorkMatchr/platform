import { describe, expect, it } from 'vitest'
import { classifyIntakeHelpRequest } from './intake-classification'

describe('classifyIntakeHelpRequest', () => {
  it('gebruikt kenniscontext alleen als ondersteunend signaal', () => {
    expect(classifyIntakeHelpRequest(
      'Wij willen weten hoe de toegang tot onze bedrijfsarts geregeld moet worden.',
      { suggestedCategory: 'OCCUPATIONAL_HEALTH', classificationSignals: ['bedrijfsarts', 'verzuim'] },
    ).category).toBe('OCCUPATIONAL_HEALTH')

    expect(classifyIntakeHelpRequest(
      'Wij willen uitsluitend onze heftrucks en machineafscherming laten beoordelen.',
      { suggestedCategory: 'OCCUPATIONAL_HEALTH', classificationSignals: ['bedrijfsarts', 'verzuim'] },
    ).category).not.toBe('OCCUPATIONAL_HEALTH')
  })
  it('classificeert BHV op meerdere samenhangende signalen', () => {
    expect(classifyIntakeHelpRequest('Wij willen onze BHV-organisatie en het ontruimingsplan verbeteren.')).toMatchObject({
      category: 'BHV',
      confidence: 'HIGH',
    })
  })

  it('laat een enkel algemeen trefwoord niet de categorie bepalen', () => {
    expect(classifyIntakeHelpRequest('Wij hebben een vraag over veiligheid en zoeken advies.').category).toBe('NOT_SURE')
  })

  it('is deterministisch', () => {
    const input = 'Na een arbeidsongeval willen wij incidentonderzoek laten uitvoeren.'
    expect(classifyIntakeHelpRequest(input)).toEqual(classifyIntakeHelpRequest(input))
  })

  it('classificeert gasopslag en capaciteitsuitbreiding als gevaarlijke stoffen', () => {
    expect(
      classifyIntakeHelpRequest(
        'Wij gaan van 5000 liter gas naar 50000 liter gasopslag. Welke eisen moeten wij volgen?',
      ),
    ).toMatchObject({
      category: 'HAZARDOUS_SUBSTANCES',
      confidence: 'HIGH',
      outcome: 'DIRECT_PROPOSAL',
    })
  })

  it.each([
    'Aan welke eisen moeten wij voldoen?',
    'Wij gebruiken ongeveer 5000 liter per jaar.',
    'Wij hebben meer opslag nodig.',
  ])('classificeert een algemeen contextsignaal niet als gevaarlijke stoffen: %s', (input) => {
    expect(classifyIntakeHelpRequest(input)).toMatchObject({
      category: 'NOT_SURE',
      confidence: 'LOW',
      outcome: 'GENERIC_FALLBACK',
    })
  })

  it('stuurt een ambigue keukenvraag naar één gerichte verduidelijkingsset', () => {
    expect(classifyIntakeHelpRequest('Hoe kunnen wij veilig werken in een keuken?')).toMatchObject({
      category: 'NOT_SURE',
      confidence: 'MEDIUM',
      outcome: 'TARGETED_CLARIFICATION',
      clarificationSetId: 'WORKPLACE_CONTEXT_KITCHEN_V2',
    })
  })

  it('valt zonder passende verduidelijkingsset generiek terug', () => {
    expect(classifyIntakeHelpRequest('Wij willen een tank uitbreiden en weten welke vergunning nodig is.')).toMatchObject({
      category: 'NOT_SURE',
      confidence: 'LOW',
      outcome: 'GENERIC_FALLBACK',
    })
  })

  it('houdt secundaire veiligheidscontext gescheiden van de primaire categorie', () => {
    const result = classifyIntakeHelpRequest(
      'Wij breiden onze gasopslag uit en hebben vragen over brandveiligheid, milieu en omwonenden.',
    )

    expect(result.category).toBe('HAZARDOUS_SUBSTANCES')
    expect(result.secondaryContexts).toEqual(['FIRE_SAFETY', 'ENVIRONMENT', 'EXTERNAL_SAFETY'])
  })
})
