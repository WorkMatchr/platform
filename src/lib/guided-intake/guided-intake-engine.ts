import { deriveGuidedFacts } from './guided-intake-facts'
import { validateCompleteGuidedIntake } from './guided-intake-flow'
import { selectGuidedRecommendation } from './guided-intake-recommendations'
import type { GuidedAnswers, GuidedIntakeResult } from './guided-intake-types'

export class GuidedIntakeValidationError extends Error {
  constructor(public readonly issues: ReturnType<typeof validateCompleteGuidedIntake>) {
    super('De Advieswijzer is nog niet volledig ingevuld.')
    this.name = 'GuidedIntakeValidationError'
  }
}

export function buildGuidedIntakeResult(answers: GuidedAnswers, today?: string): GuidedIntakeResult {
  const issues = validateCompleteGuidedIntake(answers, today)
  if (issues.length > 0) throw new GuidedIntakeValidationError(issues)

  return {
    facts: deriveGuidedFacts(answers),
    recommendation: selectGuidedRecommendation(answers),
    disclaimer:
      'Dit advies is algemene vraagverheldering op basis van uw antwoorden. Het vervangt geen beoordeling van uw specifieke situatie door een bevoegde deskundige.',
  }
}
