import catalog from './launch-scopes.json'

export type Service = keyof typeof catalog
export const launchScopes = catalog
export const scopeReference = 'V3.0-LAUNCH-01 — Algemene deskundigheid en professionele uitvoering'
export function knownService(value: unknown): value is Service {
  return typeof value === 'string' && Object.hasOwn(catalog, value)
}
// A template describes the entire task, never a substring that could mask an added deliverable.
export const standardTasks: Record<Service, { title: string; task: string; specialists: string[] }> = {
  ERGONOMICS: {
    title: 'Ergonomisch werkplekadvies',
    task: 'Adviseer over de inrichting van beeldschermwerkplekken en praktische aanpassingen van de werkhouding.',
    specialists: ['ergonoom'],
  },
  SAFETY_ADVICE: {
    title: 'Praktisch veiligheidsadvies',
    task: 'Geef praktisch advies over veilig werken en bespreek verbetermaatregelen met het team.',
    specialists: ['hogere-veiligheidskundige', 'middelbare-veiligheidskundige', 'preventiemedewerker'],
  },
  IMPLEMENTATION_SUPPORT: {
    title: 'Invoering van werkprocedures',
    task: 'Begeleid het team bij de invoering van reeds vastgestelde werkprocedures en maatregelen.',
    specialists: ['preventiemedewerker', 'middelbare-veiligheidskundige', 'hogere-veiligheidskundige'],
  },
  INCIDENT_INVESTIGATION: {
    title: 'Feiten en oorzaken van een incident',
    task: 'Breng de werkomstandigheden en procesoorzaken van een incident in kaart en adviseer over preventie.',
    specialists: ['incidentonderzoek'],
  },
  REINTEGRATION_FIRST_TRACK: {
    title: 'Begeleiding bij interne werkhervatting',
    task: 'Begeleid de praktische terugkeer naar passend werk bij de eigen werkgever binnen de vastgestelde mogelijkheden.',
    specialists: ['casemanager-verzuim'],
  },
  REINTEGRATION_SECOND_TRACK: {
    title: 'Begeleiding naar ander werk',
    task: 'Begeleid de werknemer bij het zoeken naar passend werk bij een andere werkgever binnen de vastgestelde mogelijkheden.',
    specialists: ['casemanager-verzuim'],
  },
}
export type Outcome = 'BINNEN_SCOPE' | 'BEOORDELING_NODIG' | 'BUITEN_SCOPE'
const normalize = (s: string) => s.normalize('NFKC').toLocaleLowerCase('nl-NL').replace(/\s+/gu, ' ').trim()
const exclusions: [RegExp, string][] = [
  [
    /\b(?:ri\s*[&e]+\s*e?|risico.inventarisatie|plan van aanpak|pva)\b.{0,80}toets|toets\w*.{0,80}\b(?:ri\s*&?\s*e|plan van aanpak|pva)\b|systeemtoets|scopetoets/u,
    'Een formele RI&E- of PvA-toets valt buiten deze dienst.',
  ],
  [
    /belastbaarheid.{0,36}(beoord|bepal|vaststell)|medisch\w*.{0,36}(belastbaarheid|diagnos|keuring|beoord|oordeel)|\bpago\b/u,
    'Een medische beoordeling valt buiten deze dienst.',
  ],
  [
    /\b(wia|uwv)\b.{0,40}(oordeel|besluit|beoord)|(?:oordeel|besluit|beoordeling).{0,40}\b(wia|uwv)\b|deskundigenoordeel|uitkeringsbesluit/u,
    'Een formeel UWV- of WIA-oordeel valt buiten deze dienst.',
  ],
  [
    /recherche|persoonsgericht onderzoek|opsporing|certificeringsbesluit|wettelijke keuring/u,
    'Deze onderzoeks-, keurings- of beslisbevoegdheid valt buiten deze dienst.',
  ],
]
export function classifyTask(
  service: Service,
  title: string,
  description: string,
  secondary: string[],
  specialists: string[],
): { state: Outcome; message: string; reviewable: boolean } {
  const text = normalize([title, description, ...secondary].join(' '))
  for (const [pattern, message] of exclusions)
    if (pattern.test(text)) return { state: 'BUITEN_SCOPE', message, reviewable: false }
  const task = standardTasks[service]
  if (!title.trim() || !description.trim() || !specialists.length)
    return {
      state: 'BEOORDELING_NODIG',
      message: 'Vul de werkzaamheden en primaire deskundigheid aan.',
      reviewable: false,
    }
  if (
    (normalize(title) === normalize(task.title) || normalize(title) === normalize(task.task)) &&
    normalize(description) === normalize(task.task) &&
    secondary.every((s) => !s.trim()) &&
    specialists.every((s) => task.specialists.includes(s))
  ) {
    return {
      state: 'BINNEN_SCOPE',
      message: 'Deze standaardwerkzaamheden passen binnen de gekozen dienst.',
      reviewable: false,
    }
  }
  return {
    state: 'BEOORDELING_NODIG',
    message:
      'Een bevoegde beoordelaar moet de werkzaamheden en gekozen deskundigheid toetsen aan de dienstomschrijving.',
    reviewable: true,
  }
}
