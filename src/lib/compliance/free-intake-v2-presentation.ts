import { freeIntakeV2Guidance } from './free-intake-v2-guidance'
import { freeIntakeV2Interests, freeIntakeV2Signals, freeIntakeV2Questions, normalizeFreeIntakeV2, orientFreeIntakeV2, type IntakeAnswers } from './free-intake-v2'

// Clarify the UI without rewriting the versioned answer contract. In particular,
// OTHER still expresses possible unlisted work, never a confirmed risk.
export const freeIntakeV2DisplayQuestions = freeIntakeV2Questions.map(question => {
  if (question.code !== 'FI2-04') return question
  const alternatives: Record<string, { label: string; group: string }> = {
    OTHER: { label: 'Mogelijk andere werkzaamheden of situaties die niet in de lijst staan', group: 'Aanvullende situaties' },
    NONE_RECOGNIZED: { label: 'Ik herken geen van de genoemde situaties', group: 'Of kies één van deze alternatieven' },
    UNKNOWN: { label: 'Ik kan nog niet inschatten welke situaties voorkomen', group: 'Of kies één van deze alternatieven' },
  }
  return {
    ...question,
    help: 'Kies de werkzaamheden en situaties die u herkent; meerdere keuzes zijn mogelijk. Herkent u niets of kunt u dit nog niet inschatten? Kies dan onderaan één van die alternatieven. Niet gekozen betekent niet dat een risico afwezig is. Vermeld geen medische omstandigheden of persoonsgegevens.',
    options: [
      ...question.options.filter(option => !alternatives[option.value]),
      ...['OTHER', 'NONE_RECOGNIZED', 'UNKNOWN'].map(value => ({ value, ...alternatives[value] })),
    ],
  }
})

// Presentation only: applicability, answer codes and stored drafts stay unchanged.
export const FREE_INTAKE_SHORTLIST_LIMIT = 4

export function presentFreeIntakeV2(raw: IntakeAnswers) {
  const answers = normalizeFreeIntakeV2(raw)
  const orientation = orientFreeIntakeV2(answers)
  const risks = Array.isArray(answers['FI2-04']) ? answers['FI2-04'] : []
  const interests = Array.isArray(answers['FI2-05']) ? answers['FI2-05'] : []
  // Reuse the domain mappings; interest is never evidence of applicability.
  const preferred = new Set(interests.flatMap(value => freeIntakeV2Interests[value] ?? []))
  const modules = orientation.modules.map(module => {
    const matched = freeIntakeV2Questions[3].options
      .filter(option => risks.includes(option.value) && freeIntakeV2Signals[module.code]?.includes(option.value))
      .map(option => option.label)
    const selectedInterest = preferred.has(module.code)
    const multipleLocations = risks.includes('MULTIPLE_LOCATIONS') && ['C01', 'C05'].includes(module.code)
    const direct = matched.length > 0 || multipleLocations
    const explanation = [
      selectedInterest ? 'Dit sluit aan op uw gekozen informatiebehoefte.' : null,
      matched.length ? `U herkent: ${matched.join(', ')}.` : multipleLocations ? 'U werkt op meerdere locaties.' : module.applicability === 'RELEVANT' ? 'U heeft werknemers in dienst.' : null,
      !selectedInterest && !direct && module.applicability !== 'RELEVANT' ? 'Uw antwoorden geven nog geen concrete aanleiding voor dit onderwerp.' : null,
    ].filter(Boolean).join(' ')
    return { ...module, explanation, guidance: freeIntakeV2Guidance[module.code], category: direct ? 'Herkende werksituatie' : module.code.startsWith('C') && module.applicability === 'RELEVANT' ? 'Algemene werkgeversbasis' : selectedInterest ? 'Uw informatiebehoefte' : 'Nog niet onderzocht', priority: selectedInterest ? 3 : direct ? 2 : module.applicability === 'RELEVANT' ? 1 : 0 }
  }).sort((a, b) => b.priority - a.priority ||
    Number(interests.includes('OTHER_RISKS') && b.code.startsWith('R')) - Number(interests.includes('OTHER_RISKS') && a.code.startsWith('R')) ||
    a.code.localeCompare(b.code))
  const shortlist = modules.filter(module => module.priority > 0).slice(0, FREE_INTAKE_SHORTLIST_LIMIT)
  const selected = new Set(shortlist.map(module => module.code))
  return { shortlist, remaining: modules.filter(module => !selected.has(module.code)) }
}
