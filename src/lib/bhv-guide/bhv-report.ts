import { resolvePublicSources } from '@/content/public-sources'
import { selectArboGuideSources, toArboGuideReportSource } from '@/lib/arbo-guides/arbo-guide-sources'
import type { ArboGuideReportSnapshot } from '@/lib/arbo-guides/arbo-guide-run-service'
import { evaluateBhvGuide, normalizeBhvGuideAnswers, selectBhvScenarios, summarizeBhvResults, BHV_GUIDE_VERSION, type BhvGuideAnswers } from './bhv-guide'

export const BHV_REPORT_VERSION = '1.0'
export const BHV_REPORT_DISCLAIMER = 'De BHV-wijzer geeft een indicatieve beoordeling op basis van de ingevoerde antwoorden. De uitkomst is geen formele toets, certificering of garantie dat uw BHV-organisatie aan alle toepasselijke eisen voldoet.'

export function buildBhvReportData(input: Readonly<{ answers: Partial<Record<keyof BhvGuideAnswers, unknown>>; organizationName?: string | null; scannedAt: Date; tier: 'BASIC' | 'EXTENDED' }>): ArboGuideReportSnapshot {
  const answers = normalizeBhvGuideAnswers(input.answers)
  const evaluated = evaluateBhvGuide(answers)
  const scenarios = selectBhvScenarios(answers)
  const results = evaluated.map((result) => ({
    ...result,
    statusLabel: ({ ORDER: 'Op orde', ACTION: 'Actie nodig', CHECK: 'Controleren', NOT_APPLICABLE: 'Niet van toepassing' } as const)[result.status],
    sources: resolvePublicSources(result.sourceIds).map(toArboGuideReportSource),
    extended: { answerKeys: [...result.answerKeys], legalBasisAvailable: true, priority: result.status === 'ACTION' ? 'HIGH' as const : 'NORMAL' as const },
  }))
  const summary = summarizeBhvResults(evaluated)
  const attentionItems = results.filter((result) => result.status === 'ACTION' || result.status === 'CHECK')
  const managementSummary = summary.action > 0
    ? `De beoordeling laat ${summary.action} onderwerp${summary.action === 1 ? '' : 'en'} met directe verbeterbehoefte zien. Begin met feitelijke dekking, alarmering en de scenario’s met de grootste gevolgen.`
    : summary.check > 0 ? `De basis bevat geen duidelijk negatief beoordeelde onderwerpen, maar ${summary.check} onderwerp${summary.check === 1 ? '' : 'en'} vragen nog om controle of aantoonbare vastlegging.`
      : 'De ingevoerde antwoorden wijzen op een samenhangende basis. Blijf veranderingen, oefeningen en beschikbaarheid periodiek toetsen.'
  const sources = selectArboGuideSources(results.flatMap((result) => result.sources))
  const organizationName = input.organizationName?.replace(/\s+/g, ' ').trim().slice(0, 160) || null
  return {
    schemaVersion: 1, tier: input.tier, organizationName, scannedAt: input.scannedAt.toISOString(), assessmentVersion: BHV_GUIDE_VERSION,
    reportVersion: BHV_REPORT_VERSION, summary, results, attentionItems, sources: [...sources], disclaimer: BHV_REPORT_DISCLAIMER,
    managementSummary, scenarioIds: scenarios.map((scenario) => scenario.id), scenarioLabels: scenarios.map((scenario) => scenario.label),
    extendedCapabilities: ['ANSWER_BASIS', 'SCENARIO_DETAIL', 'ACTION_PLAN', 'PRIORITIES', 'HISTORY_COMPARISON', 'PDCA_FOLLOW_UP'],
  }
}
