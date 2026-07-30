export const professionalDisciplineCodes = [
  'MIDDELBAAR_VEILIGHEIDSKUNDIGE',
  'HOGER_VEILIGHEIDSKUNDIGE',
  'ARBEIDSHYGIENIST',
  'ERGONOOM',
  'ARBEIDSDESKUNDIGE',
  'BEDRIJFSARTS',
  'ARBEIDS_EN_ORGANISATIEDESKUNDIGE',
  'BRANDVEILIGHEIDSDESKUNDIGE',
  'MACHINEVEILIGHEIDSDESKUNDIGE',
  'ASBESTDESKUNDIGE',
  'MILIEUDESKUNDIGE',
  'BHV_ADVISEUR',
] as const

export type ProfessionalDisciplineCode =
  (typeof professionalDisciplineCodes)[number]

type ProfessionalDisciplineDefinition = Readonly<{
  label: string
  capabilityCodes: readonly string[]
  matchingTags: readonly string[]
}>

export const professionalDisciplines: Readonly<
  Record<ProfessionalDisciplineCode, ProfessionalDisciplineDefinition>
> = Object.freeze({
  MIDDELBAAR_VEILIGHEIDSKUNDIGE: Object.freeze({
    label: 'Middelbaar Veiligheidskundige (MVK)',
    capabilityCodes: Object.freeze(['middelbare-veiligheidskundige']),
    matchingTags: Object.freeze([
      'middelbare-veiligheidskundige',
      'mvk-diploma',
    ]),
  }),
  HOGER_VEILIGHEIDSKUNDIGE: Object.freeze({
    label: 'Hoger Veiligheidskundige (HVK)',
    capabilityCodes: Object.freeze(['hogere-veiligheidskundige']),
    matchingTags: Object.freeze([
      'hogere-veiligheidskundige',
      'hvk-diploma',
    ]),
  }),
  ARBEIDSHYGIENIST: Object.freeze({
    label: 'Arbeidshygiënist',
    capabilityCodes: Object.freeze(['arbeidshygienist']),
    matchingTags: Object.freeze(['arbeidshygienist']),
  }),
  ERGONOOM: Object.freeze({
    label: 'Ergonoom',
    capabilityCodes: Object.freeze(['ergonoom']),
    matchingTags: Object.freeze(['ergonoom', 'fysieke-belasting']),
  }),
  ARBEIDSDESKUNDIGE: Object.freeze({
    label: 'Arbeidsdeskundige',
    capabilityCodes: Object.freeze(['arbeidsdeskundige']),
    matchingTags: Object.freeze(['arbeidsdeskundige']),
  }),
  BEDRIJFSARTS: Object.freeze({
    label: 'Bedrijfsarts',
    capabilityCodes: Object.freeze(['bedrijfsarts']),
    matchingTags: Object.freeze([
      'bedrijfsarts',
      'bedrijfsartsregistratie',
    ]),
  }),
  ARBEIDS_EN_ORGANISATIEDESKUNDIGE: Object.freeze({
    label: 'Arbeids- en Organisatiedeskundige',
    capabilityCodes: Object.freeze([
      'arbeids-en-organisatiedeskundige',
    ]),
    matchingTags: Object.freeze([
      'arbeids-en-organisatiedeskundige',
    ]),
  }),
  BRANDVEILIGHEIDSDESKUNDIGE: Object.freeze({
    label: 'Brandveiligheidsdeskundige',
    capabilityCodes: Object.freeze(['brandveiligheid']),
    matchingTags: Object.freeze(['brandveiligheid']),
  }),
  MACHINEVEILIGHEIDSDESKUNDIGE: Object.freeze({
    label: 'Machineveiligheidsdeskundige',
    capabilityCodes: Object.freeze(['machineveiligheid']),
    matchingTags: Object.freeze(['machineveiligheid', 'ce-markering']),
  }),
  ASBESTDESKUNDIGE: Object.freeze({
    label: 'Asbestdeskundige',
    capabilityCodes: Object.freeze(['asbest']),
    matchingTags: Object.freeze(['asbest']),
  }),
  MILIEUDESKUNDIGE: Object.freeze({
    label: 'Milieudeskundige',
    capabilityCodes: Object.freeze(['milieudeskundige']),
    matchingTags: Object.freeze([
      'milieudeskundige',
      'milieu-en-vergunningen',
    ]),
  }),
  BHV_ADVISEUR: Object.freeze({
    label: 'BHV-adviseur',
    capabilityCodes: Object.freeze(['brandveiligheid']),
    matchingTags: Object.freeze(['brandveiligheid', 'bhv']),
  }),
})

export function getProfessionalDiscipline(
  code: ProfessionalDisciplineCode,
): ProfessionalDisciplineDefinition {
  return professionalDisciplines[code]
}
