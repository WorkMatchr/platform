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

type LinkContent = {
  label: string
  href: InternalHref
}

export type SituationContent = LinkContent & {
  title: string
  description: string
  icon: PublicIconName
}

export type ProcessStepContent = {
  title: string
  description: string
}

export type PreviewCardContent = LinkContent & {
  title: string
  description: string
}

export const publicHomepageContent = {
  hero: {
    eyebrow: 'Uw digitale arbo-adviseur',
    title: 'Waarmee kunnen wij u helpen?',
    description:
      'WorkMatchr helpt organisaties hun vraag over arbeidsomstandigheden, veiligheid en gezondheid te verduidelijken en leidt vervolgens naar relevante informatie of passende deskundigheid.',
    primaryAction: { href: publicAnchors.askQuestion, label: 'Bekijk waar u kunt beginnen' },
    secondaryAction: { href: publicRoutes.services, label: 'Bekijk alle diensten' },
  },
  process: ['Situatie', 'Verduidelijking', 'Inzicht', 'Vervolgstap'],
  situations: [
    {
      title: 'Ik heb personeel in dienst',
      description: 'Bekijk welke onderwerpen rond gezond en veilig werken voor werkgevers relevant kunnen zijn.',
      href: publicRoutes.adviceGuide,
      label: 'Start de Advieswijzer',
      icon: 'growth',
    },
    {
      title: 'Ik twijfel of ik een RI&E nodig heb',
      description: 'Lees wanneer de RI&E-verplichting in beginsel geldt en welke context van belang is.',
      href: publicRoutes.rieQuestion,
      label: 'Lees het korte antwoord',
      icon: 'checklist',
    },
    {
      title: 'Ik wil voldoen aan mijn arboverplichtingen',
      description: 'Verken veelvoorkomende verplichtingen en de algemene wettelijke context.',
      href: publicRoutes.obligations,
      label: 'Bekijk de verplichtingen',
      icon: 'law',
    },
    {
      title: 'Er is een incident of bijna-ongeval gebeurd',
      description: 'Oriënteer u op mogelijke deskundige ondersteuning en relevante vervolgstappen.',
      href: publicRoutes.services,
      label: 'Bekijk passende diensten',
      icon: 'incident',
    },
    {
      title: 'Ik heb te maken met verzuim of gezondheidsklachten',
      description: 'Vind algemene informatie over gezondheid, preventie en specialistische ondersteuning.',
      href: publicRoutes.knowledge,
      label: 'Ga naar het kenniscentrum',
      icon: 'health',
    },
    {
      title: 'Ik zoek direct een deskundige',
      description: 'Bekijk welke vormen van arbo- en veiligheidsondersteuning beschikbaar of in voorbereiding zijn.',
      href: publicRoutes.services,
      label: 'Bekijk alle diensten',
      icon: 'search',
    },
  ] satisfies readonly SituationContent[],
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
