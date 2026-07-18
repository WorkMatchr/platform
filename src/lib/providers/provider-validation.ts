import { z } from 'zod'

export const uuidSchema = z.uuid({ error: 'Selecteer een geldige waarde.' })
export const expectedVersionSchema = z.int().positive()
export const reasonCodeSchema = z.string().trim().min(2).max(100).regex(/^[A-Z0-9_]+$/)
export const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/)

export const createCapabilitySchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  serviceTermId: uuidSchema.optional(),
  specialismTermId: uuidSchema.optional(),
  deliveryModes: z.array(z.enum(['ON_SITE', 'HYBRID', 'REMOTE'])).min(1).max(3),
}).refine((input) => input.serviceTermId || input.specialismTermId, 'Een dienst of specialisme is verplicht.')

export const capacitySnapshotSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  acceptsNewAssignments: z.boolean(),
  earliestStartDate: z.coerce.date().optional(),
  capacityLevel: z.enum(['LIMITED', 'NORMAL', 'AMPLE']),
})

export const evidenceMetadataSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  storageKey: z.string().trim().min(16).max(500),
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(100),
  sizeBytes: z.int().positive().max(25 * 1024 * 1024),
  sha256: sha256Schema,
})

export const insuranceSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  insuranceTypeTermId: uuidSchema,
  insurer: z.string().trim().min(2).max(200),
  policyReference: z.string().trim().min(2).max(200),
  effectiveFrom: z.coerce.date(),
  expiresAt: z.coerce.date(),
  insuredOrganizationId: uuidSchema,
  coverageAmountCents: z.bigint().nonnegative().optional(),
  coverageGeography: z.string().trim().min(2).max(100).optional(),
  evidenceRevisionId: uuidSchema,
}).refine((input) => input.expiresAt >= input.effectiveFrom, { path: ['expiresAt'], message: 'De einddatum ligt vóór de ingangsdatum.' })
