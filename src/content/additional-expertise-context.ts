import type { ExpertiseId } from '@/lib/requests/simple-advice-contract'

// Descriptive overlaps within the approved matrix; never used as matching facts.
const overlapReasons: Record<ExpertiseId, string> = {
  HVK: 'Bij raakvlakken met complexe technische of organisatorische veiligheidsvraagstukken.',
  MVK: 'Wanneer het vraagstuk samenhangt met praktische veiligheid of de inrichting van de werkplek.',
  ARBEIDSHYGIENIST: 'Bij een bredere beoordeling van belastende omstandigheden in de werkomgeving.',
  A_EN_O_DESKUNDIGE: 'Wanneer ook werkorganisatie, samenwerking of psychosociale arbeidsbelasting een rol speelt.',
  BEDRIJFSARTS: 'Wanneer de vraag samenhangt met individuele gezondheid of belastbaarheid.',
  ERGONOMIE_FYSIEKE_BELASTING: 'Bij raakvlakken met fysieke belasting, werkhoudingen of werkplekinrichting.',
  MACHINEVEILIGHEID: 'Bij technische veiligheidsvragen over machines of arbeidsmiddelen; dit vervangt geen formele keuring.',
  GEVAARLIJKE_STOFFEN: 'Wanneer het vraagstuk ook het beheer, de opslag of eigenschappen van gevaarlijke stoffen raakt.',
  EXPLOSIEVEILIGHEID: 'Wanneer gevaarlijke stoffen of installaties raakvlakken hebben met explosiegevaar.',
  INCIDENTONDERZOEK: 'Wanneer inzicht in de omstandigheden en oorzaken van een incident relevant is.',
  BRANDVEILIGHEID: 'Bij raakvlakken met brandscenario’s, vluchtroutes of brandveiligheidsvoorzieningen.',
  GELUIDSDESKUNDIGE: 'Wanneer blootstelling aan geluid ook specialistische akoestiek of bronbeheersing raakt.',
  STRALINGSDESKUNDIGE: 'Wanneer belastende werkomstandigheden ook specialistische stralingsbeoordeling raken.',
  ARBEIDSPSYCHOLOOG: 'Wanneer psychosociale omstandigheden samenhangen met individueel psychologisch functioneren.',
  VERTROUWENSPERSOON: 'Wanneer ongewenst gedrag ook aanleiding geeft tot vertrouwelijke opvang of begeleiding bij een melding.',
  CASEMANAGER_VERZUIM: 'Wanneer gezondheid en werkhervatting ook procescoördinatie en termijnbewaking vragen.',
  PREVENTIEMEDEWERKER: 'Bij raakvlakken met de interne organisatie van preventietaken.',
  BHV_DESKUNDIGE: 'Wanneer brandveiligheid ook de organisatie van hulpverlening, ontruiming of oefeningen raakt.',
  ARBODIENST: 'Bij raakvlakken met structurele arbodienstverlening rond preventie en verzuim.',
  KEURINGSINSTANTIE: 'Bij raakvlakken met formele inspecties en keuringen.',
}

export function additionalExpertiseReason(primary: ExpertiseId, additional: ExpertiseId) {
  if (primary === 'ERGONOMIE_FYSIEKE_BELASTING' && additional === 'MVK') return 'Wanneer ergonomie samenhangt met praktische veiligheids- of werkplekvraagstukken.'
  return overlapReasons[additional]
}

export function additionalExpertiseIntroduction(primary: ExpertiseId) {
  if (primary === 'PREVENTIEMEDEWERKER') return { title: 'Mogelijke externe ondersteuning', text: 'Een preventiemedewerker is een interne rol. Afhankelijk van het vraagstuk kan aanvullende externe deskundigheid worden ingezet.' }
  if (primary === 'ARBODIENST') return { title: 'Beschikbare aanvullende disciplines', text: 'Een arbodienst kan verschillende arbodeskundigen inzetten. U kunt aangeven welke disciplines u daarnaast relevant vindt.' }
  return { title: primary === 'KEURINGSINSTANTIE' ? 'Mogelijk aanvullende expertise' : 'Mogelijk ook relevant voor uw opdracht', text: 'Afhankelijk van uw situatie kunnen ook andere deskundigheden bij uw opdracht betrokken zijn.' }
}
