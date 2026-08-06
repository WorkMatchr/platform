import { describe, expect, it } from 'vitest'
import { assignmentStatusLabels } from './assignment-presentation'

describe('opdrachtpresentatie', () => {
  it('vertaalt iedere technische opdrachtstatus naar gewone Nederlandse taal', () => {
    expect(assignmentStatusLabels).toEqual({
      DRAFT: 'Nog invullen',
      READY_FOR_REVIEW: 'Klaar om te publiceren',
      OPEN: 'Gepubliceerd',
      MATCHING: 'Professionals worden geselecteerd',
      AWAITING_RESPONSES: 'Wacht op reacties',
      IN_SELECTION: 'Offertes vergelijken',
      AWARDED: 'Gegund',
      CLOSED: 'Afgerond',
      CANCELLED: 'Beëindigd',
      ARCHIVED: 'Gearchiveerd',
    })
  })

  it('lekt geen enumopmaak naar zichtbare labels', () => {
    expect(Object.values(assignmentStatusLabels).every((label) => !label.includes('_'))).toBe(true)
  })
})
