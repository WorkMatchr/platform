import 'server-only'

import type { MollieGateway } from './mollie-gateway'
import { createMollieGateway } from './mollie-gateway'
import { reconcilePendingMollieRefunds } from './refund-service'
import { finalizeScheduledProCancellations, suspendOverdueProSubscriptions } from './subscription-service'

export async function runFinancialMaintenance(
  at = new Date(),
  gateway: MollieGateway = createMollieGateway(),
) {
  const refunds = await reconcilePendingMollieRefunds(gateway)
  const cancellations = await finalizeScheduledProCancellations(at)
  const suspensions = await suspendOverdueProSubscriptions(at)
  return { refunds, cancellations, suspensions }
}
