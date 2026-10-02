import { publicLearning } from './public-learning'
import { publicLearningPrices } from './public-learning-prices'

export const publicLearningCategories = [
  { key: 'organisation', title: 'Organisatie & preventie' },
  { key: 'healthy-work', title: 'Veilig & gezond werken' },
  { key: 'risks', title: "Risico's & incidenten" },
] as const

export type PublicLearningCourse = {
  code: string
  slug: string
  title: string
  description: string
  audience: string
  duration: string
  category: (typeof publicLearningCategories)[number]['key']
  status: 'Binnenkort beschikbaar' | 'In ontwikkeling'
  individualPrice: string
  teamPrice: string
  topics: readonly string[]
  outcomes: readonly string[]
  disclaimer?: string
}

type RoadmapInput = Omit<PublicLearningCourse, 'status' | 'individualPrice' | 'teamPrice'>
const roadmapCourse = (course: RoadmapInput): PublicLearningCourse => ({
  ...course,
  status: 'In ontwikkeling',
  ...publicLearningPrices,
})

// Editorial announcements only; no course, exam, enrollment or commerce records.
// Ordered by public category and within-category presentation order.
export const publicLearningCatalog: readonly PublicLearningCourse[] = [
  {
    code: 'WL-001', slug: 'rie-in-de-praktijk', title: publicLearning.title,
    description: '10 hoofdstukken over de RI&E, praktische oefeningen, een eindtoets en een certificaat van afronding. Met optioneel kennisbehoud na afloop.',
    audience: 'Preventiemedewerkers, leidinggevenden, HR-medewerkers, ondernemers en betrokken medewerkers',
    duration: 'Nog vast te stellen', category: 'organisation', status: publicLearning.status,
    ...publicLearningPrices,
    topics: publicLearning.chapters,
    outcomes: ['Risico’s herkennen, inventariseren en beoordelen.', 'Passende maatregelen vastleggen in een Plan van Aanpak.'],
  },
  roadmapCourse({
    code: 'WL-002', slug: 'preventiemedewerker-in-de-praktijk', title: 'Preventiemedewerker in de praktijk',
    audience: 'Preventiemedewerkers', duration: '60–90 minuten', category: 'organisation',
    description: 'Geef de rol van preventiemedewerker praktisch vorm: van werkplekrondes en betrokken medewerkers tot het opvolgen van maatregelen.',
    topics: ['De rol van de preventiemedewerker', 'RI&E en Plan van Aanpak', 'Werkplekrondes', 'Medewerkers betrekken', 'Voorlichting en instructie', 'Maatregelen opvolgen', 'Samenwerken met werkgever, OR/PVT en arbodeskundigen', 'Deskundigheid inschakelen', 'Praktische jaarplanning', 'Integrale praktijktoepassing'],
    outcomes: ['Uw rol en samenwerking binnen de organisatie verduidelijken.', 'Signalen uit de praktijk verbinden aan de RI&E en maatregelen.', 'Preventietaken plannen en opvolgen.'],
  }),
  roadmapCourse({
    code: 'WL-010', slug: 'veiligheid-voor-leidinggevenden', title: 'Veiligheid voor leidinggevenden',
    audience: 'Leidinggevenden', duration: 'Circa 60 minuten', category: 'organisation',
    description: 'Verbind voorbeeldgedrag, instructie en toezicht aan de dagelijkse praktijk van veilig en gezond leidinggeven.',
    topics: ['Rol en verantwoordelijkheid', 'Voorbeeldgedrag', 'Toezicht houden en aanspreken', 'Werkdruk herkennen', 'Incidentmelding', 'Werkzaamheden onderbreken of stilleggen waar passend', 'RI&E-maatregelen', 'Instructie en naleving'],
    outcomes: ['Veiligheid bespreekbaar maken in het team.', 'Signalen herkennen en passende opvolging organiseren.', 'Instructie, toezicht en RI&E-maatregelen verbinden aan het dagelijkse werk.'],
    disclaimer: 'Deze praktische opleiding voor veilig en gezond leidinggeven is geen VCA-VOL-opleiding, geen VOL-VCA-equivalent en geen vervanging van een andere formele kwalificatie.',
  }),
  roadmapCourse({
    code: 'WL-003', slug: 'veilig-en-gezond-werken', title: 'Veilig en gezond werken',
    audience: 'Alle medewerkers', duration: '30–45 minuten', category: 'healthy-work',
    description: 'Praktische basiskennis om gevaren te herkennen en veilig en gezond te handelen op het werk.',
    topics: ['Uw eigen rol', 'Gevaren herkennen', 'Instructies volgen', 'Persoonlijke beschermingsmiddelen (PBM)', 'Onveilige situaties en bijna-ongevallen', 'Werkdruk', 'Fysieke belasting', 'Noodsituaties', 'Handelen bij direct gevaar'],
    outcomes: ['Gevaren in uw werkomgeving herkennen.', 'Instructies en beschermingsmiddelen bewust gebruiken.', 'Signalen melden en hulp inschakelen bij gevaar.'],
    disclaimer: "Deze opleiding kan onderdeel zijn van de manier waarop een organisatie medewerkers informeert en instrueert over veilig en gezond werken. Welke voorlichting en instructie nodig is, hangt af van de werkzaamheden en risico's binnen de organisatie.",
  }),
  roadmapCourse({
    code: 'WL-005', slug: 'werkdruk-en-ongewenst-gedrag', title: 'Werkdruk & ongewenst gedrag',
    audience: 'Medewerkers en leidinggevenden', duration: '45–60 minuten', category: 'healthy-work',
    description: 'Herken signalen van werkdruk en ongewenst gedrag en oefen met het bespreekbaar maken van situaties uit de praktijk.',
    topics: ['Werkdruk', 'Ongewenst gedrag', 'Pesten', 'Intimidatie', 'Discriminatie', 'Agressie', 'Signalen herkennen', 'Bespreekbaar maken', 'Hulp zoeken', 'De rol van de leidinggevende'],
    outcomes: ['Signalen van werkdruk en ongewenst gedrag herkennen.', 'Een zorg bespreekbaar maken en passende hulp zoeken.', 'Uw eigen rol in een veilige omgang met elkaar begrijpen.'],
    disclaimer: 'De opleiding biedt algemene praktijkkennis en is geen diagnose of behandeling.',
  }),
  roadmapCourse({
    code: 'WL-006', slug: 'fysieke-belasting', title: 'Fysieke belasting',
    audience: 'Medewerkers in uiteenlopende sectoren', duration: '30–45 minuten', category: 'healthy-work',
    description: 'Bekijk fysieke belasting in samenhang met hulpmiddelen, werkorganisatie en maatregelen die belasting kunnen verminderen.',
    topics: ['Tillen', 'Duwen en trekken', 'Repeterende bewegingen', 'Statische belasting', 'Staan en zitten', 'Hulpmiddelen', 'Werkorganisatie', 'Maatregelenhiërarchie'],
    outcomes: ['Verschillende vormen van fysieke belasting herkennen.', 'Verder kijken dan alleen houding of tiltechniek.', 'Mogelijke verbeteringen in hulpmiddelen en werkorganisatie bespreken.'],
  }),
  roadmapCourse({
    code: 'WL-009', slug: 'beeldschermwerk-en-ergonomie', title: 'Beeldschermwerk & ergonomie',
    audience: 'Kantoor, onderwijs en overheid', duration: '20–30 minuten', category: 'healthy-work',
    description: 'Praktische aandachtspunten voor uw beeldschermwerkplek, afwisseling en bewegen, op kantoor en thuis.',
    topics: ['Stoel en bureau', 'Beeldscherm', 'Laptop', 'Toetsenbord en muis', 'Houding', 'Afwisseling', 'Thuiswerken', 'Bewegen en pauzes'],
    outcomes: ['Aandachtspunten aan uw werkplek herkennen.', 'Werkhouding en afwisseling bewust organiseren.', 'Verbeterpunten voor kantoor en thuis bespreken.'],
  }),
  roadmapCourse({
    code: 'WL-011', slug: 'bhv-awareness', title: 'BHV awareness',
    audience: 'Alle medewerkers', duration: '20–30 minuten', category: 'healthy-work',
    description: 'Basiskennis over bedrijfshulpverlening en uw eigen handelen bij een noodsituatie.',
    topics: ['De rol van bedrijfshulpverlening', 'Een noodsituatie herkennen en alarmeren', 'Instructies van BHV’ers volgen', 'Ontruiming en verzamelplaats', 'Uw eigen veiligheid'],
    outcomes: ['Begrijpen wanneer u hulp inschakelt.', 'Uw eigen rol bij alarmering en ontruiming herkennen.', 'Instructies bij een noodsituatie beter begrijpen.'],
    disclaimer: "Deze awarenessopleiding geeft medewerkers basiskennis over bedrijfshulpverlening en handelen bij noodsituaties. De opleiding leidt niet zelfstandig op tot BHV'er en vervangt geen noodzakelijke praktische BHV-opleiding of oefening.",
  }),
  roadmapCourse({
    code: 'WL-004', slug: 'ongevallen-en-gevaarlijke-situaties-melden', title: 'Ongevallen en gevaarlijke situaties melden',
    audience: 'Alle medewerkers', duration: '30–45 minuten', category: 'risks',
    description: 'Leer wat u meldt, welke eerste acties passen en hoe meldingen helpen om van incidenten te leren.',
    topics: ['Ongevallen', 'Bijna-ongevallen', 'Gevaarlijke situaties', 'Waarom en wat melden', 'Schuld versus oorzaak', 'Eerste acties', 'De leidinggevende inschakelen', 'Leren van incidenten'],
    outcomes: ['Ongevallen, bijna-ongevallen en gevaarlijke situaties onderscheiden.', 'Relevante informatie voor een melding herkennen.', 'Eerste acties en het inschakelen van een leidinggevende begrijpen.'],
    disclaimer: 'Dit is een basisopleiding over melden en eerste acties, geen volledige incidentonderzoekopleiding.',
  }),
  roadmapCourse({
    code: 'WL-007', slug: 'gevaarlijke-stoffen-basis', title: 'Veilig werken met gevaarlijke stoffen – basis',
    audience: 'Medewerkers die met gevaarlijke stoffen werken', duration: '45–60 minuten', category: 'risks',
    description: 'Een praktische basis voor het herkennen van gevaarlijke stoffen, blootstelling en aandachtspunten bij veilig werken.',
    topics: ['Gevaarlijke stoffen herkennen', 'Etiketten en CLP-pictogrammen', 'Veiligheidsinformatieblad', 'Blootstellingsroutes', 'Opslag', 'Mengen', 'Ventilatie', 'Maatregelen', 'Persoonlijke beschermingsmiddelen (PBM)', 'Incidenten en melden'],
    outcomes: ['Gevaarsinformatie op een etiket herkennen.', 'Aandachtspunten voor blootstelling en maatregelen begrijpen.', 'Weten wanneer aanvullende instructie of deskundigheid nodig is.'],
    disclaimer: 'Dit is een basisopleiding. Zij vervangt geen noodzakelijke stofspecifieke, procesgerichte, wettelijke of praktische voorlichting of instructie voor uw werkzaamheden.',
  }),
  roadmapCourse({
    code: 'WL-008', slug: 'veilig-werken-met-machines', title: 'Veilig werken met machines',
    audience: 'Techniek en productie', duration: '45–60 minuten', category: 'risks',
    description: 'Herken aandachtspunten rond machinegebruik, afschermingen, storingen en veilig onderhoud.',
    topics: ['Afschermingen', 'Noodstop', 'Onderhoud', 'Energieveiligstelling', 'Storingen', 'Onbevoegd gebruik', 'Machinewijzigingen', 'Defecten melden'],
    outcomes: ['Risicosignalen rond machinegebruik herkennen.', 'Het belang van afschermingen en energieveiligstelling begrijpen.', 'Defecten melden en de grenzen van uw bevoegdheid herkennen.'],
    disclaimer: 'Deze opleiding vervangt geen machinecertificering, machinespecifieke instructie of noodzakelijke praktijktraining.',
  }),
  roadmapCourse({
    code: 'WL-012', slug: 'werken-op-hoogte-awareness', title: 'Werken op hoogte – awareness',
    audience: 'Bouw en techniek', duration: '30–45 minuten', category: 'risks',
    description: 'Bewustwording van risico’s bij werken op hoogte en van het belang van passende voorbereiding en instructie.',
    topics: ['Valgevaar herkennen', 'De werkplek en werkzaamheden voorbereiden', 'Passende arbeidsmiddelen en maatregelen', 'Instructies en eigen bevoegdheid', 'Onveilige situaties melden en hulp inschakelen'],
    outcomes: ['Situaties met valgevaar herkennen.', 'Het belang van voorbereiding en passende maatregelen begrijpen.', 'De grenzen van uw kennis en bevoegdheid herkennen.'],
    disclaimer: 'Deze awarenessopleiding verleent geen vakbekwaamheid, certificering of praktische bevoegdheid voor werken op hoogte en vervangt geen noodzakelijke praktijkinstructie.',
  }),
]

export const roadmapLearningCourses = publicLearningCatalog.filter(course => course.code !== 'WL-001')
export const publicLearningHref = (course: Pick<PublicLearningCourse, 'slug'>): `/e-learning/${string}` => `/e-learning/${course.slug}`
export const findRoadmapLearningCourse = (slug: string) => roadmapLearningCourses.find(course => course.slug === slug)
