import { z } from 'zod'
import { PROFESSIONAL_ADVICE_DISCLAIMER } from '@/lib/guidance/professional-advice-rules'

export const professionalRequirementSnapshotSchema = z
  .object({
    label: z.string().min(1),
    priority: z.enum(['PRIMARY', 'ADDITIONAL', 'POSSIBLE']).optional(),
    reason: z.string().min(1),
    expertise: z.array(z.string().min(1)),
    capabilityCodes: z.array(z.string().min(1)).default([]),
  })
  .strict()

const primaryProfessionalRequirementSnapshotSchema =
  professionalRequirementSnapshotSchema.extend({
    priority: z.literal('PRIMARY').default('PRIMARY'),
  })

export const secondaryProfessionalRequirementSnapshotSchema =
  professionalRequirementSnapshotSchema.extend({
    priority: z
      .enum(['ADDITIONAL', 'POSSIBLE'])
      .default('ADDITIONAL'),
  })

const knowledgeReferenceSnapshotSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string(),
    href: z.string().startsWith('/'),
  })
  .strict()

const sourceReferenceSnapshotSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    publisher: z.string().min(1),
    url: z.string().url(),
  })
  .strict()

export const adviceDossierSnapshotSchema = z
  .object({
    originalHelpRequest: z.string().min(1),
    situationSummary: z.string().min(1),
    subject: z.string().min(1).max(200),
    adviceTitle: z.string().min(1).max(300),
    adviceBody: z.string().min(1),
    adviceReasons: z.array(z.string().min(1)).min(1),
    selfActions: z.array(z.string().min(1)).min(1),
    primaryProfessionalRequirement:
      primaryProfessionalRequirementSnapshotSchema.nullable(),
    additionalProfessionalRequirements: z.array(
      secondaryProfessionalRequirementSnapshotSchema,
    ),
    possibleProfessionalRequirements: z.array(
      secondaryProfessionalRequirementSnapshotSchema,
    ),
    knowledgeReferences: z.array(knowledgeReferenceSnapshotSchema),
    sourceReferences: z.array(sourceReferenceSnapshotSchema),
    uncertainties: z.array(z.string().min(1)),
    disclaimer: z.literal(PROFESSIONAL_ADVICE_DISCLAIMER),
    outcomeSpecificity: z.enum(['SPECIFIC', 'BROAD', 'SAFE_FALLBACK']),
    completionStatus: z.enum([
      'COMPLETED_WITH_GUIDANCE',
      'COMPLETED_WITH_SAFE_FALLBACK',
    ]),
  })
  .strict()

export type AdviceDossierSnapshot = z.infer<
  typeof adviceDossierSnapshotSchema
>

export const adviceDossierStatusLabels = Object.freeze({
  DRAFT: 'Concept',
  ADVICE_READY: 'Advies gereed',
  SPECIALIST_SEARCHED: 'Specialist gezocht',
  ASSIGNMENT_STARTED: 'Opdracht gestart',
  COMPLETED: 'Afgerond',
  ARCHIVED: 'Gearchiveerd',
} as const)

export type AdviceDossierReference = Readonly<{
  id: string
  dossierCode: string
}>
