import { z } from 'zod'
import {
  AI_INTAKE_CONFIDENCE_LEVELS,
  AI_INTAKE_SUBJECT_CODES,
  type AIClassifierOutput,
} from './ai-classifier-contract'

const subjectCodeSchema = z.enum(AI_INTAKE_SUBJECT_CODES)

const aiClassifierOutputSchema = z
  .object({
    summary: z.string().trim().min(10).max(300),
    primarySubject: subjectCodeSchema,
    secondarySubjects: z.array(subjectCodeSchema).max(5),
    confidence: z.enum(AI_INTAKE_CONFIDENCE_LEVELS),
    alternatives: z.array(subjectCodeSchema).max(5),
  })
  .strict()
  .superRefine((value, context) => {
    for (const [field, subjects] of [
      ['secondarySubjects', value.secondarySubjects],
      ['alternatives', value.alternatives],
    ] as const) {
      if (new Set(subjects).size !== subjects.length) {
        context.addIssue({
          code: 'custom',
          path: [field],
          message: 'Onderwerpcodes moeten uniek zijn.',
        })
      }
    }
  })

export const AI_CLASSIFIER_OUTPUT_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: {
      type: 'string',
    },
    primarySubject: {
      type: 'string',
      enum: AI_INTAKE_SUBJECT_CODES,
    },
    secondarySubjects: {
      type: 'array',
      items: {
        type: 'string',
        enum: AI_INTAKE_SUBJECT_CODES,
      },
      maxItems: 5,
    },
    confidence: {
      type: 'string',
      enum: AI_INTAKE_CONFIDENCE_LEVELS,
    },
    alternatives: {
      type: 'array',
      items: {
        type: 'string',
        enum: AI_INTAKE_SUBJECT_CODES,
      },
      maxItems: 5,
    },
  },
  required: [
    'summary',
    'primarySubject',
    'secondarySubjects',
    'confidence',
    'alternatives',
  ],
} as const)

export function parseAIClassifierOutput(
  value: unknown,
): AIClassifierOutput {
  const parsed = aiClassifierOutputSchema.parse(value)

  return Object.freeze({
    summary: parsed.summary,
    primarySubject: parsed.primarySubject,
    secondarySubjects: Object.freeze([...parsed.secondarySubjects]),
    confidence: parsed.confidence,
    alternatives: Object.freeze([...parsed.alternatives]),
  })
}
