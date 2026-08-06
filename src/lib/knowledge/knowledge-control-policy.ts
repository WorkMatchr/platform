import type { KnowledgeControlRisk } from '@/generated/prisma/enums'

export type KnowledgeControlRequirement = Readonly<{
  automatedSourceControlAllowed: boolean
  humanControlRequiredByRiskAlone: boolean
  humanControlRequiredForPublication: boolean
  minimumCurrentAuthoritativeSources: number
  sampleRate: number
  reviewIntervalMonths: number
}>

const requirements = {
  LOW: {
    automatedSourceControlAllowed: true,
    humanControlRequiredByRiskAlone: false,
    humanControlRequiredForPublication: false,
    minimumCurrentAuthoritativeSources: 1,
    sampleRate: 0,
    reviewIntervalMonths: 24,
  },
  MEDIUM: {
    automatedSourceControlAllowed: true,
    humanControlRequiredByRiskAlone: false,
    humanControlRequiredForPublication: false,
    minimumCurrentAuthoritativeSources: 1,
    sampleRate: 0,
    reviewIntervalMonths: 12,
  },
  HIGH: {
    automatedSourceControlAllowed: true,
    humanControlRequiredByRiskAlone: false,
    humanControlRequiredForPublication: true,
    minimumCurrentAuthoritativeSources: 1,
    sampleRate: 0,
    reviewIntervalMonths: 6,
  },
  CRITICAL: {
    automatedSourceControlAllowed: true,
    humanControlRequiredByRiskAlone: false,
    humanControlRequiredForPublication: true,
    minimumCurrentAuthoritativeSources: 2,
    sampleRate: 0,
    reviewIntervalMonths: 3,
  },
} as const satisfies Record<KnowledgeControlRisk, KnowledgeControlRequirement>

export function getKnowledgeControlRequirement(risk: KnowledgeControlRisk): KnowledgeControlRequirement {
  return requirements[risk]
}
