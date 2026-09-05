type FirstPaymentSource = {
  id: string
  kind: string
  status: string
  invoice: object | null
}

/** Resolve immutable successful history; never substitute current organisation data. */
export function resolveCanonicalProFirstPayment<T extends FirstPaymentSource>(context: {
  firstPaymentPurchase: T | null
  firstPaymentAttempts: Array<{ purchase: T }>
}): T {
  const paid = [context.firstPaymentPurchase, ...context.firstPaymentAttempts.map(({ purchase }) => purchase)]
    .filter((purchase): purchase is T => purchase?.kind === 'PRO_SUBSCRIPTION' && purchase.status === 'PAID')
  const unique = [...new Map(paid.map((purchase) => [purchase.id, purchase])).values()]
  if (unique.length !== 1) throw new Error('PRO_DOWNSTREAM_PAID_INVOICE_AMBIGUOUS')
  if (!unique[0].invoice) throw new Error('PRO_PAID_FIRST_PAYMENT_INVOICE_REQUIRED')
  return unique[0]
}
