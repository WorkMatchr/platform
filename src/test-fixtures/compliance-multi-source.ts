import { buildComplianceV2Report } from '@/lib/compliance/compliance-v2'
import { v2Definition, v2Answers, v2Context } from './compliance-v2'

export function multiSourceReport() {
  const definition = v2Definition()
  definition.version = '2.1'
  const original = definition.modules[0].rules[0]
  const source = original.sources[0]
  original.sources.push({ ...source, title: 'Tweede beoordeelde claim', claimId: '40000000-0000-4000-8000-000000000002', claimChecksum: 'b'.repeat(64) })
  definition.modules[1].rules[0].sources = [{ ...source, title: 'Andere bronrevisie', sourceVersionId: '50000000-0000-4000-8000-000000000002', sourceChecksum: 'c'.repeat(64), category: 'GUIDANCE' }]
  definition.modules[2].rules[0].sources = [{ ...source, id: '60000000-0000-4000-8000-000000000003', title: 'Tweede richtlijn', category: 'GUIDANCE' }]
  return buildComplianceV2Report(definition, v2Answers, v2Context)
}
