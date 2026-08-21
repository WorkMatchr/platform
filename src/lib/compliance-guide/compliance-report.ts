import { resolvePublicSources, type PublicSourceId } from '@/content/public-sources'
import { selectArboGuideSources, toArboGuideReportSource, type ArboGuideReportSource } from '@/lib/arbo-guides/arbo-guide-sources'
import {
  COMPLIANCE_GUIDE_VERSION,
  complianceResultLabels,
  evaluateComplianceGuide,
  normalizeComplianceGuideAnswers,
  summarizeComplianceResults,
  type ComplianceGuideAnswers,
  type ComplianceResultStatus,
} from './compliance-guide'

export const complianceReportTiers = ['BASIC', 'EXTENDED'] as const
export type ComplianceReportTier = (typeof complianceReportTiers)[number]
export const COMPLIANCE_REPORT_VERSION = '1.0'

export const COMPLIANCE_REPORT_DISCLAIMER =
  'De Compliance-wijzer geeft een indicatief overzicht op basis van de ingevoerde antwoorden. De uitkomst is geen formele juridische beoordeling, certificering of garantie dat aan alle toepasselijke wet- en regelgeving wordt voldaan.'

export type ComplianceReportSource = ArboGuideReportSource

export type ComplianceReportResult = Readonly<{
  id: string
  title: string
  status: ComplianceResultStatus
  statusLabel: string
  explanation: string
  nextStep: string
  relevance: string
  sources: readonly ComplianceReportSource[]
  extended: Readonly<{
    answerKeys: readonly string[]
    legalBasisAvailable: boolean
    priority: 'HIGH' | 'NORMAL'
  }>
}>

export type ComplianceReportData = Readonly<{
  schemaVersion: 1
  tier: ComplianceReportTier
  organizationName: string | null
  scannedAt: string
  assessmentVersion: number
  reportVersion: string
  summary: ReturnType<typeof summarizeComplianceResults>
  results: readonly ComplianceReportResult[]
  attentionItems: readonly ComplianceReportResult[]
  sources: readonly ComplianceReportSource[]
  disclaimer: string
  extendedCapabilities: readonly string[]
}>

type SourceBearingResult = Readonly<{ sourceIds: readonly PublicSourceId[] }>

export function collectComplianceSources(results: readonly SourceBearingResult[]): readonly ComplianceReportSource[] {
  return selectArboGuideSources(results.flatMap((result) => resolvePublicSources(result.sourceIds).map(toArboGuideReportSource)))
}

const resultAnswerKeys: Record<string, readonly (keyof ComplianceGuideAnswers)[]> = {
  policy: ['generalPolicy'],
  rie: ['rie', 'actionPlan', 'rieUpdated', 'rieTesting'],
  prevention: ['employeeCount', 'preventionOfficer', 'preventionConsultation'],
  bhv: ['bhvOrganized', 'bhvAppointed', 'bhvRiskBased', 'bhvPrepared'],
  contract: ['basicContract', 'occupationalPhysicianAccess', 'expertTasksCovered'],
  pago: ['pagoOffered'],
  instruction: ['instruction', 'supervision'],
  consultation: ['representation', 'workerConsultation'],
  accidents: ['accidentRegistration', 'accidentReporting'],
}

function cleanOrganizationName(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, 160) : null
}

export function buildComplianceReportData(input: Readonly<{
  answers: Partial<Record<keyof ComplianceGuideAnswers, unknown>>
  organizationName?: string | null
  scannedAt: Date
  tier: ComplianceReportTier
}>): ComplianceReportData {
  const answers = normalizeComplianceGuideAnswers(input.answers)
  const evaluated = evaluateComplianceGuide(answers)
  const results = evaluated.map((result): ComplianceReportResult => ({
    id: result.id,
    title: result.title,
    status: result.status,
    statusLabel: complianceResultLabels[result.status],
    explanation: result.explanation,
    nextStep: result.nextStep,
    relevance: result.relevance,
    sources: resolvePublicSources(result.sourceIds).map(toArboGuideReportSource),
    extended: {
      answerKeys: resultAnswerKeys[result.id] ?? [],
      legalBasisAvailable: result.sourceIds.length > 0,
      priority: result.status === 'ACTION' ? 'HIGH' : 'NORMAL',
    },
  }))
  const sources = collectComplianceSources(evaluated)

  return {
    schemaVersion: 1,
    tier: input.tier,
    organizationName: cleanOrganizationName(input.organizationName),
    scannedAt: input.scannedAt.toISOString(),
    assessmentVersion: COMPLIANCE_GUIDE_VERSION,
    reportVersion: COMPLIANCE_REPORT_VERSION,
    summary: summarizeComplianceResults(evaluated),
    results,
    attentionItems: results.filter((result) => result.status === 'ACTION' || result.status === 'CHECK'),
    sources,
    disclaimer: COMPLIANCE_REPORT_DISCLAIMER,
    extendedCapabilities: [
      'MANAGEMENT_SUMMARY', 'ANSWER_BASIS', 'LEGAL_BASIS', 'ACTION_PLAN',
      'PRIORITIES', 'HISTORY_COMPARISON', 'PDCA_FOLLOW_UP',
    ],
  }
}
