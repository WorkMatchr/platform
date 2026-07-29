import type {
  ContextFact,
  GuidanceSourceReference,
  HelpRequest,
  Situation,
  Uncertainty,
} from './guidance-domain'

export const GUIDANCE_CONTRACT_SCHEMA_VERSION =
  'guidance-contract/1.0.0' as const

/**
 * Immutable invoergrens tussen een verduidelijkte hulpvraag en een toekomstige
 * Guidance Engine. Het contract bevat geen afleiding of engine-uitkomst.
 */
export type GuidanceContract = Readonly<{
  schemaVersion: typeof GUIDANCE_CONTRACT_SCHEMA_VERSION
  id: string
  version: number
  source: GuidanceSourceReference
  questionSetVersion: string
  situation: Situation
  helpRequest: HelpRequest
  facts: readonly ContextFact[]
  uncertainties: readonly Uncertainty[]
  createdAt: string
}>
