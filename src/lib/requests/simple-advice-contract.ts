import { z } from 'zod'
import { directAdditionalExpertises } from './additional-expertise'
// Existing accepted expertise identities, without the experimental routing contracts.
const EXPERTISE_IDS = ['HVK', 'MVK', 'ARBEIDSHYGIENIST', 'A_EN_O_DESKUNDIGE', 'BEDRIJFSARTS', 'ERGONOMIE_FYSIEKE_BELASTING', 'MACHINEVEILIGHEID', 'GEVAARLIJKE_STOFFEN', 'EXPLOSIEVEILIGHEID', 'INCIDENTONDERZOEK', 'BRANDVEILIGHEID', 'GELUIDSDESKUNDIGE', 'STRALINGSDESKUNDIGE', 'ARBEIDSPSYCHOLOOG', 'VERTROUWENSPERSOON', 'CASEMANAGER_VERZUIM', 'PREVENTIEMEDEWERKER', 'BHV_DESKUNDIGE', 'ARBODIENST', 'KEURINGSINSTANTIE'] as const

export type ExpertiseId = typeof EXPERTISE_IDS[number]

export const requestedExpertiseOptions = [
  {
    "value": "HVK",
    "label": "Hogere veiligheidskundige (HVK)"
  },
  {
    "value": "MVK",
    "label": "Middelbare veiligheidskundige (MVK)"
  },
  {
    "value": "ARBEIDSHYGIENIST",
    "label": "Arbeidshygiënist"
  },
  {
    "value": "A_EN_O_DESKUNDIGE",
    "label": "Arbeids- en organisatiedeskundige"
  },
  {
    "value": "BEDRIJFSARTS",
    "label": "Bedrijfsarts"
  },
  {
    "value": "ERGONOMIE_FYSIEKE_BELASTING",
    "label": "Ergonoom"
  },
  {
    "value": "MACHINEVEILIGHEID",
    "label": "Machineveiligheidsdeskundige"
  },
  {
    "value": "GEVAARLIJKE_STOFFEN",
    "label": "Specialist gevaarlijke stoffen"
  },
  {
    "value": "EXPLOSIEVEILIGHEID",
    "label": "ATEX- en explosieveiligheidsdeskundige"
  },
  {
    "value": "INCIDENTONDERZOEK",
    "label": "Incidentonderzoeker"
  },
  {
    "value": "BRANDVEILIGHEID",
    "label": "Brandveiligheidsadviseur"
  },
  {
    "value": "GELUIDSDESKUNDIGE",
    "label": "Geluidsdeskundige"
  },
  {
    "value": "STRALINGSDESKUNDIGE",
    "label": "Stralingsdeskundige"
  },
  {
    "value": "ARBEIDSPSYCHOLOOG",
    "label": "Arbeidspsycholoog"
  },
  {
    "value": "VERTROUWENSPERSOON",
    "label": "Vertrouwenspersoon"
  },
  {
    "value": "CASEMANAGER_VERZUIM",
    "label": "Casemanager verzuim"
  },
  {
    "value": "PREVENTIEMEDEWERKER",
    "label": "Preventiemedewerker"
  },
  {
    "value": "BHV_DESKUNDIGE",
    "label": "BHV-deskundige"
  },
  {
    "value": "ARBODIENST",
    "label": "Arbodienst"
  },
  {
    "value": "KEURINGSINSTANTIE",
    "label": "Keuringsinstantie"
  }
] as const
export const helpTopicLabels = {
  RIE: 'RI&E', SAFETY: 'Veilig werken / veiligheidsbeleid', MACHINES: 'Machines en arbeidsmiddelen',
  CHEMICALS: 'Gevaarlijke stoffen', EXPOSURE: 'Geluid, stof of andere blootstelling',
  PSYCHOSOCIAL: 'Werkdruk, stress of ongewenst gedrag', REINTEGRATION: 'Ziekte, verzuim of re-integratie',
  ERGONOMICS: 'Ergonomie / fysieke belasting', INCIDENT: 'Ongeval of incident', EMERGENCY: 'BHV / noodsituaties',
  FIRE: 'Brandveiligheid', EXPLOSION: 'Explosiegevaar / ATEX', INSPECTION: 'Keuring of certificering',
  OTHER: 'Anders', UNKNOWN: 'Ik weet het echt niet',
} as const
export const outcomeLabels = { ADVICE: 'Advies', ASSESSMENT: 'Onderzoek / beoordeling', REPORT: 'Document / rapport', IMPLEMENTATION: 'Begeleiding / implementatie', TRAINING: 'Training / instructie', OTHER: 'Anders' } as const
export const locationLabels = { ORGANIZATION: 'Op locatie', OTHER_LOCATION: 'Op andere locatie', REMOTE: 'Remote', COMBINATION: 'Combinatie' } as const
export const startLabels = { AS_SOON_AS_POSSIBLE: 'Zo snel mogelijk', WITHIN_TWO_WEEKS: 'Binnen 2 weken', WITHIN_ONE_MONTH: 'Binnen 1 maand', LATER: 'Later', SPECIFIC_DATE: 'Specifieke voorkeursdatum' } as const
export function deriveSimpleAdviceTitle(description: string) {
  return description.trim().replace(/\s+/g, ' ').slice(0, 200).trim()
}
export const simpleAdviceRouteSchema = z.object({
  routeChoice: z.enum(['KNOWS_EXPERTISE', 'NEEDS_TOPIC'], { message: 'Kies Ja of Nee.' }),
  requestedExpertise: z.enum(EXPERTISE_IDS).nullable(),
  helpTopic: z.enum(Object.keys(helpTopicLabels) as [keyof typeof helpTopicLabels, ...Array<keyof typeof helpTopicLabels>]).nullable(),
}).superRefine((v, ctx) => {
  if (v.routeChoice === 'KNOWS_EXPERTISE' && !v.requestedExpertise) ctx.addIssue({ code: 'custom', path: ['requestedExpertise'], message: 'Kies een deskundigheid.' })
  if (v.routeChoice === 'NEEDS_TOPIC' && !v.helpTopic) ctx.addIssue({ code: 'custom', path: ['helpTopic'], message: 'Kies een onderwerp.' })
})
const optionalText = z.string().trim().max(500, 'Gebruik maximaal 500 tekens.').default('')
export const simpleAdviceSchema = z.object({
  routeChoice: z.enum(['KNOWS_EXPERTISE', 'NEEDS_TOPIC'], { message: 'Kies Ja of Nee.' }),
  requestedExpertise: z.enum(EXPERTISE_IDS).nullable().default(null),
  // Compatibility projection of the existing requestedExpertise; never a second choice.
  primaryExpertise: z.enum(EXPERTISE_IDS).nullable().optional(),
  additionalExpertises: z.array(z.enum(EXPERTISE_IDS)).max(2, 'U kunt maximaal twee aanvullende deskundigheden selecteren.').default([]),
  expertiseSelectionSource: z.literal('USER_SELECTED').default('USER_SELECTED'),
  helpTopic: z.enum(Object.keys(helpTopicLabels) as [keyof typeof helpTopicLabels, ...Array<keyof typeof helpTopicLabels>]).nullable().default(null),
  helpTopicOther: optionalText,
  requestTitle: z.string().trim().min(5, 'Gebruik minimaal 5 tekens voor de titel.').max(200, 'Gebruik maximaal 200 tekens.'),
  requestDescription: z.string().trim().min(20, 'Beschrijf uw vraag in minimaal 20 tekens.').max(4000, 'Gebruik maximaal 4000 tekens.'),
  desiredOutcome: z.enum(Object.keys(outcomeLabels) as [keyof typeof outcomeLabels, ...Array<keyof typeof outcomeLabels>], { message: 'Kies wat u wilt bereiken.' }),
  desiredOutcomeOther: optionalText,
  workLocationMode: z.enum(['ORGANIZATION', 'OTHER_LOCATION', 'REMOTE', 'COMBINATION'], { message: 'Kies waar de opdracht wordt uitgevoerd.' }),
  organizationLocationId: z.string().uuid().nullable().default(null),
  organizationLocationCity: z.string().trim().max(120).default(''),
  otherLocationCity: z.string().trim().max(120).default(''),
  combinationModes: z.array(z.enum(['ORGANIZATION', 'OTHER_LOCATION', 'REMOTE'])).max(3).default([]),
  desiredStartMode: z.enum(Object.keys(startLabels) as [keyof typeof startLabels, ...Array<keyof typeof startLabels>], { message: 'Kies wanneer u wilt starten.' }),
  desiredStartDate: z.string().default(''),
}).strict().superRefine((v, ctx) => {
  const error = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
  const route = simpleAdviceRouteSchema.safeParse(v)
  if (!route.success) for (const issue of route.error.issues) ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message })
  if (v.primaryExpertise !== undefined && v.primaryExpertise !== (v.routeChoice === 'KNOWS_EXPERTISE' ? v.requestedExpertise : null)) error('requestedExpertise', 'De primaire deskundigheid komt niet overeen met uw keuze.')
  if (v.routeChoice === 'NEEDS_TOPIC' && v.additionalExpertises.length) error('additionalExpertises', 'Kies eerst zelf een primaire deskundigheid.')
  if (new Set(v.additionalExpertises).size !== v.additionalExpertises.length) error('additionalExpertises', 'Selecteer iedere aanvullende deskundigheid maximaal één keer.')
  if (v.additionalExpertises.some(id => !directAdditionalExpertises(v.requestedExpertise ?? '').includes(id))) error('additionalExpertises', 'Kies uitsluitend de aanvullende deskundigheden bij uw primaire keuze.')
  if (v.desiredOutcome === 'OTHER' && !v.desiredOutcomeOther) error('desiredOutcomeOther', 'Licht toe wat u wilt bereiken.')
  if (v.workLocationMode === 'COMBINATION' && new Set(v.combinationModes).size < 2) error('combinationModes', 'Kies minimaal twee uitvoeringsvormen.')
  if (usesLocation(v, 'OTHER_LOCATION') && !v.otherLocationCity) error('otherLocationCity', 'Vul de plaats in.')
  if (v.desiredStartMode === 'SPECIFIC_DATE' && (!/^\d{4}-\d{2}-\d{2}$/.test(v.desiredStartDate) || !Number.isFinite(Date.parse(v.desiredStartDate)) || new Date(v.desiredStartDate).toISOString().slice(0, 10) !== v.desiredStartDate)) error('desiredStartDate', 'Kies een geldige datum.')
}).transform(({ primaryExpertise, ...v }) => ({ ...v,
  primaryExpertise: primaryExpertise ?? (v.routeChoice === 'KNOWS_EXPERTISE' ? v.requestedExpertise : null),
  requestedExpertise: v.routeChoice === 'KNOWS_EXPERTISE' ? v.requestedExpertise : null,
  helpTopic: v.routeChoice === 'NEEDS_TOPIC' ? v.helpTopic : null,
  helpTopicOther: v.routeChoice === 'NEEDS_TOPIC' && v.helpTopic === 'OTHER' ? v.helpTopicOther : '',
  desiredOutcomeOther: v.desiredOutcome === 'OTHER' ? v.desiredOutcomeOther : '',
  organizationLocationId: usesLocation(v, 'ORGANIZATION') ? v.organizationLocationId : null,
  organizationLocationCity: usesLocation(v, 'ORGANIZATION') && !v.organizationLocationId ? v.organizationLocationCity : '',
  otherLocationCity: usesLocation(v, 'OTHER_LOCATION') ? v.otherLocationCity : '',
  combinationModes: v.workLocationMode === 'COMBINATION' ? [...new Set(v.combinationModes)] : [],
  desiredStartDate: v.desiredStartMode === 'SPECIFIC_DATE' ? v.desiredStartDate : '',
}))
export type SimpleAdviceInput = z.output<typeof simpleAdviceSchema>
export function usesLocation(v: { workLocationMode: string; combinationModes: readonly string[] }, mode: string) {
  return v.workLocationMode === mode || (v.workLocationMode === 'COMBINATION' && v.combinationModes.includes(mode))
}
export function simpleAdviceSummary(v: SimpleAdviceInput, organizationLocation?: string) {
  return [
    [v.routeChoice === 'KNOWS_EXPERTISE' ? 'Primaire deskundigheid' : 'Onderwerp', v.requestedExpertise ? requestedExpertiseOptions.find(o => o.value === v.requestedExpertise)!.label : `${helpTopicLabels[v.helpTopic!]}${v.helpTopicOther ? `: ${v.helpTopicOther}` : ''}`],
    ...(v.routeChoice === 'KNOWS_EXPERTISE' && v.additionalExpertises.length ? [['Aanvullende deskundigheden', v.additionalExpertises.map(id => requestedExpertiseOptions.find(o => o.value === id)!.label).join(', ')]] : []),
    ['Beschrijving', v.requestDescription],
    ['Gewenst resultaat', v.desiredOutcome === 'OTHER' ? v.desiredOutcomeOther : outcomeLabels[v.desiredOutcome]],
    ['Uitvoering', v.workLocationMode === 'COMBINATION' ? v.combinationModes.map(m => locationLabels[m]).join(', ') : locationLabels[v.workLocationMode]],
    ...(usesLocation(v, 'ORGANIZATION') ? [['Organisatielocatie', v.organizationLocationCity || organizationLocation || 'Uw organisatielocatie']] : []),
    ...(usesLocation(v, 'OTHER_LOCATION') ? [['Plaats', v.otherLocationCity]] : []),
    ['Gewenste start', v.desiredStartMode === 'SPECIFIC_DATE' ? v.desiredStartDate.split('-').reverse().join('-') : startLabels[v.desiredStartMode]],
  ]
}
