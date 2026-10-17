import { buildF4Definition } from '../lib/compliance/compliance-f4-definition'
import { f4Catalog } from '../lib/compliance/compliance-f4-catalog'
import { complianceChecksum } from '../lib/compliance/compliance-v2'
import { v2Definition, v2Context } from './compliance-v2'

// Synthetic local-only bindings: never an operational source registration.
export function f4TestDefinition() {
  const legal = { ...v2Definition().modules[0].rules[0].sources[0], id: '61000000-0000-4000-8000-000000000001', claimId: '41000000-0000-4000-8000-000000000001', sourceVersionId: '51000000-0000-4000-8000-000000000001' }
  legal.claimChecksum = complianceChecksum({ id: legal.claimId, type: 'LEGAL_REQUIREMENT', statement: 'Synthetische F4-testclaim', applicability: 'Test', reviewedAt: v2Context.scannedAt, supportType: 'DIRECT_SUPPORT' })
  const recommendation = { ...legal, id: '61000000-0000-4000-8000-000000000002', claimId: '41000000-0000-4000-8000-000000000002' }
  recommendation.claimChecksum = complianceChecksum({ id: recommendation.claimId, type: 'RECOMMENDATION', statement: 'Synthetische aanbeveling', applicability: 'Test', reviewedAt: v2Context.scannedAt, supportType: 'DIRECT_SUPPORT' })
  return buildF4Definition(Object.fromEntries(f4Catalog.filter(q => ['LEGAL', 'RECOMMENDATION'].includes(q.kind)).map(q => [q.code, [q.kind === 'RECOMMENDATION' ? recommendation : legal]])))
}
export const f4PositiveAnswers = Object.fromEntries(f4Catalog.map(q => [q.code, q.code === 'EMPLOYEECOUNT' ? 'ONE_TO_25' : q.code === 'REPRESENTATION' ? 'OR' : q.code === 'CW2-RIE-05' ? 'OTHER' : 'YES']))
