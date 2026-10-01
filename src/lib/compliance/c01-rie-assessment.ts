import { publicSources, resolvePublicSources } from '@/content/public-sources'
import { aggregateComplianceModule } from '@/lib/compliance/module-aggregation'
import { evaluateComplianceRules, type ComplianceAnswerMap } from '@/lib/compliance/rule-engine'
import { c01RieQuestions, c01RieRequiredQuestionCodes, c01RieRules, c01RieSourceIds, C01_RIE_VERSION } from './c01-rie'

const statusLabels = {
  IN_ORDER: 'Op orde',
  ATTENTION_REQUIRED: 'Aandacht nodig',
  ACTION_REQUIRED: 'Actie vereist',
  NOT_ASSESSED: 'Niet beoordeeld',
  NOT_APPLICABLE: 'Niet van toepassing',
} as const

const legacyStatus = {
  IN_ORDER: 'ORDER',
  ATTENTION_REQUIRED: 'CHECK',
  ACTION_REQUIRED: 'ACTION',
  NOT_ASSESSED: 'CHECK',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const

const allowedByQuestion = new Map(c01RieQuestions.map((question) => [question.code, new Set(question.options)]))

export function normalizeC01RieAnswers(raw: Readonly<Record<string, unknown>>): ComplianceAnswerMap {
  const normalized: Record<string, string> = {}
  for (const question of c01RieQuestions) {
    const value = raw[question.code]
    if (typeof value === 'string' && allowedByQuestion.get(question.code)?.has(value as never)) normalized[question.code] = value
  }
  return normalized
}

export function evaluateC01Rie(raw: Readonly<Record<string, unknown>>) {
  const answers = normalizeC01RieAnswers(raw)
  const matchedRules = evaluateComplianceRules(c01RieRules, answers)
  const answeredQuestionCodes = new Set(Object.keys(answers))
  const aggregation = aggregateComplianceModule({
    moduleCode: 'C01',
    matchedRules,
    requiredQuestionCodes: c01RieRequiredQuestionCodes,
    answeredQuestionCodes,
  })
  const findings = matchedRules.filter((rule) => rule.findingCode)
  const sources = resolvePublicSources(c01RieSourceIds)

  return {
    version: C01_RIE_VERSION,
    answers,
    aggregation,
    findings,
    sources,
  }
}

export function buildC01RieReportSnapshot(input: {
  rawAnswers: Readonly<Record<string, unknown>>
  organizationName: string | null
  scannedAt: Date
}) {
  const assessment = evaluateC01Rie(input.rawAnswers)
  const primaryFinding = assessment.findings.find((finding) => finding.assessmentStatus === 'ACTION_REQUIRED')
    ?? assessment.findings.find((finding) => finding.assessmentStatus === 'ATTENTION_REQUIRED')
    ?? assessment.findings.find((finding) => finding.assessmentStatus === 'NOT_ASSESSED')

  const sourceSnapshots = assessment.sources.map((source) => ({
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    reviewedAt: source.reviewedAt,
    category: source.id === 'arbowet-current' ? 'LEGISLATION' as const : 'GUIDANCE' as const,
  }))

  const result = {
    id: 'C01',
    title: 'RI&E',
    status: legacyStatus[assessment.aggregation.assessmentStatus],
    statusLabel: statusLabels[assessment.aggregation.assessmentStatus],
    explanation: primaryFinding?.findingBody
      ?? (assessment.aggregation.assessmentStatus === 'IN_ORDER'
        ? 'Binnen de beoordeelde RI&E-onderwerpen zijn op basis van uw antwoorden geen aandachtspunten vastgesteld.'
        : 'De beschikbare antwoorden zijn onvoldoende voor een volledige beoordeling van deze module.'),
    nextStep: primaryFinding?.recommendedAction
      ?? (assessment.aggregation.assessmentStatus === 'IN_ORDER'
        ? 'Blijf beoordelen of wijzigingen in werkzaamheden, locaties of risico\'s aanleiding geven om de RI&E te actualiseren.'
        : 'Controleer de ontbrekende of onzekere informatie en beoordeel deze module daarna opnieuw.'),
    relevance: 'De RI&E brengt arbeidsrisico\'s systematisch in beeld en vormt de basis voor passende maatregelen en het Plan van Aanpak.',
    sources: sourceSnapshots,
    extended: {
      answerKeys: Object.keys(assessment.answers),
      legalBasisAvailable: sourceSnapshots.length > 0,
      priority: assessment.aggregation.priority ?? 'NORMAL',
      assessmentMode: assessment.aggregation.assessmentMode,
      findingCode: primaryFinding?.findingCode ?? undefined,
      serviceSuggestionCode: primaryFinding?.serviceSuggestionCode ?? undefined,
    },
  }

  return {
    schemaVersion: 1 as const,
    tier: 'EXTENDED' as const,
    organizationName: input.organizationName,
    scannedAt: input.scannedAt.toISOString(),
    assessmentVersion: 1,
    reportVersion: '1.0',
    summary: {
      order: result.status === 'ORDER' ? 1 : 0,
      action: result.status === 'ACTION' ? 1 : 0,
      check: result.status === 'CHECK' ? 1 : 0,
      notApplicable: result.status === 'NOT_APPLICABLE' ? 1 : 0,
    },
    results: [result],
    attentionItems: result.status === 'ORDER' || result.status === 'NOT_APPLICABLE' ? [] : [result],
    sources: sourceSnapshots,
    disclaimer: 'De scan beoordeelt geselecteerde arbo-onderwerpen op basis van door u verstrekte informatie. De uitkomst vervangt geen formele RI&E, Plan van Aanpak, wettelijke keuring, inspectie, meting, specialistische beoordeling of certificering.',
    extendedCapabilities: ['status', 'priority', 'answer-basis', 'source-traceability'],
    managementSummary: primaryFinding
      ? `Voor RI&E is ${statusLabels[assessment.aggregation.assessmentStatus].toLowerCase()}: ${primaryFinding.findingTitle}.`
      : 'De RI&E-module is beoordeeld op basis van de beschikbare antwoorden.',
    scenarioIds: assessment.findings.map((finding) => finding.findingCode!).filter(Boolean),
    scenarioLabels: assessment.findings.map((finding) => finding.findingTitle!).filter(Boolean),
  }
}

export function getC01RieSourceMetadata() {
  return c01RieSourceIds.map((id) => publicSources[id])
}
