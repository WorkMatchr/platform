import { z } from 'zod'

// Descriptive user context, not expertise identities or assessment/matching rules.
// Version 1 is append-only: change meaning/labels through a new version.
// Source scopes: src/content/simple-advice-context.ts and the existing service content.
export const topicSituationOptions = {
  RIE: { INVENTORY: 'RI&E opstellen', UPDATE: 'RI&E actualiseren', ACTION_PLAN: 'Plan van aanpak', REVIEW: 'Toetsing van de RI&E' },
  SAFETY: { POLICY: 'Veiligheidsbeleid', DAILY_WORK: 'Veilig werken in de praktijk', MEASURES: 'Veiligheidsmaatregelen uitvoeren', PREVENTION: 'Ondersteuning van de preventiemedewerker' },
  MACHINES: { GUARDING: 'Afscherming van machines', SAFE_USE: 'Veilig gebruik van arbeidsmiddelen', MAINTENANCE: 'Onderhoud van machines', MODIFICATION: 'Aanpassing van machines' },
  CHEMICALS: { REGISTER: 'Overzicht van gebruikte stoffen', STORAGE: 'Opslag van gevaarlijke stoffen', LABELS: 'Etiketten en veiligheidsinformatiebladen', HANDLING: 'Werken met gevaarlijke stoffen' },
  EXPOSURE: { NOISE: 'Geluid op de werkplek', DUST: 'Stof, dampen of rook', SUBSTANCES: 'Gevaarlijke stoffen', VENTILATION: 'Ventilatie of binnenklimaat', VIBRATION: 'Trillingen' },
  PSYCHOSOCIAL: { WORKLOAD: 'Werkdruk en stress', COOPERATION: 'Samenwerking op het werk', CONDUCT: 'Ongewenst gedrag', SUPPORT: 'Vertrouwelijke ondersteuning' },
  REINTEGRATION: { ABSENCE: 'Hoog ziekteverzuim', LONG_ABSENCE: 'Langdurig verzuim', RETURN: 'Re-integratie en werkhervatting', PROCESS: 'Begeleiding van het verzuimproces' },
  ERGONOMICS: { WORKSTATION: 'Inrichting van werkplekken', LIFTING: 'Tillen, duwen of trekken', POSTURE: 'Werkhoudingen', REPETITION: 'Repeterend werk' },
  INCIDENT: { ACCIDENT: 'Arbeidsongeval', NEAR_MISS: 'Bijna-ongeval', INVESTIGATION: 'Onderzoek naar de omstandigheden', PREVENTION: 'Leren van een incident' },
  EMERGENCY: { ORGANIZATION: 'Organisatie en bezetting van BHV', EVACUATION: 'Ontruiming', EXERCISE: 'Oefenen met noodsituaties', TRAINING: 'BHV-training of instructie' },
  FIRE: { ESCAPE: 'Vluchtroutes', COMPARTMENTS: 'Brandcompartimenten', INSTALLATIONS: 'Brandveiligheidsinstallaties', PROVISIONS: 'Brandveiligheidsvoorzieningen' },
  EXPLOSION: { ATMOSPHERE: 'Explosieve atmosferen', IGNITION: 'Ontstekingsbronnen', ZONES: 'Explosiegevaarlijke zones', DOCUMENT: 'Explosieveiligheidsdocument' },
  INSPECTION: { PERIODIC: 'Periodieke keuring', TECHNICAL: 'Technische inspectie', CERTIFICATION: 'Certificering', CONFORMITY: 'Conformiteitsbeoordeling' },
  // No invented thematic classification when the visitor has not identified a topic.
  OTHER: {}, UNKNOWN: {},
} as const
export type SituationTopic = keyof typeof topicSituationOptions
export const situationExtraOptions = { UNKNOWN: 'Ik weet het nog niet precies', OTHER: 'Anders, namelijk...' } as const

export function hasTopicSituations(topic: string): topic is SituationTopic {
  return Object.hasOwn(topicSituationOptions, topic) && Object.keys(topicSituationOptions[topic as SituationTopic]).length > 0
}

export function situationOptions(topic: SituationTopic): Record<string, string> {
  return { ...topicSituationOptions[topic], ...situationExtraOptions }
}

export const topicSituationsSchema = z.object({
  version: z.literal(1),
  topic: z.enum(Object.keys(topicSituationOptions) as [SituationTopic, ...SituationTopic[]]),
  selected: z.array(z.string().max(40)).max(10),
  otherText: z.string().trim().max(500, 'Gebruik maximaal 500 tekens.').default(''),
}).strict().superRefine((v, ctx) => {
  const invalid = (message: string) => ctx.addIssue({ code: 'custom', message })
  if (!hasTopicSituations(v.topic)) invalid('Bij dit onderwerp is geen aanvullende situatiekeuze nodig.')
  if (new Set(v.selected).size !== v.selected.length) invalid('Kies iedere situatie maximaal één keer.')
  if (v.selected.some(code => !Object.hasOwn(situationOptions(v.topic), code))) invalid('Kies uitsluitend situaties bij uw onderwerp.')
  if (v.selected.includes('UNKNOWN') && v.selected.length > 1) invalid('Kies onbekend of één of meer situaties.')
  if (!v.selected.includes('OTHER') && v.otherText) invalid('Selecteer Anders om een toelichting te bewaren.')
})
export type TopicSituations = z.output<typeof topicSituationsSchema>

export function toggleTopicSituation(value: TopicSituations, code: string): TopicSituations {
  const selected = value.selected.includes(code) ? value.selected.filter(item => item !== code)
    : code === 'UNKNOWN' ? ['UNKNOWN'] : [...value.selected.filter(item => item !== 'UNKNOWN'), code]
  return { ...value, selected, otherText: selected.includes('OTHER') ? value.otherText : '' }
}

export function topicSituationSummary(value?: TopicSituations) {
  if (!value) return ''
  const labels = situationOptions(value.topic)
  return value.selected.map(code => code === 'OTHER' ? `Anders: ${value.otherText}` : labels[code]).join('; ')
}

// Shared by complete publication and partial server draft validation.
export function validateTopicSituations(v: { routeChoice?: unknown; helpTopic?: unknown; topicSituations?: TopicSituations }, ctx: z.RefinementCtx, complete = false) {
  const value = v.topicSituations
  if (!value) return // Existing snapshots and drafts remain readable without fabricated answers.
  const invalid = (message: string) => ctx.addIssue({ code: 'custom', path: ['topicSituations'], message })
  if (v.routeChoice !== 'NEEDS_TOPIC' || value.topic !== v.helpTopic) invalid('De situaties horen niet bij uw gekozen onderwerp.')
  if (complete && !value.selected.length) invalid('Kies een situatie of geef aan dat u het nog niet weet.')
  if (complete && value.selected.includes('OTHER') && !value.otherText) invalid('Licht uw andere situatie kort toe.')
}
