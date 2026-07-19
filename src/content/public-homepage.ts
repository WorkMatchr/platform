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

export const publicNavigation = [
  { href: '/', label: 'Home' },
  { href: '/#herkenbare-situaties', label: 'Waarmee kunnen wij U helpen?' },
  { href: '/diensten', label: 'Diensten' },
  { href: '/wettelijke-verplichtingen', label: 'Wettelijke verplichtingen' },
  { href: '/sectoren', label: 'Sectoren' },
  { href: '/kenniscentrum', label: 'Kenniscentrum' },
  { href: '/over-workmatchr', label: 'Over WorkMatchr' },
  { href: '/contact', label: 'Contact' },
] as const satisfies readonly LinkContent[]

export const publicFooterGroups = [
  {
    title: 'Verkennen',
    links: publicNavigation.filter((item) => item.href !== '/' && !item.href.includes('#')),
  },
  {
    title: 'Juridisch',
    links: [
      { href: '/privacy', label: 'Privacy' },
      { href: '/cookies', label: 'Cookies' },
      { href: '/algemene-voorwaarden', label: 'Algemene voorwaarden' },
    ],
  },
  {
    title: 'Account',
    links: [{ href: '/inloggen', label: 'Inloggen' }],
  },
] as const satisfies readonly { title: string; links: readonly LinkContent[] }[]

export const publicHomepageContent = {
  hero: {
    eyebrow: 'Uw digitale arbo-adviseur',
    title: 'Waarmee kunnen wij U helpen?',
    description:
      'WorkMatchr helpt U begrijpen welke verplichtingen gelden, welke oplossing bij Uw organisatie past en welke specialist U daarbij kan ondersteunen.',
    primaryAction: { href: '/advieswijzer', label: 'Start de Advieswijzer' },
    secondaryAction: { href: '/kenniscentrum', label: 'Bekijk het kenniscentrum' },
  },
  process: ['Vraag', 'Begrijpen', 'Advies', 'Specialist'],
  uncertainty: {
    title: 'Nog niet zeker wat U nodig heeft?',
    description:
      'Dat is precies waar WorkMatchr voor bedoeld is. Beantwoord een aantal korte vragen en krijg inzicht in een passende vervolgstap.',
    action: { href: '/advieswijzer', label: 'Start de Advieswijzer' },
  },
  situations: [
    {
      title: 'Ik wil voldoen aan de Arbowet',
      description: 'Krijg overzicht van veelvoorkomende verplichtingen en ontdek welke vervolgstap past.',
      href: '/wettelijke-verplichtingen',
      label: 'Bekijk de verplichtingen',
      icon: 'law',
    },
    {
      title: 'Ik heb een RI&E nodig',
      description: 'Lees wat een risico-inventarisatie en -evaluatie inhoudt en waar U kunt beginnen.',
      href: '/diensten',
      label: 'Lees meer over RI&E',
      icon: 'checklist',
    },
    {
      title: 'Ik zoek een specialist',
      description: 'Verduidelijk eerst Uw vraag, zodat later gericht naar passende deskundigheid kan worden gezocht.',
      href: '/advieswijzer',
      label: 'Verduidelijk Uw vraag',
      icon: 'search',
    },
    {
      title: 'Er is een incident gebeurd',
      description: 'Breng rustig in kaart wat er is gebeurd en welke deskundige ondersteuning mogelijk relevant is.',
      href: '/advieswijzer',
      label: 'Bekijk de vervolgstap',
      icon: 'incident',
    },
    {
      title: 'Ik wil ziekteverzuim verminderen',
      description: 'Verken welke vragen helpen om oorzaken, verantwoordelijkheden en ondersteuning te ordenen.',
      href: '/kenniscentrum',
      label: 'Bekijk betrouwbare uitleg',
      icon: 'health',
    },
    {
      title: 'Onze organisatie groeit',
      description: 'Ontdek welke arbo- en veiligheidsaandachtspunten bij veranderingen kunnen ontstaan.',
      href: '/advieswijzer',
      label: 'Breng Uw situatie in kaart',
      icon: 'growth',
    },
    {
      title: 'Ik weet nog niet wat ik nodig heb',
      description: 'Begin bij Uw situatie. U hoeft vooraf geen dienst of specialist te kiezen.',
      href: '/advieswijzer',
      label: 'Start bij Uw vraag',
      icon: 'advice',
    },
  ] satisfies readonly SituationContent[],
  steps: [
    {
      title: 'Uw vraag begrijpen',
      description: 'WorkMatchr helpt verduidelijken wat er binnen Uw organisatie speelt.',
    },
    {
      title: 'Inzicht in verplichtingen en oplossingen',
      description:
        'U krijgt inzicht in relevante aandachtspunten, mogelijke verplichtingen en passende dienstverlening.',
    },
    {
      title: 'De juiste specialist vinden',
      description: 'Wanneer Uw vraag duidelijk is, helpt WorkMatchr U passende aanbieders te vinden.',
    },
  ] satisfies readonly ProcessStepContent[],
  frequentlyAsked: [
    { title: 'Wanneer is een RI&E verplicht?', href: '/kenniscentrum' },
    { title: 'Heb ik een preventiemedewerker nodig?', href: '/kenniscentrum' },
    { title: 'Wanneer is een PMO relevant?', href: '/kenniscentrum' },
    { title: 'Wat doet een arbeidshygiënist?', href: '/kenniscentrum' },
    { title: 'Wanneer moet ik een bedrijfsarts inschakelen?', href: '/kenniscentrum' },
    { title: 'Wat moet ik doen na een arbeidsongeval?', href: '/kenniscentrum' },
  ] as const satisfies readonly { title: string; href: InternalHref }[],
  knowledgeCategories: [
    { title: 'Arbowet en verplichtingen', description: 'Algemene uitleg over verantwoordelijkheden en wettelijke kaders.' },
    { title: 'RI&E en preventie', description: 'Informatie over risico’s herkennen, beoordelen en beheersen.' },
    { title: 'Veilig en gezond werken', description: 'Praktische aandachtspunten voor arbeidsomstandigheden.' },
    { title: 'Verzuim en inzetbaarheid', description: 'Uitleg over gezondheid, verzuim en duurzame inzetbaarheid.' },
    { title: 'Specialistische ondersteuning', description: 'Een wegwijzer voor verschillende deskundigen en diensten.' },
  ],
  sectors: [
    { title: 'Bouw', description: 'Een vertrekpunt voor vragen rond wisselende werkplekken en samenwerking.' },
    { title: 'Industrie', description: 'Een vertrekpunt voor vragen rond processen, installaties en werkomgeving.' },
    { title: 'Zorg', description: 'Een vertrekpunt voor vragen rond gezond en veilig werken in de zorg.' },
    { title: 'Onderwijs', description: 'Een vertrekpunt voor vragen rond medewerkers, gebouwen en organisatie.' },
    { title: 'Logistiek', description: 'Een vertrekpunt voor vragen rond transport, opslag en werkprocessen.' },
    { title: 'Overheid en gemeenten', description: 'Een vertrekpunt voor uiteenlopende publieke werkomgevingen.' },
  ],
  principles: [
    { title: 'Eerst begrijpen', description: 'Wij helpen U eerst bepalen wat Uw organisatie nodig heeft.' },
    {
      title: 'Onafhankelijke begeleiding',
      description: 'De vraag en passende oplossing staan centraal, niet een vooraf geselecteerde aanbieder.',
    },
    {
      title: 'Gerichte verbinding',
      description: 'Pas wanneer de vraag voldoende duidelijk is, volgt de koppeling met passende specialisten.',
    },
  ],
  closing: {
    title: 'Klaar om Uw vraag te verduidelijken?',
    description: 'Start met een aantal korte vragen. U hoeft vooraf niet te weten welke dienst of specialist U nodig heeft.',
    primaryAction: { href: '/advieswijzer', label: 'Start de Advieswijzer' },
    secondaryAction: { href: '/contact', label: 'Neem contact op' },
  },
} as const
