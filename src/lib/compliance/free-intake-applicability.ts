import {
  complianceFreeIntakeModuleTitles,
  complianceFreeIntakeQuestions,
  type ComplianceModuleCode,
} from './free-intake'
import type { ComplianceApplicability } from './module-aggregation'
import type { ComplianceAnswerMap, ComplianceAnswerValue } from './rule-engine'

type ModuleApplicability = Readonly<{
  moduleCode: ComplianceModuleCode
  title: string
  applicability: ComplianceApplicability
  reasonCode: string
}>

const questionOptions = new Map(
  complianceFreeIntakeQuestions.map((question) => [question.code, new Set<ComplianceAnswerValue>(question.options)]),
)

function has(value: ComplianceAnswerValue | undefined, option: string) {
  return Array.isArray(value) ? value.includes(option) : value === option
}

function unknown(value: ComplianceAnswerValue | undefined) {
  return value === undefined || has(value, 'UNKNOWN')
}

function moduleResult(
  moduleCode: ComplianceModuleCode,
  applicability: ComplianceApplicability,
  reasonCode: string,
): ModuleApplicability {
  return {
    moduleCode,
    title: complianceFreeIntakeModuleTitles[moduleCode],
    applicability,
    reasonCode,
  }
}

export function normalizeComplianceFreeIntakeAnswers(raw: Readonly<Record<string, unknown>>): ComplianceAnswerMap {
  const normalized: Record<string, ComplianceAnswerValue> = {}

  for (const question of complianceFreeIntakeQuestions) {
    const value = raw[question.code]
    const allowed = questionOptions.get(question.code)
    if (!allowed) continue

    if (question.inputType === 'MULTI_SELECT') {
      if (!Array.isArray(value)) continue
      const selected = value.filter((item): item is string => typeof item === 'string' && allowed.has(item))
      if (selected.length === 0) continue
      const exclusive = selected.filter((item) => item === 'NONE' || item === 'UNKNOWN')
      normalized[question.code] = exclusive.length > 0 ? [exclusive[0]!] : [...new Set(selected)]
      continue
    }

    if (typeof value === 'string' && allowed.has(value)) normalized[question.code] = value
  }

  return normalized
}

export function determineComplianceModuleApplicability(raw: Readonly<Record<string, unknown>>): readonly ModuleApplicability[] {
  const answers = normalizeComplianceFreeIntakeAnswers(raw)
  const hasEmployees = answers['FI-01']

  const coreApplicability: ComplianceApplicability = hasEmployees === 'YES' ? 'RELEVANT' : 'POSSIBLY_RELEVANT'
  const result: ModuleApplicability[] = (Object.keys(complianceFreeIntakeModuleTitles) as ComplianceModuleCode[])
    .filter((code) => code.startsWith('C'))
    .map((code) => moduleResult(code, coreApplicability, hasEmployees === 'YES' ? 'EMPLOYER_CORE' : 'EMPLOYER_SCOPE_UNCLEAR'))

  const q03 = answers['FI-03']
  const q04 = answers['FI-04']
  const q05 = answers['FI-05']
  const q06 = answers['FI-06']
  const q07 = answers['FI-07']
  const q08 = answers['FI-08']
  const q09 = answers['FI-09']
  const q10 = answers['FI-10']
  const q11 = answers['FI-11']
  const q12 = answers['FI-12']

  const push = (code: ComplianceModuleCode, relevant: boolean, uncertain: boolean, relevantReason: string, noneReason = 'PROFILE_NO_SIGNAL') => {
    result.push(moduleResult(code, relevant ? 'RELEVANT' : uncertain ? 'POSSIBLY_RELEVANT' : 'NOT_APPLICABLE', relevant ? relevantReason : uncertain ? 'PROFILE_UNKNOWN' : noneReason))
  }

  push('R01', has(q04, 'MACHINES') || has(q04, 'WORK_EQUIPMENT'), unknown(q04), 'WORK_EQUIPMENT_PRESENT')
  push('R02',
    has(q04, 'MACHINES') || has(q04, 'WORK_EQUIPMENT') || has(q05, 'HAZARDOUS_SUBSTANCES') || has(q08, 'NOISE') || has(q09, 'HEIGHT'),
    unknown(q04) || unknown(q05) || unknown(q08) || unknown(q09),
    'PPE_POTENTIALLY_REQUIRED',
  )
  push('R03', has(q05, 'HAZARDOUS_SUBSTANCES'), unknown(q05), 'HAZARDOUS_SUBSTANCES_PRESENT')
  push('R04', has(q06, 'PHYSICAL_LOAD'), unknown(q06), 'PHYSICAL_LOAD_PRESENT')
  push('R05', has(q03, 'HOME') || has(q06, 'DISPLAY_SCREEN'), unknown(q03) || unknown(q06), 'DISPLAY_OR_HOME_WORK_PRESENT')
  push('R06', q07 === 'YES', unknown(q07), 'PSA_SIGNAL_PRESENT')
  push('R07', has(q08, 'NOISE'), unknown(q08), 'NOISE_PRESENT')
  push('R08', has(q08, 'VIBRATION'), unknown(q08), 'VIBRATION_PRESENT')
  push('R09', has(q09, 'HEIGHT'), unknown(q09), 'WORK_AT_HEIGHT_PRESENT')
  push('R10', q11 === 'YES', unknown(q11), 'YOUNG_WORKERS_PRESENT', 'NO_YOUNG_WORKERS')
  push('R11', q12 === 'YES', unknown(q12), 'PREGNANCY_RELATED_WORK_RISK_PRESENT', 'NO_PREGNANCY_RELATED_WORK_RISK')
  push('R12', has(q05, 'BIOLOGICAL_AGENTS'), unknown(q05), 'BIOLOGICAL_AGENTS_PRESENT')
  push('R13', has(q10, 'LONE_WORK'), unknown(q10), 'LONE_WORK_PRESENT')
  push('R14', has(q10, 'NIGHT_OR_SHIFT'), unknown(q10), 'NIGHT_OR_SHIFT_WORK_PRESENT')
  push('R15', has(q03, 'THIRD_PARTY_LOCATIONS'), unknown(q03), 'THIRD_PARTY_WORK_PRESENT')
  push('R16', has(q04, 'VEHICLES'), unknown(q04), 'VEHICLES_PRESENT')
  push('R17', has(q08, 'CLIMATE'), unknown(q08), 'CLIMATE_RISK_PRESENT')
  push('R18', has(q06, 'WORKPLACE_SETUP') || has(q06, 'DISPLAY_SCREEN') || has(q03, 'HOME'), unknown(q03) || unknown(q06), 'WORKPLACE_SETUP_RELEVANT')
  push('R19', has(q05, 'HAZARDOUS_SUBSTANCES') || has(q05, 'ATEX'), unknown(q05), 'FIRE_OR_EXPLOSION_SIGNAL_PRESENT')
  push('R20', has(q09, 'ELECTRICAL'), unknown(q09), 'ELECTRICAL_RISK_PRESENT')
  push('R21', has(q09, 'RADIATION'), unknown(q09), 'RADIATION_PRESENT')
  push('R22', has(q09, 'PRESSURE'), unknown(q09), 'PRESSURE_EQUIPMENT_PRESENT')
  push('R23', has(q05, 'ATEX'), unknown(q05), 'ATEX_SIGNAL_PRESENT')

  return result.sort((a, b) => a.moduleCode.localeCompare(b.moduleCode))
}

export function buildComplianceFreeIntakeTeaser(raw: Readonly<Record<string, unknown>>) {
  const answers = normalizeComplianceFreeIntakeAnswers(raw)
  const modules = determineComplianceModuleApplicability(raw)
  const coreSignals = ['FI-13', 'FI-14', 'FI-15'].filter((code) => {
    const value = answers[code]
    return value !== undefined && value !== 'YES'
  }).length

  return {
    version: '1.0' as const,
    answers,
    modules,
    counts: {
      relevant: modules.filter((module) => module.applicability === 'RELEVANT').length,
      possiblyRelevant: modules.filter((module) => module.applicability === 'POSSIBLY_RELEVANT').length,
      notApplicable: modules.filter((module) => module.applicability === 'NOT_APPLICABLE').length,
    },
    coreSignals,
    teaserText: coreSignals > 0
      ? 'Uw antwoorden bevatten signalen die in de volledige scan nader worden beoordeeld.'
      : 'De volledige scan beoordeelt de relevante onderwerpen inhoudelijk en legt de uitkomst per onderwerp vast.',
    detailFindingsAvailable: false as const,
  }
}
