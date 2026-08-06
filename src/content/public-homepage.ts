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
      'WorkMatchr helpt organisaties hun vraag over arbeidsomstandigheden, veiligheid en gezondheid te verduidelijken en leidt vervolgens naar relevante informatie of passende deskundigheid.',
    primaryAction: { href: publicRoutes.adviceGuide, label: 'Ontdek welke ondersteuning u nodig heeft' },
    secondaryAction: { href: publicRoutes.directAssignment, label: 'Start uw opdracht' },
  },
  process: ['Uw situatie', 'Enkele vragen', 'Uw advies', 'Vervolgstap'],
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
    description: 'Beantwoord enkele korte vragen. WorkMatchr helpt u uw hulpvraag duidelijk te maken.',
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
      title: 'Vertel wat er speelt',
      description: 'Begin bij uw vraag, situatie of mogelijke verplichting.',
    },
    {
      title: 'Krijg inzicht in wat relevant is',
      description: 'WorkMatchr brengt kennis, verplichtingen en mogelijke oplossingen overzichtelijk samen.',
    },
    {
      title: 'Vind passende deskundigheid',
      description: 'Wanneer externe ondersteuning nodig is, kunt u verder naar passende dienstverlening of specialisten.',
    },
  ] satisfies readonly ProcessStepContent[],
  principles: [
    { title: 'Vraaggestuurd', description: 'Eerst de situatie begrijpen, daarna bepalen wat relevant is.' },
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
    description: 'Begin bij uw situatie en bekijk vervolgens welke informatie, verplichtingen of mogelijke oplossingen relevant kunnen zijn.',
    primaryAction: { href: publicAnchors.askQuestion, label: 'Begin bij uw situatie' },
    secondaryAction: { href: publicRoutes.knowledge, label: 'Bekijk het kenniscentrum' },
  },
} as const
