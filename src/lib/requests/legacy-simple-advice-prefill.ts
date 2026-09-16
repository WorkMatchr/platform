import type { IntakeDetailView } from '@/lib/intakes/intake-query-service'
import { startLabels } from './simple-advice-contract'

/** Exact stored answers only. Detected expertise and Knowledge context are not user choices. */
export function legacySimpleAdvicePrefill(intake: Pick<IntakeDetailView, 'freeText' | 'questions'>) {
  const text = (key: string) => {
    const value = intake.questions.find(q => q.key === key)?.value
    return typeof value === 'string' ? value : ''
  }
  const options = (key: string) => {
    const question = intake.questions.find(q => q.key === key)
    return question?.options.filter(o => Array.isArray(question.value) && question.value.includes(o.id)).map(o => o.value) ?? []
  }
  const outcome = text('GENERAL_SUPPORT_GOAL') || text('DESIRED_OUTCOME_DESCRIPTION')
  const work = options('PREFERRED_WORK_MODE')
  const modes = work.flatMap(mode => mode === 'ON_SITE' ? ['ORGANIZATION'] : mode === 'REMOTE' ? ['REMOTE'] : mode === 'HYBRID' ? ['ORGANIZATION', 'REMOTE'] : [])
  const date = text('PREFERRED_START_DATE')
  const start = options('PREFERRED_START')[0] ?? options('SUPPORT_URGENCY')[0] ?? ''
  const location = options('LOCATION_MODE')[0]
  const locationMode = location === 'REGISTERED' ? 'ORGANIZATION' : location === 'OTHER' ? 'OTHER_LOCATION' : location === 'REMOTE' ? 'REMOTE' : ''
  const topics: Record<string, string> = { RIE: 'RIE', BHV: 'EMERGENCY', HAZARDOUS_SUBSTANCES: 'CHEMICALS', INCIDENT: 'INCIDENT', ERGONOMICS: 'ERGONOMICS', MACHINERY_SAFETY: 'MACHINES', PSA: 'PSYCHOSOCIAL', OTHER: 'OTHER', NOT_SURE: 'UNKNOWN' }
  const category = options('CONFIRMED_HELP_CATEGORY')[0]
  const helpTopic = category ? topics[category] : undefined
  return {
    ...(helpTopic ? { routeChoice: 'NEEDS_TOPIC', helpTopic } : {}),
    requestDescription: text('HELP_REQUEST_DESCRIPTION') || intake.freeText,
    desiredOutcome: outcome ? 'OTHER' : '', desiredOutcomeOther: outcome,
    organizationLocationId: text('REGISTERED_LOCATION') || text('PRIMARY_LOCATION'),
    otherLocationCity: text('OTHER_LOCATION_CITY'),
    workLocationMode: locationMode || (modes.length > 1 ? 'COMBINATION' : modes[0] ?? ''),
    combinationModes: modes.length > 1 ? modes : [],
    desiredStartMode: date ? 'SPECIFIC_DATE' : start in startLabels ? start : '',
    desiredStartDate: date,
  }
}
