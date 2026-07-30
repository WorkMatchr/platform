import { z } from 'zod'
import type { RequestInterestStatus } from '@/generated/prisma/client'

export const requestInterestInputSchema = z
  .object({ requestId: z.string().uuid() })
  .strict()

export const requestInterestStatusLabels: Readonly<
  Record<RequestInterestStatus, string>
> = Object.freeze({
  INTERESTED: 'Interesse geregistreerd',
  WITHDRAWN: 'Interesse ingetrokken',
})

export function presentMatchedExpertise(value: string): string {
  const separator = value.indexOf(':')
  if (separator < 0) return value
  const tier = value.slice(0, separator)
  const label = value.slice(separator + 1)
  const tierLabel =
    tier === 'PRIMARY'
      ? 'Primair'
      : tier === 'ADDITIONAL'
        ? 'Aanvullend'
        : 'Mogelijk'
  return `${tierLabel}: ${label}`
}
