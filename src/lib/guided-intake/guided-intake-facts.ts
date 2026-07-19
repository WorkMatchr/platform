import type { GuidedAnswers, GuidedFact, GuidedQuestionId } from './guided-intake-types'

const factLabels = {
  START_SITUATION: 'Situatie',
  EMPLOYEE_COUNT: 'Aantal werkenden',
  RIE_STATUS: 'Status RI&E',
  DECISION_GOAL: 'Belangrijkste vraag',
  DESIRED_TIMING: 'Gewenste termijn',
} as const satisfies Record<GuidedQuestionId, string>

const answerLabels: Record<string, string> = {
  HAS_EMPLOYEES: 'De organisatie heeft personeel in dienst',
  ONE: '1 persoon',
  TWO_TO_TWENTY_FIVE: '2 tot en met 25 personen',
  MORE_THAN_TWENTY_FIVE: 'Meer dan 25 personen',
  CURRENT: 'Actuele RI&E aanwezig',
  OUTDATED: 'RI&E mogelijk verouderd',
  NONE: 'Nog geen RI&E',
  UNKNOWN: 'RI&E-status onbekend',
  LEGAL_CLARITY: 'Duidelijkheid over verplichtingen',
  RISKS: 'Inzicht in arbeidsrisico’s',
  IMPROVE_RIE: 'Actualiteit en passendheid van de RI&E',
  PRACTICAL_SUPPORT: 'Praktische aanpak',
  ORIENTING: 'Eerst oriënteren',
  SOON: 'Zo snel mogelijk',
  SPECIFIC_DATE: 'Voor een specifieke datum',
}

export function deriveGuidedFacts(answers: GuidedAnswers): GuidedFact[] {
  const facts: GuidedFact[] = []

  for (const questionId of Object.keys(factLabels) as GuidedQuestionId[]) {
    const value = answers[questionId]
    if (!value) continue
    facts.push({
      key: questionId === 'START_SITUATION' ? 'HAS_EMPLOYEES' : questionId,
      value: questionId === 'START_SITUATION' ? true : value,
      label: `${factLabels[questionId]}: ${answerLabels[value]}`,
      sourceQuestionId: questionId,
    })
  }

  if (answers.DESIRED_TIMING === 'SPECIFIC_DATE' && answers.desiredDate) {
    facts.push({
      key: 'DESIRED_DATE',
      value: answers.desiredDate,
      label: `Gewenste datum: ${new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${answers.desiredDate}T00:00:00Z`))}`,
      sourceQuestionId: 'DESIRED_TIMING',
    })
  }

  return facts
}
