import type { FinancialDocumentType, FinancialPaymentStatus, FinancialPurchaseKind, FinancialPurchaseStatus } from '@/generated/prisma/client'

export const financialPurchaseStatusLabels: Record<FinancialPurchaseStatus, string> = {
  CREATED: 'Aangemaakt',
  PAYMENT_PENDING: 'In afwachting',
  PAID: 'Betaald',
  FAILED: 'Mislukt',
  CANCELED: 'Geannuleerd',
  EXPIRED: 'Verlopen',
  REFUND_REVIEW_REQUIRED: 'Terugbetaling controleren',
  PARTIALLY_REFUNDED: 'Gedeeltelijk terugbetaald',
  REFUNDED: 'Terugbetaald',
}

export const financialPaymentStatusLabels: Record<FinancialPaymentStatus, string> = {
  OPEN: 'Open',
  PENDING: 'In behandeling',
  PAID: 'Betaald',
  FAILED: 'Mislukt',
  CANCELED: 'Geannuleerd',
  EXPIRED: 'Verlopen',
  PARTIALLY_REFUNDED: 'Gedeeltelijk terugbetaald',
  REFUNDED: 'Terugbetaald',
}

export const financialPurchaseKindLabels: Record<FinancialPurchaseKind, string> = {
  CREDIT_PACKAGE: 'Credits',
  PRO_SUBSCRIPTION: 'WorkMatchr Pro',
}

export const financialDocumentTypeLabels: Record<FinancialDocumentType, string> = {
  INVOICE: 'Factuur',
  CREDIT_NOTE: 'Creditnota',
}

export function financialStatusTone(status: FinancialPurchaseStatus | FinancialPaymentStatus) {
  if (status === 'PAID') return 'good' as const
  if (['FAILED', 'CANCELED', 'EXPIRED'].includes(status)) return 'bad' as const
  if (['PAYMENT_PENDING', 'PENDING', 'OPEN', 'REFUND_REVIEW_REQUIRED'].includes(status)) return 'warning' as const
  return 'neutral' as const
}
