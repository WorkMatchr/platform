import { type ComplianceModuleCode } from './free-intake'
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
const topicGuidance: Record<ComplianceModuleCode, string> = {
  C01: 'Verken hoe u werkzaamheden en risico’s in uw RI&E in beeld brengt.',
  C02: 'Bekijk hoe u maatregelen, verantwoordelijkheden en planning vastlegt in een plan van aanpak.',
  C03: 'Verken de rol en ondersteuning van de preventiemedewerker.',
  C04: 'Bekijk hoe u deskundige arbodienstverlening en het basiscontract organiseert.',
  C05: 'Verken de organisatie van hulp bij ongevallen, brand en ontruiming.',
  C06: 'Verken hoe arbeidsgezondheidskundig onderzoek kan aansluiten op het werk.',
  C07: 'Bekijk hoe u begeleiding bij ziekteverzuim organiseert.',
  C08: 'Verken welke uitleg, instructies en begeleiding bij het werk passen.',
  C09: 'Bekijk hoe u het omgaan met arbeidsongevallen en incidenten organiseert.',
  C10: 'Verken hoe u werknemers betrekt bij gezond en veilig werken.',
  R01: 'Bekijk het veilig gebruiken en onderhouden van arbeidsmiddelen.',
  R02: 'Verken de keuze en het gebruik van persoonlijke beschermingsmiddelen.',
  R03: 'Breng het gebruik van en de mogelijke blootstelling aan stoffen in beeld.',
  R04: 'Bekijk de lichamelijke belasting bij deze werkzaamheden.',
  R05: 'Verken werkhouding, beeldschermgebruik en afwisseling in het werk.',
  R06: 'Verken werkdruk, omgangsvormen en ondersteuning op het werk.',
  R07: 'Bekijk de blootstelling aan geluid tijdens het werk.',
  R08: 'Verken de belasting door trillingen van gereedschap of voertuigen.',
  R09: 'Bekijk de werkwijze en bescherming bij werk op hoogte.',
  R10: 'Verken welke werkzaamheden en begeleiding bij jongeren passen.',
  R11: 'Bekijk welke werkomstandigheden extra aandacht kunnen vragen bij zwangerschap of borstvoeding.',
  R12: 'Verken mogelijke blootstelling aan biologische agentia tijdens het werk.',
  R13: 'Bekijk bereikbaarheid en hulp wanneer iemand alleen werkt.',
  R14: 'Verken de inrichting van werktijden, rust en herstel.',
  R15: 'Bekijk de afstemming over veilig werken op locaties van anderen.',
  R16: 'Verken verkeersbewegingen en het gebruik van voertuigen op het werk.',
  R17: 'Bekijk de invloed van hitte, kou en de fysieke werkomgeving.',
  R18: 'Verken de inrichting en bruikbaarheid van de werkplek.',
  R19: 'Bekijk mogelijke brand- en explosiesituaties bij deze werkzaamheden.',
  R20: 'Verken de werkwijze en veiligheid bij elektrische werkzaamheden.',
  R21: 'Breng mogelijke blootstelling aan straling in beeld.',
  R22: 'Bekijk het werken met en onderhouden van drukapparatuur.',
  R23: 'Verken waar een ontplofbare atmosfeer kan ontstaan.',
}

export const FREE_INTAKE_SHORTLIST_LIMIT = 6

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
      topicGuidance[module.code],
    ].filter(Boolean).join(' ')
    return { ...module, explanation, priority: selectedInterest ? 3 : direct ? 2 : module.applicability === 'RELEVANT' ? 1 : 0 }
  }).sort((a, b) => b.priority - a.priority ||
    Number(interests.includes('OTHER_RISKS') && b.code.startsWith('R')) - Number(interests.includes('OTHER_RISKS') && a.code.startsWith('R')) ||
    a.code.localeCompare(b.code))
  const shortlist = modules.filter(module => module.priority > 0).slice(0, FREE_INTAKE_SHORTLIST_LIMIT)
  const selected = new Set(shortlist.map(module => module.code))
  return { shortlist, remaining: modules.filter(module => !selected.has(module.code)) }
}
