import { AsyncLocalStorage } from 'node:async_hooks'
import type { AuthEmailDeliveryResult } from '@/lib/email'

type DeliveryCapture = { result?: AuthEmailDeliveryResult }

const deliveryStorage = new AsyncLocalStorage<DeliveryCapture>()

export function captureAuthEmailDelivery(result: AuthEmailDeliveryResult): void {
  const capture = deliveryStorage.getStore()
  if (capture) capture.result = result
}

export async function withAuthEmailDeliveryCapture<T>(operation: () => Promise<T>): Promise<AuthEmailDeliveryResult | null> {
  const capture: DeliveryCapture = {}
  await deliveryStorage.run(capture, operation)
  return capture.result ?? null
}
