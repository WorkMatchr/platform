import { describe, expect, it } from 'vitest'
import { assignmentStatusLabels, formatAssignmentStart } from './assignment-presentation'
import { requestStartLabels } from '@/lib/requests/request-contract'

describe('opdrachtpresentatie', () => {
  it('behoudt iedere opgeslagen startvoorkeur zonder een datum te verzinnen', () => {
    for (const preference of Object.keys(requestStartLabels) as (keyof typeof requestStartLabels)[]) {
      expect(formatAssignmentStart(null, preference)).toBe(requestStartLabels[preference])
    }
  })

  it('toont de exacte datum indien aanwezig en behoudt lege legacywaarden', () => {
    expect(formatAssignmentStart('2026-12-01', 'SPECIFIC_DATE')).toBe('1 december 2026')
    expect(formatAssignmentStart('2026-12-01')).toBe('1 december 2026')
    expect(formatAssignmentStart(null)).toBe('Nog niet bepaald')
  })
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
