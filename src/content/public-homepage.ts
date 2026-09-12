import { publicAnchors, publicRoutes } from './public-routes'

export type InternalHref = `/${string}`

export type PublicIconName =
  | 'advice'
  | 'checklist'
  | 'growth'
  | 'health'
  | 'incident'
  | 'law'
  | 'search'

export type PublicSituationKey =
  | 'employer-with-staff'
  | 'rie-uncertainty'
  | 'occupational-health-obligations'
  | 'incident-or-near-miss'
  | 'absence-or-health-concerns'
  | 'find-an-expert'

export type PublicDestinationType = 'information' | 'services' | 'advice-guide'

type LinkContent = {
  label: string
  href: InternalHref
}

export type SituationContent = LinkContent & {
  key: PublicSituationKey
  title: string
  description: string
  icon: PublicIconName
  destinationType: Exclude<PublicDestinationType, 'advice-guide'>
}

export type ProcessStepContent = {
  title: string
  description: string
}

export type PreviewCardContent = LinkContent & {
  title: string
  description: string
}

export const publicSituationRouting = {
  'employer-with-staff': {
    href: publicRoutes.obligations,
    destinationType: 'information',
  },
  'rie-uncertainty': {
    href: publicRoutes.rieQuestion,
    destinationType: 'information',
  },
  'occupational-health-obligations': {
    href: publicRoutes.obligations,
    destinationType: 'information',
  },
  'incident-or-near-miss': {
    href: publicRoutes.incidentInvestigationQuestion,
    destinationType: 'information',
  },
  'absence-or-health-concerns': {
    href: publicRoutes.occupationalPhysicianQuestion,
    destinationType: 'information',
  },
  'find-an-expert': {
    href: publicRoutes.services,
    destinationType: 'services',
  },
} as const satisfies Record<
  PublicSituationKey,
  {
    href: InternalHref
    destinationType: Exclude<PublicDestinationType, 'advice-guide'>
  }
>

export const publicHomepageContent = {
  hero: {
    eyebrow: 'Uw digitale arbo-adviseur',
    title: 'Waarmee kunnen wij u helpen?',
    description:
      'Beschrijf waar u ondersteuning bij nodig heeft. Kies direct een deskundigheid of, als u dat nog niet weet, het onderwerp van uw vraag. Daarna kunt u uw opdracht eenvoudig publiceren.',
    primaryAction: { href: publicRoutes.adviceGuide, label: 'Vraag ondersteuning aan' },
  },
  process: ['Kies een deskundigheid of onderwerp', 'Beschrijf uw vraag', 'Controleer uw opdracht', 'Publiceer uw opdracht'],
  situations: [
    {
      key: 'employer-with-staff',
      title: 'Ik heb personeel in dienst',
      description: 'Bekijk welke onderwerpen rond gezond en veilig werken voor werkgevers relevant kunnen zijn.',
      ...publicSituationRouting['employer-with-staff'],
      label: 'Bekijk wat u moet regelen',
      icon: 'growth',
    },
    {
      key: 'rie-uncertainty',
      title: 'Ik twijfel of ik een RI&E nodig heb',
      description: 'Lees wanneer de RI&E-verplichting in beginsel geldt en welke context van belang is.',
      ...publicSituationRouting['rie-uncertainty'],
      label: 'Lees het korte antwoord',
      icon: 'checklist',
    },
    {
      key: 'occupational-health-obligations',
      title: 'Ik wil voldoen aan mijn arboverplichtingen',
      description: 'Verken veelvoorkomende verplichtingen en de algemene wettelijke context.',
      ...publicSituationRouting['occupational-health-obligations'],
      label: 'Bekijk de verplichtingen',
      icon: 'law',
    },
    {
      key: 'incident-or-near-miss',
      title: 'Er is een incident of bijna-ongeval gebeurd',
      description: 'Lees wanneer onderzoek zinvol is en welke vervolgstappen u kunt overwegen.',
      ...publicSituationRouting['incident-or-near-miss'],
      label: 'Lees over incidentonderzoek',
      icon: 'incident',
    },
    {
      key: 'absence-or-health-concerns',
      title: 'Ik heb te maken met verzuim of gezondheidsklachten',
      description: 'Lees wanneer een bedrijfsarts kan helpen bij gezondheid, preventie en verzuim.',
      ...publicSituationRouting['absence-or-health-concerns'],
      label: 'Lees wanneer u een bedrijfsarts inschakelt',
      icon: 'health',
    },
    {
      key: 'find-an-expert',
      title: 'Ik zoek direct een deskundige',
      description: 'Bekijk welke vormen van arbo- en veiligheidsondersteuning beschikbaar of in voorbereiding zijn.',
      ...publicSituationRouting['find-an-expert'],
      label: 'Bekijk alle diensten',
      icon: 'search',
    },
  ] satisfies readonly SituationContent[],
  adviceGuideEntry: {
    title: 'Ik weet nog niet wat ik nodig heb',
    description: 'Kies het onderwerp van uw vraag als u de deskundigheid nog niet weet. Beschrijf daarna waar u ondersteuning bij nodig heeft en publiceer uw opdracht.',
    href: publicRoutes.adviceGuide,
    label: 'Start de advieswijzer',
    destinationType: 'advice-guide',
  } satisfies LinkContent & {
    title: string
    description: string
    destinationType: Extract<PublicDestinationType, 'advice-guide'>
  },
  steps: [
    {
      title: 'Kies een deskundigheid of onderwerp',
      description: 'Kies zelf een deskundigheid als u die weet. Kies anders het onderwerp van uw vraag.',
    },
    {
      title: 'Beschrijf uw vraag',
      description: 'Vertel waar u ondersteuning bij nodig heeft, wat u wilt bereiken en waar en wanneer u wilt starten.',
    },
    {
      title: 'Controleer uw opdracht',
      description: 'Bekijk uw ingevulde gegevens en pas ze aan waar nodig.',
    },
    {
      title: 'Publiceer uw opdracht',
      description: 'Log in als opdrachtgever en publiceer uw opdracht. Dat kan ook zonder een deskundigheid te kiezen.',
    },
  ] satisfies readonly ProcessStepContent[],
  principles: [
    { title: 'Vraaggestuurd', description: 'Uw eigen vraag en keuze vormen het uitgangspunt van uw opdracht.' },
    {
      title: 'Onafhankelijk',
      description: 'De vraag van de organisatie staat centraal, niet één specifieke aanbieder.',
    },
    {
      title: 'Onderbouwd',
      description: 'Wettelijke en inhoudelijke informatie wordt gekoppeld aan controleerbare bronnen.',
    },
    { title: 'Transparant', description: 'Status, controledatum en bronnen worden zichtbaar gemaakt waar dat relevant is.' },
  ],
  closing: {
    title: 'Weet u nog niet precies wat u nodig heeft?',
    description: 'U kunt ook zonder een deskundigheid te kennen een opdracht publiceren. Kies het onderwerp van uw vraag en beschrijf waar u ondersteuning bij nodig heeft.',
    primaryAction: { href: publicAnchors.askQuestion, label: 'Begin bij uw situatie' },
    secondaryAction: { href: publicRoutes.knowledge, label: 'Bekijk het kenniscentrum' },
  },
} as const
