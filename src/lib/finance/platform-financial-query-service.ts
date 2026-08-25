import 'server-only'

import { Prisma, type FinancialDocumentType, type FinancialPaymentStatus, type FinancialPurchaseKind, type FinancialPurchaseStatus } from '@/generated/prisma/client'
import { getPlatformAdministratorContext } from '@/lib/platform-admin/platform-admin-authorization'
import { getPrisma } from '@/lib/prisma'

const PAGE_SIZE = 25

type DateRange = { from?: Date; through?: Date }
export type FinancialListResult<T> = { items: T[]; page: number; pageCount: number; total: number }
export type FinancialPaymentFilters = DateRange & { page?: number; status?: FinancialPurchaseStatus; kind?: FinancialPurchaseKind; organization?: string }
export type FinancialInvoiceFilters = DateRange & { page?: number; documentType?: FinancialDocumentType; organization?: string }
export type FinancialRefundFilters = DateRange & { page?: number; status?: FinancialPaymentStatus; organization?: string }

function pageNumber(value?: number) {
  return Number.isSafeInteger(value) && (value ?? 0) > 0 ? value! : 1
}

async function paginated<T>(requestedPage: number | undefined, count: () => Promise<number>, list: (skip: number) => Promise<T[]>): Promise<FinancialListResult<T>> {
  const total = await count()
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(pageNumber(requestedPage), pageCount)
  return { items: await list((page - 1) * PAGE_SIZE), page, pageCount, total }
}

function dateWhere(range: DateRange) {
  if (!range.from && !range.through) return undefined
  return {
    ...(range.from ? { gte: range.from } : {}),
    ...(range.through ? { lte: range.through } : {}),
  }
}

export async function listPlatformFinancialPayments(actorUserId: string, filters: FinancialPaymentFilters = {}) {
  await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const where: Prisma.FinancialPurchaseWhereInput = {
    status: filters.status,
    kind: filters.kind,
    createdAt: dateWhere(filters),
    organization: filters.organization ? { name: { contains: filters.organization, mode: 'insensitive' } } : undefined,
  }
  const select = {
    id: true, createdAt: true, kind: true, status: true, molliePaymentId: true, amountInclVatCents: true,
    organization: { select: { id: true, name: true } }, invoice: { select: { id: true, invoiceNumber: true } },
  } satisfies Prisma.FinancialPurchaseSelect
  return paginated(filters.page, () => prisma.financialPurchase.count({ where }), (skip) => prisma.financialPurchase.findMany({ where, select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take: PAGE_SIZE }))
}

export async function getPlatformFinancialPaymentDetail(actorUserId: string, purchaseId: string) {
  await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const purchase = await prisma.financialPurchase.findUnique({
    where: { id: purchaseId },
    select: {
      id: true,
      createdAt: true,
      paidAt: true,
      kind: true,
      status: true,
      packageLabel: true,
      credits: true,
      molliePaymentId: true,
      amountExclVatCents: true,
      vatRateBps: true,
      vatAmountCents: true,
      amountInclVatCents: true,
      organization: { select: { id: true, name: true } },
      invoice: { select: { id: true, invoiceNumber: true } },
      refunds: {
        orderBy: { requestedAt: 'desc' },
        select: {
          id: true,
          status: true,
          requestedAt: true,
          completedAt: true,
          mollieRefundId: true,
          creditNote: { select: { id: true, invoiceNumber: true } },
        },
      },
      creditedTransaction: {
        select: {
          creditAccountId: true,
          createdAt: true,
          creditAccount: { select: { availableBalance: true, reservedBalance: true, spentBalance: true } },
        },
      },
    },
  })
  if (!purchase) return null
  const creditsUsedAfterPurchase = purchase.creditedTransaction
    ? Boolean(await prisma.creditTransaction.findFirst({
        where: {
          creditAccountId: purchase.creditedTransaction.creditAccountId,
          createdAt: { gt: purchase.creditedTransaction.createdAt },
          totalDelta: { lt: 0 },
        },
        select: { id: true },
      }))
    : false
  return { ...purchase, creditsUsedAfterPurchase }
}

export async function listPlatformFinancialInvoices(actorUserId: string, filters: FinancialInvoiceFilters = {}) {
  await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const where: Prisma.FinancialInvoiceWhereInput = {
    documentType: filters.documentType,
    issuedAt: dateWhere(filters),
    organization: filters.organization ? { name: { contains: filters.organization, mode: 'insensitive' } } : undefined,
  }
  const select = {
    id: true, invoiceNumber: true, issuedAt: true, documentType: true, amountExclVatCents: true, vatAmountCents: true, amountInclVatCents: true,
    organization: { select: { id: true, name: true } }, purchase: { select: { status: true } },
    subscriptionPayment: { select: { status: true } }, refund: { select: { status: true } },
    jorttSync: { select: { status: true, remoteInvoiceNumber: true, lastErrorCode: true, updatedAt: true, syncedAt: true } },
  } satisfies Prisma.FinancialInvoiceSelect
  return paginated(filters.page, () => prisma.financialInvoice.count({ where }), (skip) => prisma.financialInvoice.findMany({ where, select, orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }], skip, take: PAGE_SIZE }))
}

export async function listPlatformFinancialRefunds(actorUserId: string, filters: FinancialRefundFilters = {}) {
  await getPlatformAdministratorContext(actorUserId)
  const prisma = getPrisma()
  const where: Prisma.FinancialRefundWhereInput = {
    status: filters.status,
    requestedAt: dateWhere(filters),
    purchase: filters.organization
      ? { organization: { name: { contains: filters.organization, mode: 'insensitive' } } }
      : undefined,
  }
  const select = {
    id: true, status: true, amountCents: true, requestedAt: true, completedAt: true, mollieRefundId: true,
    purchase: { select: { id: true, status: true, molliePaymentId: true, organization: { select: { id: true, name: true } }, invoice: { select: { id: true, invoiceNumber: true } } } },
    creditNote: { select: { id: true, invoiceNumber: true } },
  } satisfies Prisma.FinancialRefundSelect
  return paginated(filters.page, () => prisma.financialRefund.count({ where }), (skip) => prisma.financialRefund.findMany({ where, select, orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }], skip, take: PAGE_SIZE }))
}
