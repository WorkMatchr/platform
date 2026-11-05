import type { ComplianceV2Report } from './compliance-v2'
import { canonicalJson } from './compliance-v2-conditions'

// Read only the frozen definition and matched evidence, never the current catalog.
// Legacy summary arrays deduplicate by source ID and can omit claim/revision bindings.
export function complianceReportSources(report: ComplianceV2Report, resultId?: string) {
  const bindings = report.results.filter(result => resultId === undefined || result.id === resultId).flatMap(result => {
    const definitionModule = report.definitionSnapshot.modules.find(item => item.code === result.id)
    return result.evidence.flatMap(evidence => {
      const rule = definitionModule?.rules.find(item => item.id === evidence.ruleId && item.code === evidence.ruleCode)
      if (!rule) throw new Error('Rapportbron kan niet worden herleid tot de opgeslagen beoordeling.')
      return rule.sources
    })
  })
  return [...new Map(bindings.map(source => [canonicalJson(source), source])).values()]
}
