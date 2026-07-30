import { z } from 'zod'
import type {
  RequestRequestedStart,
  RequestStatus,
} from '@/generated/prisma/client'

export const requestPublicationInputSchema = z
  .object({
    adviceDossierId: z.string().uuid('Het Adviesdossier is ongeldig.'),
    publicSummary: z
      .string()
      .trim()
      .min(20, 'Beschrijf de aanvraag in minimaal 20 tekens.')
      .max(4000, 'Gebruik maximaal 4000 tekens.'),
    requestedStart: z.enum(
      [
        'AS_SOON_AS_POSSIBLE',
        'WITHIN_ONE_MONTH',
        'IN_CONSULTATION',
      ],
      { message: 'Kies wanneer u wilt starten.' },
    ),
    notes: z
      .string()
      .trim()
      .max(2000, 'Gebruik maximaal 2000 tekens.')
      .optional()
      .default(''),
  })
  .strict()

export type RequestPublicationInput = z.infer<
  typeof requestPublicationInputSchema
>

export type RequestPublicationFormValues = Readonly<{
  adviceDossierId: string
  publicSummary: string
  requestedStart: string
  notes: string
}>

export const requestStatusLabels: Readonly<
  Record<RequestStatus, string>
> = Object.freeze({
  DRAFT: 'Concept',
  READY_TO_PUBLISH: 'Klaar voor publicatie',
  PUBLISHED: 'Gepubliceerd',
  CANCELLED: 'Geannuleerd',
})

export const requestStartLabels: Readonly<
  Record<RequestRequestedStart, string>
> = Object.freeze({
  AS_SOON_AS_POSSIBLE: 'Zo spoedig mogelijk',
  WITHIN_ONE_MONTH: 'Binnen één maand',
  IN_CONSULTATION: 'In overleg',
})

const requestStatusTransitions = {
  DRAFT: ['READY_TO_PUBLISH', 'CANCELLED'],
  READY_TO_PUBLISH: ['PUBLISHED', 'CANCELLED'],
  PUBLISHED: ['CANCELLED'],
  CANCELLED: [],
} as const satisfies Readonly<
  Record<RequestStatus, readonly RequestStatus[]>
>

export function canTransitionRequestStatus(
  from: RequestStatus,
  to: RequestStatus,
): boolean {
  return (
    requestStatusTransitions[from] as readonly RequestStatus[]
  ).includes(to)
}
