import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { AssignmentQuoteSlotsField } from '@/components/assignments/assignment-quote-slots-field'
import {
  BASE_SELECTIONS,
  MAX_SELECTIONS,
  calculateAssignmentSelectionPrice,
  hasAvailableAssignmentSelection,
  requireAssignmentSelectionLimit,
} from './assignment-quote-slots'

describe('assignment quote slots', () => {
  it('houdt drie offerteplaatsen gratis als standaard', () => {
    expect(BASE_SELECTIONS).toBe(3)
    expect(calculateAssignmentSelectionPrice(3)).toEqual({
      maxSelections: 3,
      extraSelections: 0,
      amountExcludingVatCents: 0,
      vatCents: 0,
      amountIncludingVatCents: 0,
    })
  })

  it('berekent vier offerteplaatsen inclusief 21% btw', () => {
    expect(calculateAssignmentSelectionPrice(4)).toMatchObject({
      amountExcludingVatCents: 2_500,
      vatCents: 525,
      amountIncludingVatCents: 3_025,
    })
  })

  it('berekent vijf offerteplaatsen inclusief 21% btw', () => {
    expect(MAX_SELECTIONS).toBe(5)
    expect(calculateAssignmentSelectionPrice(5)).toMatchObject({
      amountExcludingVatCents: 5_000,
      vatCents: 1_050,
      amountIncludingVatCents: 6_050,
    })
  })

  it.each([2, 6, 3.5])('weigert een ongeldige limiet %s', (value) => {
    expect(() => requireAssignmentSelectionLimit(value)).toThrow('INVALID_ASSIGNMENT_SELECTION_LIMIT')
  })

  it.each([
    [2, 3, true],
    [3, 3, false],
    [3, 4, true],
    [4, 4, false],
    [4, 5, true],
    [5, 5, false],
  ] as const)('handhaaft %s actieve plaatsen tegen limiet %s', (active, limit, expected) => {
    expect(hasAvailableAssignmentSelection(active, limit)).toBe(expected)
  })

  it('toont de drie keuzes, btw en de niet-gegarandeerde invulling', () => {
    const html = renderToStaticMarkup(<AssignmentQuoteSlotsField />)
    expect(html).toContain('3 offerteplaatsen')
    expect(html).toContain('4 offerteplaatsen')
    expect(html).toContain('5 offerteplaatsen')
    expect(html).toContain('€ 25,00 excl. btw')
    expect(html).toContain('€ 5,25 btw')
    expect(html).toContain('€ 30,25 incl. btw')
    expect(html).toContain('WorkMatchr garandeert niet')
    expect(html).toContain('wordt binnenkort beschikbaar')
  })
})
