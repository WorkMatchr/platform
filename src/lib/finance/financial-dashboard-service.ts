import 'server-only'

import { getPrisma } from '@/lib/prisma'
import { requireProviderMarketplaceAccess } from '@/lib/marketplace/marketplace-authorization'
import { getPlatformAdministratorContext } from '@/lib/platform-admin/platform-admin-authorization'
import { deriveCreditBalance } from '@/lib/credits/credit-ledger-contract'

export async function getProfessionalFinancialDashboard(input: { actorUserId: string; organizationId: string }) {
  const prisma = getPrisma()
  await prisma.$transaction((transaction) => requireProviderMarketplaceAccess(transaction, input.actorUserId, input.organizationId))
  const [wallet, purchases, invoices, subscription] = await Promise.all([
    prisma.creditAccount.findUnique({ where: { organizationId: input.organizationId }, include: { transactions: { orderBy: { createdAt: 'desc' }, take: 50 } } }),
    prisma.financialPurchase.findMany({ where: { organizationId: input.organizationId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.financialInvoice.findMany({ where: { organizationId: input.organizationId }, orderBy: { issuedAt: 'desc' }, take: 50, include: { jorttSync: true } }),
    prisma.professionalSubscription.findUnique({ where: { organizationId: input.organizationId } }),
  ])
  const allEntries = wallet ? await prisma.creditTransaction.findMany({ where: { creditAccountId: wallet.id }, select: { type: true, totalDelta: true, reservedDelta: true } }) : []
  const balance = deriveCreditBalance(allEntries)
  return {
    balance,
    purchasedCredits: allEntries.filter((item) => item.type === 'PURCHASE').reduce((sum, item) => sum + item.totalDelta, 0),
    bonusCredits: allEntries.filter((item) => item.type === 'CONTRIBUTION_BONUS').reduce((sum, item) => sum + item.totalDelta, 0),
    usedCredits: Math.abs(allEntries.filter((item) => ['CONSUMPTION', 'PARTICIPATION_PAYMENT'].includes(item.type)).reduce((sum, item) => sum + Math.min(0, item.totalDelta), 0)),
    proSavingsCents: purchases.filter((item) => item.status === 'PAID').reduce((sum, item) => sum + item.proDiscountCents, 0),
    purchases,
    invoices,
    subscription,
    recentTransactions: wallet?.transactions ?? [],
  }
}

export async function getPlatformFinancialDashboard(actorUserId: string) {
  await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const [purchases, payments, subscriptionPayments, subscriptionPaymentStatuses, refunds, refundStatuses, ledger, discounts, starterBonuses, subscriptions, jortt] = await Promise.all([
    prisma.financialPurchase.findMany({ where: { status: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] } }, select: { kind: true, amountExclVatCents: true, vatAmountCents: true, amountInclVatCents: true, credits: true } }),
    prisma.financialPurchase.groupBy({ by: ['kind', 'status'], _count: true }),
    prisma.professionalSubscriptionPayment.findMany({ where: { status: 'PAID' }, select: { amountExclVatCents: true, vatAmountCents: true, amountInclVatCents: true } }),
    prisma.professionalSubscriptionPayment.groupBy({ by: ['status'], _count: true }),
    prisma.financialRefund.findMany({ where: { status: 'REFUNDED' }, select: { amountCents: true, creditNote: { select: { amountExclVatCents: true, vatAmountCents: true, amountInclVatCents: true } } } }),
    prisma.financialRefund.groupBy({ by: ['status'], _count: true }),
    prisma.creditTransaction.groupBy({ by: ['type'], _sum: { totalDelta: true }, _count: true }),
    prisma.discountRedemption.count({ where: { status: 'APPLIED' } }),
    prisma.starterBenefitGrant.count(),
    prisma.professionalSubscription.groupBy({ by: ['status'], _count: true }),
    prisma.financialJorttSync.groupBy({ by: ['status'], _count: true }),
  ])
  const ledgerTotal = (type: string) => ledger.find((item) => item.type === type)?._sum.totalDelta ?? 0
  const countStatus = (status: string) => payments.find((item) => item.status === status)?._count ?? 0
  const countRefundStatus = (status: string) => refundStatuses.find((item) => item.status === status)?._count ?? 0
  const countSubscriptionPaymentStatus = (status: string) => subscriptionPaymentStatuses.find((item) => item.status === status)?._count ?? 0
  const creditPurchases = purchases.filter((item) => item.kind === 'CREDIT_PACKAGE')
  const proPurchases = purchases.filter((item) => item.kind === 'PRO_SUBSCRIPTION')
  if (refunds.some((item) => !item.creditNote)) throw new Error('COMPLETED_REFUND_CREDIT_NOTE_MISSING')
  const grossRevenueExclVatCents = [...purchases, ...subscriptionPayments].reduce((sum, item) => sum + item.amountExclVatCents, 0)
  const grossVatCents = [...purchases, ...subscriptionPayments].reduce((sum, item) => sum + item.vatAmountCents, 0)
  const grossRevenueInclVatCents = [...purchases, ...subscriptionPayments].reduce((sum, item) => sum + item.amountInclVatCents, 0)
  const refundExclVatCents = Math.abs(refunds.reduce((sum, item) => sum + (item.creditNote?.amountExclVatCents ?? 0), 0))
  const refundVatCents = Math.abs(refunds.reduce((sum, item) => sum + (item.creditNote?.vatAmountCents ?? 0), 0))
  const refundInclVatCents = Math.abs(refunds.reduce((sum, item) => sum + (item.creditNote?.amountInclVatCents ?? 0), 0))
  const failedInitialProPayments = payments
    .filter((item) => item.kind === 'PRO_SUBSCRIPTION' && ['FAILED', 'CANCELED', 'EXPIRED'].includes(item.status))
    .reduce((sum, item) => sum + item._count, 0)
  return {
    grossRevenueExclVatCents,
    grossVatCents,
    grossRevenueInclVatCents,
    refundExclVatCents,
    refundVatCents,
    refundInclVatCents,
    netRevenueExclVatCents: grossRevenueExclVatCents - refundExclVatCents,
    netVatCents: grossVatCents - refundVatCents,
    netRevenueInclVatCents: grossRevenueInclVatCents - refundInclVatCents,
    successfulPayments: countStatus('PAID') + countStatus('PARTIALLY_REFUNDED') + countStatus('REFUNDED'),
    failedPayments: countStatus('FAILED') + countStatus('CANCELED') + countStatus('EXPIRED'),
    successfulCreditPayments: creditPurchases.length,
    successfulInitialProPayments: proPurchases.length,
    successfulRecurringProPayments: subscriptionPayments.length,
    successfulProPayments: proPurchases.length + subscriptionPayments.length,
    failedCreditPayments: payments
      .filter((item) => item.kind === 'CREDIT_PACKAGE' && ['FAILED', 'CANCELED', 'EXPIRED'].includes(item.status))
      .reduce((sum, item) => sum + item._count, 0),
    failedInitialProPayments,
    failedProPayments: failedInitialProPayments + countSubscriptionPaymentStatus('FAILED') + countSubscriptionPaymentStatus('CANCELED') + countSubscriptionPaymentStatus('EXPIRED'),
    refunds: refunds.length,
    pendingRefunds: countRefundStatus('PENDING'),
    failedRefunds: countRefundStatus('FAILED') + countRefundStatus('CANCELED'),
    refundAmountCents: refunds.reduce((sum, item) => sum + item.amountCents, 0),
    soldCredits: creditPurchases.reduce((sum, item) => sum + item.credits, 0),
    bonusCredits: ledgerTotal('CONTRIBUTION_BONUS'),
    usedCredits: Math.abs(ledgerTotal('CONSUMPTION') + ledgerTotal('PARTICIPATION_PAYMENT')),
    discountCodeUses: discounts,
    starterBonuses,
    subscriptions,
    jortt,
  }
}

const MAINTENANCE_LATE_MS = 3 * 60 * 60 * 1000
const REFUND_AGING_MS = 2 * 60 * 60 * 1000
const JORTT_AGING_MS = 2 * 60 * 60 * 1000

export async function getPlatformFinancialMaintenanceOverview(actorUserId: string, at = new Date()) {
  await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const refundThreshold = new Date(at.getTime() - REFUND_AGING_MS)
  const jorttThreshold = new Date(at.getTime() - JORTT_AGING_MS)
  const overdueThreshold = new Date(at)
  overdueThreshold.setUTCMonth(overdueThreshold.getUTCMonth() - 1)

  const [latestRun, lastSuccessfulRun, lastFailedRun, pendingRefunds, agedPendingRefunds, pendingCancellations, overdueCancellations, overduePro, jorttRetryRequired, jorttFailed, agedJortt] = await Promise.all([
    prisma.financialMaintenanceRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.financialMaintenanceRun.findFirst({ where: { status: 'SUCCEEDED' }, orderBy: { finishedAt: 'desc' } }),
    prisma.financialMaintenanceRun.findFirst({ where: { status: { in: ['FAILED', 'PARTIAL_FAILURE'] } }, orderBy: { finishedAt: 'desc' } }),
    prisma.financialRefund.count({ where: { status: 'PENDING' } }),
    prisma.financialRefund.count({ where: { status: 'PENDING', requestedAt: { lt: refundThreshold } } }),
    prisma.professionalSubscription.count({ where: { cancelAtPeriodEnd: true, status: { in: ['ACTIVE', 'PAST_DUE'] } } }),
    prisma.professionalSubscription.count({ where: { cancelAtPeriodEnd: true, cancellationEffectiveAt: { lte: at }, status: { in: ['ACTIVE', 'PAST_DUE'] } } }),
    prisma.professionalSubscription.count({ where: { status: 'PAST_DUE', cancelAtPeriodEnd: false, pastDueAt: { lte: overdueThreshold } } }),
    prisma.financialJorttSync.count({ where: { status: 'RETRY_REQUIRED' } }),
    prisma.financialJorttSync.count({ where: { status: 'FAILED' } }),
    prisma.financialJorttSync.count({ where: { status: { in: ['PENDING', 'RETRY_REQUIRED'] }, updatedAt: { lt: jorttThreshold }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: at } }] } }),
  ])

  return {
    latestRun,
    lastSuccessfulRun,
    lastFailedRun,
    pendingRefunds,
    agedPendingRefunds,
    pendingCancellations,
    overdueCancellations,
    overduePro,
    jorttRetryRequired,
    jorttFailed,
    agedJortt,
    maintenanceLate: !lastSuccessfulRun?.finishedAt || lastSuccessfulRun.finishedAt.getTime() < at.getTime() - MAINTENANCE_LATE_MS,
  }
}
