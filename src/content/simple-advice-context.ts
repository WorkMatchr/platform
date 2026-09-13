import { getServiceBySlug } from './services'
import { helpTopicLabels, requestedExpertiseOptions } from '@/lib/requests/simple-advice-contract'

type Expertise = typeof requestedExpertiseOptions[number]['value']
type ContextSource = { service: string } | { lines: readonly string[] }

// Reuse canonical public service descriptions. The remaining descriptions only
// express the existing accepted expertise task scope, without routing rules.
const expertiseSources: Record<Expertise, ContextSource> = {
  HVK: { service: 'hogere-veiligheidskundige' },
  MVK: { lines: ['Een middelbare veiligheidskundige ondersteunt bij de praktische uitvoering van veilig werken.', 'Werkzaamheden kunnen bestaan uit werkplekinspecties, toolboxen, veiligheidstoezicht en begeleiding bij maatregelen.'] },
  ARBEIDSHYGIENIST: { service: 'arbeidshygienist' },
  A_EN_O_DESKUNDIGE: { lines: ['Een arbeids- en organisatiedeskundige onderzoekt hoe de organisatie van het werk samenhangt met werkdruk en samenwerking.', 'Vraagstukken kunnen gaan over taakverdeling, leiderschap, organisatiecultuur en psychosociale arbeidsbelasting op team- of organisatieniveau.'] },
  BEDRIJFSARTS: { service: 'bedrijfsarts' },
  ERGONOMIE_FYSIEKE_BELASTING: { lines: ['Een ergonoom beoordeelt fysieke belasting en de inrichting van het werk.', 'Vraagstukken kunnen gaan over tillen, duwen, werkhoudingen, repeterend werk en de afstemming tussen mens, taak en werkplek.'] },
  MACHINEVEILIGHEID: { lines: ['Een machineveiligheidsdeskundige onderzoekt de technische veiligheid van machines en productielijnen.', 'Werkzaamheden kunnen gaan over ontwerp, afscherming, veiligheidsbesturing, ombouw en conformiteitsbeoordeling.'] },
  GEVAARLIJKE_STOFFEN: { lines: ['Een specialist gevaarlijke stoffen ondersteunt bij het beheer van chemische stoffen en producten.', 'Vraagstukken kunnen gaan over stoffenregisters, opslag, etikettering en veiligheidsinformatiebladen.'] },
  EXPLOSIEVEILIGHEID: { lines: ['Een ATEX- en explosieveiligheidsdeskundige onderzoekt explosiegevaar en ontstekingsbronnen.', 'Werkzaamheden kunnen gaan over explosieve atmosferen, zone-indeling en een explosieveiligheidsdocument.'] },
  INCIDENTONDERZOEK: { service: 'incidentonderzoek' },
  BRANDVEILIGHEID: { lines: ['Een brandveiligheidsadviseur ondersteunt bij bouwkundige en installatietechnische brandveiligheid.', 'Vraagstukken kunnen gaan over brandcompartimenten, vluchtroutes en brandveiligheidsinstallaties.'] },
  GELUIDSDESKUNDIGE: { lines: ['Een geluidsdeskundige onderzoekt akoestiek en geluidsbronnen.', 'Werkzaamheden kunnen bestaan uit specialistische geluidmetingen, modellering en technische geluidsbeheersing.'] },
  STRALINGSDESKUNDIGE: { lines: ['Een stralingsdeskundige ondersteunt bij specialistische stralingsbeoordeling en stralingsbescherming.', 'Vraagstukken kunnen gaan over ioniserende of optische straling.'] },
  ARBEIDSPSYCHOLOOG: { lines: ['Een arbeidspsycholoog begeleidt individuele psychologische vraagstukken in relatie tot werk.', 'Vraagstukken kunnen gaan over werkgerelateerde stress, angst, trauma of psychologisch functioneren.'] },
  VERTROUWENSPERSOON: { lines: ['Een vertrouwenspersoon biedt vertrouwelijke opvang bij ongewenst gedrag.', 'Ondersteuning kan bestaan uit een gesprek en hulp bij het vinden van de weg naar een melding van pesten, intimidatie of discriminatie.'] },
  CASEMANAGER_VERZUIM: { lines: ['Een casemanager verzuim ondersteunt de procescoördinatie van verzuim en re-integratie.', 'Werkzaamheden kunnen bestaan uit termijnbewaking, dossieropvolging en afstemming tussen betrokkenen.'] },
  PREVENTIEMEDEWERKER: { service: 'preventiemedewerker' },
  BHV_DESKUNDIGE: { service: 'bhv' },
  ARBODIENST: { lines: ['Een arbodienst biedt structurele arbodienstverlening en toegang tot verschillende disciplines.', 'Vraagstukken kunnen gaan over het basiscontract en de organisatie van preventie- en verzuimdienstverlening.'] },
  KEURINGSINSTANTIE: { lines: ['Een keuringsinstantie voert formele inspecties, technische keuringen of certificering uit.', 'De opdracht kan een periodieke keuring of een conformiteitsdienst betreffen.'] },
}

const topicContext: Record<keyof typeof helpTopicLabels, string> = {
  RIE: 'Hieronder vallen vragen over het inventariseren van arbeidsrisico’s en het opstellen of opvolgen van een plan van aanpak.',
  SAFETY: 'Hieronder vallen vragen over dagelijkse werkveiligheid, veiligheidsbeleid en het uitvoeren van maatregelen.',
  MACHINES: 'Hieronder vallen vragen over machines, arbeidsmiddelen, afscherming, onderhoud en veilig gebruik.',
  CHEMICALS: 'Hieronder vallen vragen over gebruikte stoffen, opslag, etiketten en veiligheidsinformatiebladen.',
  EXPOSURE: 'Hieronder vallen vragen over blootstelling aan geluid, stof, dampen en andere factoren in de werkomgeving.',
  PSYCHOSOCIAL: 'Hieronder vallen vragen over werkdruk, samenwerking, stress en ongewenst gedrag.',
  REINTEGRATION: 'Hieronder vallen vragen over verzuim, werkhervatting en de organisatie van re-integratie. Vermeld geen medische gegevens.',
  ERGONOMICS: 'Hieronder vallen vragen over werkplekinrichting, tillen, duwen, werkhoudingen en repeterend werk.',
  INCIDENT: 'Hieronder vallen vragen over een ongeval, incident of bijna-ongeval en het leren van de omstandigheden.',
  EMERGENCY: 'Hieronder vallen vragen over hulpverlening, bezetting, ontruiming en oefeningen.',
  FIRE: 'Hieronder vallen vragen over brandveiligheid, vluchtroutes en brandveiligheidsvoorzieningen.',
  EXPLOSION: 'Hieronder vallen vragen over explosiegevaar, ontstekingsbronnen en explosiegevaarlijke zones.',
  INSPECTION: 'Hieronder vallen vragen over inspecties, keuringen en certificering.',
  OTHER: 'Beschrijf in uw eigen woorden wat er speelt en wat u wilt bereiken.',
  UNKNOWN: 'Vertel kort wat er speelt, bij welke werkzaamheden dit voorkomt en wat u wilt bereiken. U hoeft geen vaktermen te gebruiken.',
}

export function getSimpleAdviceContext(selection: { routeChoice: string; requestedExpertise: string; helpTopic: string }, step: number): { title: string; lines: readonly string[]; callout?: string; buttonLabel: string } {
  const general = { title: 'Uw keuze', lines: ['Kies Ja als u zelf een deskundigheid wilt kiezen. Kies anders Nee en vervolgens het onderwerp van uw vraag.'], buttonLabel: 'Toelichting bij deze stap' }
  if (step === 0) return general
  const expertise = selection.routeChoice === 'KNOWS_EXPERTISE' ? requestedExpertiseOptions.find(option => option.value === selection.requestedExpertise) : undefined
  if (expertise) {
    const source = expertiseSources[expertise.value]
    const service = 'service' in source ? getServiceBySlug(source.service) : undefined
    const lines = 'lines' in source ? source.lines : service ? [service.positioning, `Werkzaamheden kunnen leiden tot: ${service.outcomes.join(' ')}`] : []
    return { title: `U heeft gekozen voor: ${expertise.label}`, lines, callout: 'Past dit niet bij uw vraag? U kunt via ‘Terug’ een andere deskundigheid kiezen.', buttonLabel: 'Over uw gekozen deskundigheid' }
  }
  const topic = selection.routeChoice === 'NEEDS_TOPIC' && Object.hasOwn(topicContext, selection.helpTopic) ? selection.helpTopic as keyof typeof topicContext : undefined
  return topic ? { title: `Onderwerp: ${helpTopicLabels[topic]}`, lines: [topicContext[topic]], buttonLabel: 'Over uw gekozen onderwerp' } : general
}
