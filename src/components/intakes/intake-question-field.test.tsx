import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { IntakeClassification } from '@/lib/intakes/intake-classification'
import type { IntakeQuestionView } from '@/lib/intakes/intake-query-service'
import { IntakeQuestionField } from './intake-question-field'

const categoryQuestion: IntakeQuestionView = {
  id: 'question-category',
  key: 'CONFIRMED_HELP_CATEGORY',
  category: 'HELP_REQUEST',
  inputType: 'SINGLE_SELECT',
  label: 'Waar gaat uw hulpvraag vooral over?',
  helpText: 'Controleer wat het beste bij uw hulpvraag past.',
  isRequired: true,
  minLength: null,
  maxLength: null,
  minNumber: null,
  maxNumber: null,
  minSelections: null,
  maxSelections: null,
  options: [
    { id: 'rie', value: 'RIE', label: 'RI&E en plan van aanpak', isExclusive: false },
    { id: 'hazardous', value: 'HAZARDOUS_SUBSTANCES', label: 'Gevaarlijke stoffen', isExclusive: false },
    { id: 'ergonomics', value: 'ERGONOMICS', label: 'Ergonomie en fysieke belasting', isExclusive: false },
    { id: 'machinery', value: 'MACHINERY_SAFETY', label: 'Machine- en arbeidsmiddelenveiligheid', isExclusive: false },
    { id: 'bhv', value: 'BHV', label: 'BHV en ontruiming', isExclusive: false },
    { id: 'not-sure', value: 'NOT_SURE', label: 'Dat weet ik nog niet', isExclusive: true },
  ],
  value: null,
}

function renderClassification(classification: IntakeClassification) {
  return renderToStaticMarkup(
    <IntakeQuestionField
      question={categoryQuestion}
      locations={[]}
      classification={classification}
    />,
  )
}

describe('IntakeQuestionField categorieclassificatie', () => {
  it('toont bij lage zekerheid geen systeemvoorstel en selecteert geen fallbackoptie', () => {
    const html = renderClassification({
      category: 'NOT_SURE',
      confidence: 'LOW',
      outcome: 'GENERIC_FALLBACK',
      matchedSignals: 0,
      score: 0,
      secondaryContexts: [],
    })

    expect(html).toContain('We kunnen nog geen duidelijke categorie bepalen.')
    expect(html).toContain('Kies hieronder wat het beste past')
    expect(html).not.toContain('Voorgestelde categorie')
    expect(html).not.toContain('checked=""')
  })

  it('toont bij middelmatige zekerheid alleen de gerichte controlevraag', () => {
    const html = renderClassification({
      category: 'NOT_SURE',
      confidence: 'MEDIUM',
      outcome: 'TARGETED_CLARIFICATION',
      matchedSignals: 3,
      score: 3,
      clarificationSetId: 'WORKPLACE_CONTEXT_KITCHEN_V2',
      secondaryContexts: [],
    })

    expect(html).toContain('We hebben nog één korte vraag om uw hulpvraag beter te begrijpen.')
    expect(html).toContain('Waar gaat uw vraag vooral over?')
    expect(html).toContain('Veilig gebruik van keukenapparatuur, zoals ovens, vaatwassers en mixers')
    expect(html).toContain('Messen, snijmachines en ander keukenmaterieel voor snijwerk')
    expect(html).toContain('Hete oppervlakken, stoom, olie en risico op brandwonden')
    expect(html).toContain('Brandveiligheid, blusmiddelen en ontruiming')
    expect(html).toContain('Schoonmaakmiddelen en gevaarlijke stoffen')
    expect(html).toContain('Fysieke belasting')
    expect(html).toContain('Een algemene veiligheidsbeoordeling')
    expect(html).toContain('Dat weet ik nog niet')
    expect(html).not.toContain('om Uw hulpvraag')
    expect(html).not.toContain('Waar gaat Uw vraag')
    expect(html).not.toContain('Voorgestelde categorie')
    expect(html).not.toContain('RI&amp;E en plan van aanpak')
    expect(html).not.toContain('checked=""')
  })

  it('toont en selecteert bij hoge zekerheid precies één primaire categorie', () => {
    const html = renderClassification({
      category: 'HAZARDOUS_SUBSTANCES',
      confidence: 'HIGH',
      outcome: 'DIRECT_PROPOSAL',
      matchedSignals: 5,
      score: 12,
      secondaryContexts: ['FIRE_SAFETY'],
    })

    expect(html).toContain('Dit lijkt de meest passende categorie voor uw hulpvraag:')
    expect(html).toContain('Gevaarlijke stoffen')
    expect(html.match(/checked=""/g)).toHaveLength(1)
    expect(html).not.toContain('FIRE_SAFETY')
  })
})
