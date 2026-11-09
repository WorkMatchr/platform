import { knownService, scopeReference } from './assignment-scope'
type Term = {
  id: string
  code: string
  label: string
  isActive: boolean
  version: { version: number; status: string; taxonomy: { kind: string } }
}
export type ScopePolicyRow = {
  serviceTerm: Term
  requirementTerm: Term
  specialismTermId: string | null
  kind: string
  isRequired: boolean
  minimumVerification: string
  requiresValidity: boolean
  requiresProfessionalLiability: boolean
}
export function qualifyScopePolicy(r: ScopePolicyRow) {
  return (
    knownService(r.serviceTerm.code) &&
    r.serviceTerm.version.taxonomy.kind === 'SERVICE' &&
    r.serviceTerm.version.status === 'PUBLISHED' &&
    r.serviceTerm.isActive &&
    r.serviceTerm.version.version === 2 &&
    r.specialismTermId === null &&
    r.kind === 'QUALIFICATION' &&
    !r.isRequired &&
    r.minimumVerification === 'SELF_DECLARED' &&
    !r.requiresValidity &&
    !r.requiresProfessionalLiability &&
    r.requirementTerm.version.taxonomy.kind === 'QUALIFICATION' &&
    r.requirementTerm.version.status === 'PUBLISHED' &&
    r.requirementTerm.isActive &&
    r.requirementTerm.code === 'STANDARD_SERVICE_SCOPE' &&
    r.requirementTerm.label === scopeReference
  )
}
