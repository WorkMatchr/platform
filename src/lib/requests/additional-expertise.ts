import type { ExpertiseId } from './simple-advice-contract'

// Product-owner approved direct relationships. No inference or conditional expansion.
export const additionalExpertiseMatrix = {
  HVK: ['MVK', 'ARBEIDSHYGIENIST', 'INCIDENTONDERZOEK'],
  MVK: ['HVK', 'MACHINEVEILIGHEID', 'ERGONOMIE_FYSIEKE_BELASTING'],
  ARBEIDSHYGIENIST: ['GEVAARLIJKE_STOFFEN', 'GELUIDSDESKUNDIGE', 'STRALINGSDESKUNDIGE'],
  A_EN_O_DESKUNDIGE: ['ARBEIDSPSYCHOLOOG', 'VERTROUWENSPERSOON'],
  BEDRIJFSARTS: ['CASEMANAGER_VERZUIM', 'ARBEIDSPSYCHOLOOG', 'A_EN_O_DESKUNDIGE'],
  ERGONOMIE_FYSIEKE_BELASTING: ['ARBEIDSHYGIENIST', 'MVK', 'BEDRIJFSARTS'],
  MACHINEVEILIGHEID: ['MVK', 'HVK'],
  GEVAARLIJKE_STOFFEN: ['ARBEIDSHYGIENIST', 'EXPLOSIEVEILIGHEID'],
  EXPLOSIEVEILIGHEID: ['GEVAARLIJKE_STOFFEN', 'ARBEIDSHYGIENIST', 'BRANDVEILIGHEID'],
  INCIDENTONDERZOEK: ['HVK', 'MVK', 'MACHINEVEILIGHEID'],
  BRANDVEILIGHEID: ['BHV_DESKUNDIGE', 'EXPLOSIEVEILIGHEID'],
  GELUIDSDESKUNDIGE: ['ARBEIDSHYGIENIST'],
  STRALINGSDESKUNDIGE: ['ARBEIDSHYGIENIST'],
  ARBEIDSPSYCHOLOOG: ['A_EN_O_DESKUNDIGE', 'BEDRIJFSARTS', 'VERTROUWENSPERSOON'],
  VERTROUWENSPERSOON: ['A_EN_O_DESKUNDIGE', 'ARBEIDSPSYCHOLOOG'],
  CASEMANAGER_VERZUIM: ['BEDRIJFSARTS', 'ARBODIENST'],
  PREVENTIEMEDEWERKER: ['MVK', 'HVK', 'ARBEIDSHYGIENIST', 'ERGONOMIE_FYSIEKE_BELASTING', 'A_EN_O_DESKUNDIGE'],
  BHV_DESKUNDIGE: ['BRANDVEILIGHEID', 'MVK'],
  ARBODIENST: ['BEDRIJFSARTS', 'ARBEIDSHYGIENIST', 'A_EN_O_DESKUNDIGE', 'HVK'],
  KEURINGSINSTANTIE: ['MACHINEVEILIGHEID'],
} as const satisfies Record<ExpertiseId, readonly ExpertiseId[]>

export function directAdditionalExpertises(primary: string): readonly ExpertiseId[] {
  return Object.hasOwn(additionalExpertiseMatrix, primary)
    ? additionalExpertiseMatrix[primary as ExpertiseId] : []
}

export function retainAdditionalExpertises(primary: string, values: readonly string[]): ExpertiseId[] {
  const allowed = directAdditionalExpertises(primary)
  return [...new Set(values)].filter((value): value is ExpertiseId => allowed.some(id => id === value)).slice(0, 2)
}
