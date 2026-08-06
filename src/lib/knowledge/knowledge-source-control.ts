import type {
  KnowledgeControlRisk,
  KnowledgeSourceControlStatus,
} from '@/generated/prisma/enums'
import { getKnowledgeControlRequirement } from './knowledge-control-policy'

export type KnowledgeSourceControlInput = Readonly<{
  risk: KnowledgeControlRisk
  currentAuthoritativeSourceFamilies: readonly string[]
  hasConflict: boolean
  hasOutdatedSource: boolean
  hasUnclearApplicability: boolean
}>

export type KnowledgeSourceControlResult = Readonly<{
  status: KnowledgeSourceControlStatus
  humanControlRequired: boolean
  minimumCurrentAuthoritativeSources: number
  reasons: readonly string[]
}>

export interface KnowledgeSourceControlService {
  evaluate(input: KnowledgeSourceControlInput): KnowledgeSourceControlResult
}

export const deterministicKnowledgeSourceControl: KnowledgeSourceControlService = {
  evaluate(input) {
    const requirement = getKnowledgeControlRequirement(input.risk)
    const sourceFamilies = new Set(input.currentAuthoritativeSourceFamilies)
    const reasons: string[] = []
    if (input.hasConflict) reasons.push('SOURCE_CONFLICT')
    if (input.hasOutdatedSource) reasons.push('SOURCE_OUTDATED')
    if (input.hasUnclearApplicability) reasons.push('APPLICABILITY_UNCLEAR')
    if (sourceFamilies.size < requirement.minimumCurrentAuthoritativeSources) {
      reasons.push('CURRENT_AUTHORITATIVE_SOURCES_INSUFFICIENT')
    }

    const status: KnowledgeSourceControlStatus = input.hasConflict
      ? 'CONFLICT_DETECTED'
      : input.hasOutdatedSource
        ? 'OUTDATED'
        : input.hasUnclearApplicability
          ? 'HUMAN_EXCEPTION_REQUIRED'
          : sourceFamilies.size === 0
            ? 'SOURCES_REQUIRED'
            : reasons.length === 0
              ? 'CONSISTENT'
              : 'SOURCES_COLLECTED'

    return Object.freeze({
      status,
      humanControlRequired: input.hasConflict || input.hasOutdatedSource || input.hasUnclearApplicability
        || sourceFamilies.size < requirement.minimumCurrentAuthoritativeSources,
      minimumCurrentAuthoritativeSources: requirement.minimumCurrentAuthoritativeSources,
      reasons: Object.freeze(reasons),
    })
  },
}
