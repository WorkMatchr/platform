import type { ExpertiseId } from './simple-advice-contract'

// Identity translation only: the accepted 20 choices, never inferred expertise.
export const expertiseSpecialismSlugs = {
  HVK: 'hogere-veiligheidskundige', MVK: 'middelbare-veiligheidskundige',
  ARBEIDSHYGIENIST: 'arbeidshygienist', A_EN_O_DESKUNDIGE: 'arbeids-en-organisatiedeskundige',
  BEDRIJFSARTS: 'bedrijfsarts', ERGONOMIE_FYSIEKE_BELASTING: 'ergonoom',
  MACHINEVEILIGHEID: 'machineveiligheid', GEVAARLIJKE_STOFFEN: 'gevaarlijke-stoffen',
  EXPLOSIEVEILIGHEID: 'explosieveiligheid', INCIDENTONDERZOEK: 'incidentonderzoek',
  BRANDVEILIGHEID: 'brandveiligheid', GELUIDSDESKUNDIGE: 'geluidsdeskundige',
  STRALINGSDESKUNDIGE: 'stralingsdeskundige', ARBEIDSPSYCHOLOOG: 'arbeidspsycholoog',
  VERTROUWENSPERSOON: 'vertrouwenspersoon', CASEMANAGER_VERZUIM: 'casemanager-verzuim',
  PREVENTIEMEDEWERKER: 'preventiemedewerker', BHV_DESKUNDIGE: 'bhv-deskundige',
  ARBODIENST: 'arbodienst', KEURINGSINSTANTIE: 'keuringsinstantie',
} as const satisfies Record<ExpertiseId, string>
