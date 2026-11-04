import { z } from 'zod'
export const WITHDRAWAL_DECLARATION_VERSION = 'ACADEMY-WITHDRAWAL-2026-10-30'
export const withdrawalDeclaration = 'Ik verklaar dat ik mijn Academy-aankoop wil herroepen.'
export const withdrawalInput = z.object({
  requestKey: z.uuid(), orderReference: z.string().trim().min(6).max(120),
  email: z.email().max(320).transform(value => value.trim().toLowerCase()),
  confirmed: z.literal(true), declarationVersion: z.literal(WITHDRAWAL_DECLARATION_VERSION),
}).strict()
