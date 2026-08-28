export const BASE_SELECTIONS = 3 as const
export const MAX_SELECTIONS = 5 as const
export const EXTRA_SELECTION_PRICE_EXCL_VAT_CENTS = 2_500 as const
export const EXTRA_SELECTION_VAT_PERCENTAGE = 21 as const

export type AssignmentSelectionLimit = 3 | 4 | 5

export type AssignmentSelectionPrice = Readonly<{
  maxSelections: AssignmentSelectionLimit
  extraSelections: number
  amountExcludingVatCents: number
  vatCents: number
  amountIncludingVatCents: number
}>

export function isAssignmentSelectionLimit(value: number): value is AssignmentSelectionLimit {
  return Number.isInteger(value) && value >= BASE_SELECTIONS && value <= MAX_SELECTIONS
}

export function requireAssignmentSelectionLimit(value: number): AssignmentSelectionLimit {
  if (!isAssignmentSelectionLimit(value)) throw new RangeError('INVALID_ASSIGNMENT_SELECTION_LIMIT')
  return value
}

export function calculateAssignmentSelectionPrice(maxSelections: number): AssignmentSelectionPrice {
  const validLimit = requireAssignmentSelectionLimit(maxSelections)
  const extraSelections = validLimit - BASE_SELECTIONS
  const amountExcludingVatCents = extraSelections * EXTRA_SELECTION_PRICE_EXCL_VAT_CENTS
  const vatCents = Math.round(amountExcludingVatCents * EXTRA_SELECTION_VAT_PERCENTAGE / 100)
  return Object.freeze({
    maxSelections: validLimit,
    extraSelections,
    amountExcludingVatCents,
    vatCents,
    amountIncludingVatCents: amountExcludingVatCents + vatCents,
  })
}

export function hasAvailableAssignmentSelection(activeSelections: number, maxSelections: number): boolean {
  if (!Number.isInteger(activeSelections) || activeSelections < 0) throw new RangeError('INVALID_ACTIVE_SELECTION_COUNT')
  return activeSelections < requireAssignmentSelectionLimit(maxSelections)
}

export function formatEuroCents(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
