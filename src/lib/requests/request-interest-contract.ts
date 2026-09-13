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


export function selectedExpertiseMatchPresentation(primary: string | null, matches: readonly string[], basis: unknown) {
  if (!primary || !basis || typeof basis !== 'object' || !('expertiseSelectionSource' in basis) || basis.expertiseSelectionSource !== 'USER_SELECTED') return null
  if (matches.some(value => value.startsWith('PRIMARY:'))) return {
    type: 'PRIMARY' as const, title: 'Primaire match',
    description: 'De opdrachtgever heeft ' + primary + ' als primaire deskundigheid geselecteerd.',
  }
  const additional = [...new Set(matches.filter(value => value.startsWith('ADDITIONAL:')).map(value => value.slice('ADDITIONAL:'.length)))]
  if (!additional.length) return null
  return { type: 'ADDITIONAL' as const, title: 'Aanvullende match', description: 'De opdrachtgever heeft primair ' + primary + ' geselecteerd en daarnaast ' + additional.join(', ') + ' als aanvullende deskundigheid meegenomen.' }
}
