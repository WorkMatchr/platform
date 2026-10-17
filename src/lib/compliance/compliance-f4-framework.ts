import 'server-only'
import { getPrisma } from '@/lib/prisma'
import { loadComplianceV2Framework } from './compliance-v2-framework'
import { complianceChecksum } from './compliance-v2'
import { buildF4Definition, type F4SourceBindings } from './compliance-f4-definition'
import { F4_BINDING, f4Catalog } from './compliance-f4-catalog'

export const isF4Enabled = () => process.env.COMPLIANCE_F4_ENABLED === 'true'

export async function loadF4Framework() {
  const definition = await loadComplianceV2Framework(getPrisma(), F4_BINDING.id)
  const bindings: F4SourceBindings = {}
  for (const q of f4Catalog.filter(q => q.kind === 'LEGAL' || q.kind === 'RECOMMENDATION')) {
    const rule = definition.modules.flatMap(m => m.rules).find(r => r.code === `${q.code}-YES`)
    if (!rule) throw new Error('F4-vraagbinding ontbreekt.')
    bindings[q.code] = rule.sources
  }
  if (complianceChecksum(buildF4Definition(bindings)) !== complianceChecksum(definition)) throw new Error('De gepubliceerde versie komt niet overeen met deze wijzer.')
  return definition
}
