import { z } from 'zod'

/** Editorial examples are never part of the input accepted by a generator. */
export const contextQuestionGenerationInstructionsSchema = z.object({
  contractVersion: z.literal(2),
  informationNeed: z.string().trim().min(10).max(500),
  runtimeQuestionInstructions: z.string().trim().min(10).max(1000),
  neutralFallbackQuestion: z.string().trim().min(10).max(500)
    .refine((text) => text.endsWith('?') && (text.match(/\?/g) ?? []).length === 1),
}).strict()

export type ContextQuestionGenerationInstructions = z.infer<typeof contextQuestionGenerationInstructionsSchema>

export const contextQuestionGenerationProvenanceSchema = z.object({
  status: z.enum(['NOT_VERIFIED', 'REJECTED', 'VERIFIED', 'SAFE_FALLBACK']),
  reasonCode: z.string().regex(/^[A-Z0-9_]{2,120}$/),
  generatorVersion: z.string().max(100).optional(),
  questionDigest: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  factsSupportingQuestion: z.array(z.string().max(120)).max(30).optional(),
  unsupportedPresuppositions: z.array(z.string().max(120)).max(30).optional(),
}).strict()

export type ContextQuestionGenerationProvenance = z.infer<typeof contextQuestionGenerationProvenanceSchema>
