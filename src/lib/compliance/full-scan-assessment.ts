import { resolvePublicSources } from '@/content/public-sources'
import { c01RieQuestions, c01RieSourceIds } from './c01-rie'
import { evaluateC01Rie } from './c01-rie-assessment'
import { determineComplianceModuleApplicability } from './free-intake-applicability'
import { complianceFreeIntakeModuleTitles, type ComplianceModuleCode } from './free-intake'
import { aggregateComplianceModule, type ComplianceAssessmentMode, type ComplianceAssessmentStatus, type CompliancePriority } from './module-aggregation'
import { evaluateComplianceRules, type ComplianceAnswerMap, type ComplianceMatchedRule, type ComplianceRuleDefinition } from './rule-engine'
import { fullScanModules, fullScanQuestionLabels, type FullScanModuleDefinition } from './full-scan-content'

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

export type FullComplianceModuleResult = Readonly<{
  moduleCode: ComplianceModuleCode
  title: string
  applicability: 'RELEVANT' | 'POSSIBLY_RELEVANT' | 'NOT_APPLICABLE'
  assessmentStatus: ComplianceAssessmentStatus
  priority: CompliancePriority | null
  assessmentMode: ComplianceAssessmentMode
  sufficientlyAssessed: boolean
  findings: readonly ComplianceMatchedRule[]
  answerKeys: readonly string[]
  sourceIds: readonly string[]
}>

function normalizeModuleAnswers(module: FullScanModuleDefinition, raw: Readonly<Record<string, unknown>>): ComplianceAnswerMap {
  const normalized: Record<string, string> = {}
  for (const question of module.questions) {
    const value = raw[question.code]
    if (typeof value === 'string' && ['YES', 'PARTIAL', 'NO', 'UNKNOWN'].includes(value)) normalized[question.code] = value
  }
  return normalized
}

function findingRule(input: {
  module: FullScanModuleDefinition
  questionCode: string
  value: 'NO' | 'PARTIAL' | 'UNKNOWN'
  position: number
}): ComplianceRuleDefinition {
  const { module, questionCode, value, position } = input
  const isUnknown = value === 'UNKNOWN'
  const isNo = value === 'NO'
  return {
    code: module.code + '-' + questionCode.split('-').at(-1) + '-' + value,
    moduleCode: module.code,
    condition: { question: questionCode, equals: value },
    applicability: 'RELEVANT',
    assessmentStatus: isNo ? 'ACTION_REQUIRED' : 'ATTENTION_REQUIRED',
    priority: isNo ? 'HIGH' : isUnknown ? 'NORMAL' : 'NORMAL',
    assessmentMode: module.mode,
    findingCode: module.code + '_' + questionCode.split('-').at(-1) + '_' + value,
    findingTitle: isNo
      ? module.title + ': onderdeel niet geregeld'
      : isUnknown
        ? module.title + ': informatie niet vastgesteld'
        : module.title + ': onderdeel slechts gedeeltelijk geregeld',
    findingBody: isNo
      ? 'U geeft aan dat dit onderdeel niet of onvoldoende is geregeld.'
      : isUnknown
        ? 'Op basis van uw antwoord kan dit onderdeel niet inhoudelijk worden vastgesteld.'
        : 'U geeft aan dat dit onderdeel gedeeltelijk is geregeld en verdere beoordeling of aanvulling nodig heeft.',
    recommendedAction: isNo
      ? 'Breng dit onderdeel aantoonbaar op orde en leg vast hoe de maatregel in de praktijk wordt uitgevoerd en onderhouden.'
      : isUnknown
        ? 'Controleer de feitelijke situatie en leg de ontbrekende informatie vast voordat u dit onderdeel als beheerst beschouwt.'
        : 'Werk het ontbrekende deel uit, leg verantwoordelijkheden vast en controleer de praktische werking.',
    serviceSuggestionCode: module.serviceSuggestionCode,
    position,
  }
}

function positiveRule(module: FullScanModuleDefinition, position: number): ComplianceRuleDefinition {
  const all = module.questions.map((question) => ({ question: question.code, equals: 'YES' as const }))
  if (module.mode === 'FULL') {
    return {
      code: module.code + '-ALL-YES',
      moduleCode: module.code,
      condition: { all },
      applicability: 'RELEVANT',
      assessmentStatus: 'IN_ORDER',
      priority: 'LOW',
      assessmentMode: module.mode,
      position,
    }
  }

  return {
    code: module.code + '-SCREENING-COMPLETE',
    moduleCode: module.code,
    condition: { all },
    applicability: 'RELEVANT',
    assessmentStatus: 'NOT_ASSESSED',
    priority: 'LOW',
    assessmentMode: module.mode,
    findingCode: module.code + '_SCREENING_LIMIT',
    findingTitle: module.mode === 'SPECIALIST_REQUIRED' ? 'Specialistische beoordeling nodig' : 'Screening afgerond; technische beoordeling ontbreekt',
    findingBody: module.specialistReason ?? 'De antwoorden geven geen direct aandachtssignaal, maar deze screening stelt niet vast dat technische maatregelen of blootstellingen voldoende zijn beoordeeld.',
    recommendedAction: module.mode === 'SPECIALIST_REQUIRED'
      ? 'Laat dit onderwerp beoordelen door een deskundige met passende specialistische kennis.'
      : 'Bepaal of een verdiepende technische beoordeling, inspectie, berekening of meting nodig is.',
    serviceSuggestionCode: module.serviceSuggestionCode,
    position,
  }
}

function buildRules(module: FullScanModuleDefinition): readonly ComplianceRuleDefinition[] {
  const rules: ComplianceRuleDefinition[] = []
  let position = 1
  for (const question of module.questions) {
    rules.push(findingRule({ module, questionCode: question.code, value: 'NO', position: position++ }))
    rules.push(findingRule({ module, questionCode: question.code, value: 'PARTIAL', position: position++ }))
    rules.push(findingRule({ module, questionCode: question.code, value: 'UNKNOWN', position: position++ }))
  }
  rules.push(positiveRule(module, position))
  return rules
}

function assessGenericModule(
  module: FullScanModuleDefinition,
  applicability: 'RELEVANT' | 'POSSIBLY_RELEVANT' | 'NOT_APPLICABLE',
  rawAnswers: Readonly<Record<string, unknown>>,
): FullComplianceModuleResult {
  if (applicability === 'NOT_APPLICABLE') {
    return {
      moduleCode: module.code,
      title: module.title,
      applicability,
      assessmentStatus: 'NOT_APPLICABLE',
      priority: null,
      assessmentMode: module.mode,
      sufficientlyAssessed: true,
      findings: [],
      answerKeys: [],
      sourceIds: module.sourceIds,
    }
  }

  const answers = normalizeModuleAnswers(module, rawAnswers)
  const matchedRules = evaluateComplianceRules(buildRules(module), answers)
  const aggregation = aggregateComplianceModule({
    moduleCode: module.code,
    matchedRules,
    requiredQuestionCodes: module.questions.map((question) => question.code),
    answeredQuestionCodes: new Set(Object.keys(answers)),
  })

  return {
    moduleCode: module.code,
    title: module.title,
    applicability,
    assessmentStatus: aggregation.assessmentStatus,
    priority: aggregation.priority,
    assessmentMode: aggregation.assessmentMode,
    sufficientlyAssessed: aggregation.sufficientlyAssessed,
    findings: matchedRules.filter((rule) => rule.findingCode),
    answerKeys: Object.keys(answers),
    sourceIds: module.sourceIds,
  }
}

function assessC01(
  applicability: 'RELEVANT' | 'POSSIBLY_RELEVANT' | 'NOT_APPLICABLE',
  rawAnswers: Readonly<Record<string, unknown>>,
): FullComplianceModuleResult {
  if (applicability === 'NOT_APPLICABLE') {
    return {
      moduleCode: 'C01',
      title: 'RI&E',
      applicability,
      assessmentStatus: 'NOT_APPLICABLE',
      priority: null,
      assessmentMode: 'FULL',
      sufficientlyAssessed: true,
      findings: [],
      answerKeys: [],
      sourceIds: c01RieSourceIds,
    }
  }
  const result = evaluateC01Rie(rawAnswers)
  return {
    moduleCode: 'C01',
    title: 'RI&E',
    applicability,
    assessmentStatus: result.aggregation.assessmentStatus,
    priority: result.aggregation.priority,
    assessmentMode: result.aggregation.assessmentMode,
    sufficientlyAssessed: result.aggregation.sufficientlyAssessed,
    findings: result.findings,
    answerKeys: Object.keys(result.answers),
    sourceIds: c01RieSourceIds,
  }
}

export function evaluateFullComplianceScan(input: {
  intakeAnswers: Readonly<Record<string, unknown>>
  scanAnswers: Readonly<Record<string, unknown>>
}) {
  const applicability = determineComplianceModuleApplicability(input.intakeAnswers)
  const byCode = new Map(applicability.map((item) => [item.moduleCode, item]))
  const results: FullComplianceModuleResult[] = []

  const c01Applicability = byCode.get('C01')?.applicability ?? 'POSSIBLY_RELEVANT'
  results.push(assessC01(c01Applicability, input.scanAnswers))

  for (const module of fullScanModules) {
    results.push(assessGenericModule(
      module,
      byCode.get(module.code)?.applicability ?? 'POSSIBLY_RELEVANT',
      input.scanAnswers,
    ))
  }

  return {
    results,
    counts: {
      inOrder: results.filter((result) => result.assessmentStatus === 'IN_ORDER').length,
      attention: results.filter((result) => result.assessmentStatus === 'ATTENTION_REQUIRED').length,
      action: results.filter((result) => result.assessmentStatus === 'ACTION_REQUIRED').length,
      notAssessed: results.filter((result) => result.assessmentStatus === 'NOT_ASSESSED').length,
      notApplicable: results.filter((result) => result.assessmentStatus === 'NOT_APPLICABLE').length,
    },
  }
}

function firstFinding(result: FullComplianceModuleResult) {
  return result.findings.find((finding) => finding.assessmentStatus === 'ACTION_REQUIRED')
    ?? result.findings.find((finding) => finding.assessmentStatus === 'ATTENTION_REQUIRED')
    ?? result.findings.find((finding) => finding.assessmentStatus === 'NOT_ASSESSED')
}

export function buildFullComplianceReportSnapshot(input: {
  intakeAnswers: Readonly<Record<string, unknown>>
  scanAnswers: Readonly<Record<string, unknown>>
  organizationName: string | null
  scannedAt: Date
}) {
  const assessment = evaluateFullComplianceScan(input)
  const allSourceIds = [...new Set(assessment.results.flatMap((result) => result.sourceIds))]
  const sources = resolvePublicSources(allSourceIds)
  const sourceById = new Map(sources.map((source) => [source.id, source]))

  const reportResults = assessment.results.map((result) => {
    const finding = firstFinding(result)
    const resultSources = result.sourceIds.map((id) => sourceById.get(id)!).filter(Boolean)
    const sourceSnapshots = resultSources.map((source) => ({
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      reviewedAt: source.reviewedAt,
      category: source.id === 'arbowet-current' ? 'LEGISLATION' as const : 'GUIDANCE' as const,
    }))

    let explanation: string
    let nextStep: string

    if (result.assessmentStatus === 'NOT_APPLICABLE') {
      explanation = 'Dit onderwerp is op basis van de intake niet van toepassing op de beoordeelde scope.'
      nextStep = 'Herbeoordeel de toepasselijkheid wanneer werkzaamheden, groepen medewerkers of risico’s veranderen.'
    } else if (finding) {
      explanation = finding.findingBody ?? 'Dit onderwerp vraagt nadere aandacht.'
      nextStep = finding.recommendedAction ?? 'Beoordeel dit onderwerp nader.'
    } else if (result.assessmentStatus === 'IN_ORDER') {
      explanation = 'Binnen dit beoordeelde onderdeel zijn op basis van uw antwoorden geen aandachtspunten vastgesteld.'
      nextStep = 'Blijf controleren of de situatie verandert en actualiseer de beoordeling wanneer dat nodig is.'
    } else {
      explanation = 'De beschikbare antwoorden zijn onvoldoende voor een inhoudelijke eindbeoordeling.'
      nextStep = 'Vul ontbrekende informatie aan of laat het onderwerp nader beoordelen.'
    }

    return {
      id: result.moduleCode,
      title: result.title,
      status: legacyStatus[result.assessmentStatus],
      statusLabel: statusLabels[result.assessmentStatus],
      explanation,
      nextStep,
      relevance: 'Dit onderwerp is onderdeel van de geselecteerde Arbo Compliance Scan voor de huidige organisatiescope.',
      sources: sourceSnapshots,
      extended: {
        answerKeys: result.answerKeys,
        legalBasisAvailable: sourceSnapshots.length > 0,
        priority: result.priority ?? 'NORMAL',
        assessmentMode: result.assessmentMode,
        findingCode: finding?.findingCode ?? undefined,
        serviceSuggestionCode: finding?.serviceSuggestionCode ?? undefined,
      },
    }
  })

  const allSourceSnapshots = sources.map((source) => ({
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    reviewedAt: source.reviewedAt,
    category: source.id === 'arbowet-current' ? 'LEGISLATION' as const : 'GUIDANCE' as const,
  }))

  const attentionItems = reportResults.filter((result) => result.status === 'ACTION' || result.status === 'CHECK')

  return {
    schemaVersion: 1 as const,
    tier: 'EXTENDED' as const,
    organizationName: input.organizationName,
    scannedAt: input.scannedAt.toISOString(),
    assessmentVersion: 2,
    reportVersion: '2.0',
    summary: {
      order: reportResults.filter((result) => result.status === 'ORDER').length,
      action: reportResults.filter((result) => result.status === 'ACTION').length,
      check: reportResults.filter((result) => result.status === 'CHECK').length,
      notApplicable: reportResults.filter((result) => result.status === 'NOT_APPLICABLE').length,
    },
    results: reportResults,
    attentionItems,
    sources: allSourceSnapshots,
    disclaimer: 'De scan beoordeelt geselecteerde arbo-onderwerpen op basis van door de gebruiker verstrekte informatie. De scan vervangt geen formele RI&E, Plan van Aanpak, wettelijke keuring, inspectie, meting, specialistische beoordeling of certificering.',
    extendedCapabilities: ['status', 'priority', 'assessment-mode', 'answer-basis', 'source-traceability', 'action-plan'],
    managementSummary: 'De scan bevat ' + assessment.counts.action + ' onderwerp(en) met actie vereist, ' + assessment.counts.attention + ' met aandacht nodig en ' + assessment.counts.notAssessed + ' die niet volledig inhoudelijk zijn beoordeeld.',
    scenarioIds: attentionItems.flatMap((result) => result.extended.findingCode ? [result.extended.findingCode] : []),
    scenarioLabels: attentionItems.map((result) => result.title + ': ' + result.statusLabel),
  }
}

export function getFullScanQuestionLabels() {
  return new Map<string, string>([
    ...c01RieQuestions.map((question) => [question.code, question.prompt] as const),
    ...fullScanQuestionLabels.entries(),
  ])
}

export const allFullScanQuestions = [
  ...c01RieQuestions.map((question) => ({
    code: question.code,
    prompt: question.prompt,
    moduleCode: 'C01' as const,
    options: question.options,
  })),
  ...fullScanModules.flatMap((module) => module.questions.map((question) => ({
    code: question.code,
    prompt: question.prompt,
    moduleCode: module.code,
    options: ['YES', 'PARTIAL', 'NO', 'UNKNOWN'] as const,
  }))),
]
