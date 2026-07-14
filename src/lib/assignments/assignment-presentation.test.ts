import { describe, expect, it } from 'vitest'
import { assignmentStatusLabels } from './assignment-presentation'

describe('opdrachtpresentatie', () => {
  it('vertaalt iedere technische opdrachtstatus naar gewone Nederlandse taal', () => {
    expect(assignmentStatusLabels).toEqual({
      DRAFT: 'Concept',
      READY_FOR_REVIEW: 'Klaar voor controle',
      OPEN: 'Gepubliceerd',
      MATCHING: 'Matching wordt voorbereid',
      AWAITING_RESPONSES: 'Wacht op reacties',
      IN_SELECTION: 'Selectie',
      AWARDED: 'Gegund',
      CLOSED: 'Afgerond',
      CANCELLED: 'Geannuleerd',
      ARCHIVED: 'Gearchiveerd',
    })
  })

  it('lekt geen enumopmaak naar zichtbare labels', () => {
    expect(Object.values(assignmentStatusLabels).every((label) => !label.includes('_'))).toBe(true)
  })
})
