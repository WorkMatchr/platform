export const FINANCIAL_REFUND_REASON_CODES = [
  'DUPLICATE_CHARGE',
  'CREDITS_NOT_DELIVERED',
  'WORKMATCHR_TECHNICAL_ERROR',
  'OTHER_APPROVED_WORKMATCHR_ERROR',
  'SYSTEM_TEST',
  'SYSTEM_FAILURE_JORTT',
  'SYSTEM_FAILURE_MOLLIE',
  'SYSTEM_FAILURE_WORKMATCHR',
  'OTHER_APPROVED_REASON',
] as const

export type FinancialRefundReasonCode = typeof FINANCIAL_REFUND_REASON_CODES[number]

export const FINANCIAL_REFUND_REASON_LABELS: Record<FinancialRefundReasonCode, string> = {
  DUPLICATE_CHARGE: 'Dubbele betaling',
  CREDITS_NOT_DELIVERED: 'Credits niet geleverd',
  WORKMATCHR_TECHNICAL_ERROR: 'Technische fout van WorkMatchr',
  OTHER_APPROVED_WORKMATCHR_ERROR: 'Andere goedgekeurde fout van WorkMatchr',
  SYSTEM_TEST: 'Anders - Systeemtest',
  SYSTEM_FAILURE_JORTT: 'Anders - Systeemstoring Jortt',
  SYSTEM_FAILURE_MOLLIE: 'Anders - Systeemstoring Mollie',
  SYSTEM_FAILURE_WORKMATCHR: 'Anders - Systeemstoring WorkMatchr',
  OTHER_APPROVED_REASON: 'Anders - Overige goedgekeurde reden',
}

export const SYSTEM_TEST_REFUND_WARNING =
  'Alleen gebruiken voor een gecontroleerde end-to-end systeemtest. Deze refund gebruikt de echte betaal- en financiële keten en kan na definitieve verwerking door de betaalprovider niet worden teruggedraaid.'
