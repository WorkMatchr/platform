import type { KnowledgeDocument, KnowledgeSource } from './types'
import { publicRoutes, rieContentReferences } from '../public-routes'

export const rieSources = [
  {
    id: 'arbowet-artikel-5',
    title: 'Arbeidsomstandighedenwet, artikel 5',
    sourceType: 'LAW',
    owner: 'Overheid.nl',
    location: 'https://wetten.overheid.nl/BWBR0010346/#Hoofdstuk2_Artikel5',
    evidenceLevel: 'PRIMARY',
    validationStatus: 'VALIDATED',
    note: 'Primaire wettelijke bron voor de RI&E, het plan van aanpak en actualisatie.',
  },
  {
    id: 'arbeidsinspectie-rie',
    title: 'Risico-inventarisatie en -evaluatie en plan van aanpak',
    sourceType: 'ENFORCEMENT_GUIDANCE',
    owner: 'Nederlandse Arbeidsinspectie',
    location:
      'https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/risico-inventarisatie-evaluatie-en-plan-van-aanpak',
    evidenceLevel: 'AUTHORITATIVE',
    validationStatus: 'VALIDATED',
    note: 'Officiële uitleg over inhoud, toezicht en de hoofdlijnen van toetsing.',
  },
  {
    id: 'rijksoverheid-rie',
    title: 'Heb ik als ondernemer een risico-inventarisatie en -evaluatie nodig?',
    sourceType: 'OFFICIAL_GUIDANCE',
    owner: 'Rijksoverheid',
    location:
      'https://www.rijksoverheid.nl/vraag-en-antwoord/arbeidsomstandigheden/risico-inventarisatie-en-evaluatie-ondernemer',
    evidenceLevel: 'AUTHORITATIVE',
    validationStatus: 'VALIDATED',
    note: 'Officiële publieksuitleg over werkgevers, arbeidsrisico’s en het plan van aanpak.',
  },
] as const satisfies readonly KnowledgeSource[]

const relatedTopics = [
  {
    title: rieContentReferences.obligation.title,
    description: 'Lees de algemene wettelijke context en verantwoordelijkheden.',
    href: rieContentReferences.obligation.href,
  },
  {
    title: rieContentReferences.service.title,
    description: 'Bekijk wanneer deskundige ondersteuning nuttig kan zijn.',
    href: rieContentReferences.service.href,
  },
] as const

export const rieQuestionArticle = {
  id: 'knowledge-rie-required-v1',
  type: 'EXPLANATION',
  slug: 'moet-ik-een-rie-hebben',
  title: 'Moet ik een RI&E hebben?',
  summary:
    'Heeft uw organisatie personeel, dan moet u als werkgever in beginsel een schriftelijke RI&E met plan van aanpak hebben. Uw precieze situatie bepaalt hoe u deze opstelt en of toetsing nodig is.',
  status: 'PUBLISHED',
  lastReviewed: '2026-07-19',
  sections: [
    {
      id: 'verplichting',
      title: 'Wanneer geldt de RI&E-verplichting?',
      paragraphs: [
        'Werkgevers leggen schriftelijk vast welke risico’s het werk voor werknemers meebrengt. De RI&E beschrijft ook bestaande maatregelen en risico’s voor bijzondere groepen werknemers.',
        'Heeft een bedrijf geen personeel, dan is volgens de publieksinformatie van Rijksoverheid geen RI&E nodig. Onder personeel kunnen ook uitzendkrachten, stagiairs, vrijwilligers en ingehuurde krachten vallen. Laat bij twijfel uw concrete arbeidsrelaties beoordelen.',
      ],
    },
    {
      id: 'extra-aandacht',
      title: 'Situaties die extra aandacht vragen',
      paragraphs: ['Een standaardlijst is niet genoeg wanneer uw werkzaamheden specifieke risico’s kennen.'],
      items: [
        'werken met gevaarlijke stoffen, machines of fysieke belasting;',
        'wisselende werkplekken, thuiswerk of werk bij klanten;',
        'kwetsbare groepen, nachtarbeid of psychosociale arbeidsbelasting;',
        'nieuwe werkmethoden, verbouwingen of snelle groei.',
      ],
    },
    {
      id: 'kleine-werkgevers',
      title: 'Kleine werkgevers en uitzonderingssituaties',
      paragraphs: [
        'Ook een kleine werkgever met personeel heeft in beginsel een RI&E nodig. Voor de toetsing kunnen andere regels gelden. Zo kan bij maximaal 25 medewerkers onder voorwaarden een erkend branche-instrument worden gebruikt zonder afzonderlijke toetsing.',
        'Of die uitzondering werkelijk toepasbaar is, hangt onder meer af van uw branche, het gebruikte instrument en uw personeelsomvang. Deze pagina trekt daarover geen individuele conclusie.',
      ],
    },
    {
      id: 'samenhang',
      title: 'RI&E, plan van aanpak en preventiemedewerker',
      paragraphs: [
        'Het plan van aanpak maakt deel uit van de RI&E. Daarin staat welke maatregelen worden genomen en binnen welke termijn. De preventiemedewerker werkt mee aan het opstellen en uitvoeren van de RI&E.',
        'De werkgever blijft verantwoordelijk voor een passende, actuele RI&E en voor de uitvoering van maatregelen.',
      ],
    },
    {
      id: 'misverstanden',
      title: 'Veelvoorkomende misverstanden',
      paragraphs: [],
      items: [
        '“Wij zijn klein, dus een RI&E is niet nodig.” De omvang kan de toetsing beïnvloeden, niet automatisch de RI&E-plicht.',
        '“Een ingevulde checklist is altijd voldoende.” De RI&E moet passen bij de echte werkzaamheden en risico’s.',
        '“Een RI&E is eenmalig.” Aanpassing is nodig als ervaring, werkmethoden, omstandigheden of professionele inzichten daartoe aanleiding geven.',
      ],
    },
    {
      id: 'praktijkvoorbeeld',
      title: 'Een herkenbaar praktijkvoorbeeld',
      paragraphs: [
        'Een groeiend installatiebedrijf neemt zijn eerste monteurs aan. Naast kantoorwerk ontstaan risico’s op klantlocaties, onderweg en bij het gebruik van gereedschap. De werkgever brengt deze situaties in één samenhangende RI&E in kaart, maakt maatregelen concreet in het plan van aanpak en onderzoekt welke toetsing past.',
      ],
    },
  ],
  relatedTopics,
  callToAction: {
    title: 'Breng uw situatie in kaart',
    description: 'De Advieswijzer helpt u uw vraag te verduidelijken zonder een juridische conclusie voor u te trekken.',
    primary: { label: 'Start de Advieswijzer', href: publicRoutes.adviceGuide },
    secondary: { label: 'Bekijk RI&E-ondersteuning', href: publicRoutes.rieService },
  },
  sources: rieSources,
} as const satisfies KnowledgeDocument

export const rieServicePage = {
  id: 'service-rie-v1',
  type: 'SERVICE',
  slug: 'rie',
  title: 'Ondersteuning bij uw RI&E',
  summary:
    'Een deskundige kan helpen arbeidsrisico’s zorgvuldig te inventariseren, te beoordelen en te vertalen naar een bruikbaar plan van aanpak.',
  status: 'PUBLISHED',
  lastReviewed: '2026-07-19',
  sections: [
    { id: 'wat', title: 'Wat houdt de dienstverlening in?', paragraphs: ['Ondersteuning kan bestaan uit voorbereiding, interviews, werkplekonderzoek, risico-evaluatie, rapportage en begeleiding bij het plan van aanpak. De precieze inzet hangt af van uw organisatie en werkzaamheden.'] },
    { id: 'wanneer', title: 'Wanneer kan ondersteuning nuttig zijn?', paragraphs: ['Bij een eerste RI&E, ingrijpende veranderingen, specialistische risico’s of twijfel over volledigheid kan externe deskundigheid helpen. Ook toetsing kan deskundige inzet vereisen.'] },
    { id: 'specialist', title: 'Wat kan een specialist uitvoeren?', paragraphs: ['Een specialist kan de aanpak structureren, risico’s onderzoeken en bevindingen onderbouwen. Vooraf zijn onder meer werkzaamheden, locaties, personeelsgroepen, incidentinformatie en bestaande maatregelen relevant.'] },
    { id: 'verantwoordelijkheid', title: 'Wat blijft uw verantwoordelijkheid?', paragraphs: ['De werkgever blijft verantwoordelijk voor de RI&E, het plan van aanpak en de uitvoering en actualisatie daarvan. WorkMatchr voert niet automatisch een RI&E uit: wij helpen uw vraag verduidelijken en kunnen u later met passende aanbieders verbinden.'] },
  ],
  relatedTopics,
  callToAction: { title: 'Verduidelijk uw RI&E-vraag', description: 'Leg eerst vast wat er binnen uw organisatie speelt en welke ondersteuning u zoekt.', primary: { label: 'Start de Advieswijzer', href: publicRoutes.adviceGuide }, secondary: { label: 'Lees of een RI&E nodig is', href: publicRoutes.rieQuestion } },
  sources: rieSources,
} as const satisfies KnowledgeDocument

export const rieLegalPage = {
  id: 'legal-rie-v1',
  type: 'LEGAL_OBLIGATION',
  slug: 'rie',
  title: 'RI&E als wettelijke verplichting',
  summary: 'Artikel 5 van de Arbowet verplicht werkgevers arbeidsrisico’s schriftelijk te inventariseren en evalueren. Een plan van aanpak maakt daarvan deel uit.',
  status: 'PUBLISHED',
  lastReviewed: '2026-07-19',
  sections: [
    { id: 'context', title: 'De algemene wettelijke context', paragraphs: ['De RI&E is onderdeel van het arbeidsomstandighedenbeleid. De werkgever beschrijft gevaren, risico’s, bestaande maatregelen en bijzondere groepen werknemers.'] },
    { id: 'voor-wie', title: 'Voor wie kan de verplichting gelden?', paragraphs: ['De verplichting richt zich tot werkgevers. Rijksoverheid vermeldt dat een bedrijf zonder personeel geen RI&E hoeft te maken, maar rekent verschillende werkrelaties tot personeel. De feitelijke situatie is daarom bepalend.'] },
    { id: 'plan', title: 'Samenhang met het plan van aanpak', paragraphs: ['Het plan van aanpak is onderdeel van de RI&E en vermeldt de maatregelen en uitvoeringstermijnen. Het document moet aansluiten op de werkelijk aanwezige risico’s.'] },
    { id: 'toetsing', title: 'Toetsing en uitzonderingen', paragraphs: ['De Nederlandse Arbeidsinspectie licht toe dat toetsing door een gecertificeerde deskundige bij meer dan 25 medewerkers aan de orde kan zijn en dat kleinere werkgevers onder voorwaarden een erkend branche-instrument zonder afzonderlijke toetsing kunnen gebruiken. Controleer altijd of die voorwaarden op uw situatie van toepassing zijn.'] },
    { id: 'actualisatie', title: 'Actualisatie en verantwoordelijkheid', paragraphs: ['De Arbowet verlangt aanpassing wanneer ervaring, gewijzigde werkmethoden of werkomstandigheden, of de stand van wetenschap en professionele dienstverlening daartoe aanleiding geven. De werkgever blijft verantwoordelijk.'] },
  ],
  relatedTopics,
  callToAction: { title: 'Geen individuele conclusie zonder context', description: 'Breng uw organisatie en werkzaamheden eerst zorgvuldig in kaart.', primary: { label: 'Start de Advieswijzer', href: publicRoutes.adviceGuide }, secondary: { label: 'Bekijk RI&E-ondersteuning', href: publicRoutes.rieService } },
  sources: rieSources,
} as const satisfies KnowledgeDocument
