export const publicRoutes = {
  home: '/',
  services: '/diensten',
  clients: '/voor-opdrachtgevers',
  professionals: '/voor-professionals',
  elearning: '/e-learning',
  rieLearning: '/e-learning/rie-in-de-praktijk',
  rieService: '/diensten/rie',
  preventionOfficerService: '/diensten/preventiemedewerker',
  bhvService: '/diensten/bhv',
  occupationalPhysicianService: '/diensten/bedrijfsarts',
  pmoService: '/diensten/pmo',
  safetyExpertService: '/diensten/hogere-veiligheidskundige',
  occupationalHygienistService: '/diensten/arbeidshygienist',
  incidentInvestigationService: '/diensten/incidentonderzoek',
  mediumSafetyExpertService: '/diensten/middelbare-veiligheidskundige',
  aoExpertService: '/diensten/ao-deskundige',
  ergonomistService: '/diensten/ergonoom',
  machineSafetyService: '/diensten/machineveiligheid',
  hazardousSubstancesService: '/diensten/gevaarlijke-stoffen',
  explosionSafetyService: '/diensten/atex-explosieveiligheid',
  fireSafetyService: '/diensten/brandveiligheid',
  noiseExpertService: '/diensten/geluid',
  radiationExpertService: '/diensten/stralingsdeskundige',
  occupationalPsychologistService: '/diensten/arbeidspsycholoog',
  confidentialAdvisorService: '/diensten/vertrouwenspersoon',
  absenceCaseManagerService: '/diensten/casemanager-verzuim',
  occupationalHealthService: '/diensten/arbodienst',
  inspectionBodyService: '/diensten/keuringsinstantie',
  obligations: '/wettelijke-verplichtingen',
  rieObligation: '/wettelijke-verplichtingen/rie',
  actionPlanObligation: '/wettelijke-verplichtingen/plan-van-aanpak',
  preventionOfficerObligation: '/wettelijke-verplichtingen/preventiemedewerker',
  bhvObligation: '/wettelijke-verplichtingen/bhv',
  basicContractObligation: '/wettelijke-verplichtingen/basiscontract',
  occupationalPhysicianAccessObligation: '/wettelijke-verplichtingen/toegang-bedrijfsarts',
  pagoObligation: '/wettelijke-verplichtingen/pago',
  psaObligation: '/wettelijke-verplichtingen/psa',
  accidentsObligation: '/wettelijke-verplichtingen/arbeidsongevallen',
  instructionObligation: '/wettelijke-verplichtingen/voorlichting-en-onderricht',
  sectors: '/sectoren',
  constructionSector: '/sectoren/bouw',
  industrySector: '/sectoren/industrie',
  healthcareSector: '/sectoren/zorg',
  educationSector: '/sectoren/onderwijs',
  logisticsSector: '/sectoren/logistiek-en-transport',
  businessServicesSector: '/sectoren/zakelijke-dienstverlening',
  knowledge: '/kenniscentrum',
  rieQuestion: '/kenniscentrum/moet-ik-een-rie-hebben',
  preventionOfficerQuestion: '/kenniscentrum/wat-doet-een-preventiemedewerker',
  bhvQuestion: '/kenniscentrum/hoeveel-bhvers-heb-ik-nodig',
  pmoPagoQuestion: '/kenniscentrum/verschil-pmo-en-pago',
  occupationalPhysicianQuestion: '/kenniscentrum/wanneer-bedrijfsarts-inschakelen',
  psaQuestion: '/kenniscentrum/wat-is-psychosociale-arbeidsbelasting',
  accidentQuestion: '/kenniscentrum/wanneer-arbeidsongeval-melden',
  occupationalHygienistQuestion: '/kenniscentrum/wat-doet-een-arbeidshygienist',
  incidentInvestigationQuestion: '/kenniscentrum/wanneer-incidentonderzoek-zinvol',
  about: '/over-workmatchr',
  contact: '/contact',
  guides: '/wijzers',
  complianceGuide: '/wijzers/compliance',
  bhvGuide: '/wijzers/bhv',
  adviceGuide: '/advieswijzer',
  directAssignment: '/hulpvragen/nieuw',
  privacy: '/privacy',
  cookies: '/cookies',
  terms: '/algemene-voorwaarden',
  login: '/inloggen',
} as const

export const publicAnchors = {
  askQuestion: '/#situaties',
} as const

export type PublicRoute = (typeof publicRoutes)[keyof typeof publicRoutes]
export type PublicAnchor = (typeof publicAnchors)[keyof typeof publicAnchors]
export type PublicNavigationHref = PublicRoute | PublicAnchor

export type PublicNavigationItem = {
  label: string
  href: PublicNavigationHref
  kind: 'primary' | 'standard' | 'auth'
}

export type PublicNavigationGroup = {
  key: string
  label: string
  items: readonly (PublicNavigationItem & { description: string })[]
}

export const publicNavigationGroups = [
  {
    key: 'professionals',
    label: 'Professionals & opdrachtgevers',
    items: [
      { label: 'Diensten', href: publicRoutes.services, kind: 'standard', description: 'Bekijk waarvoor u via WorkMatchr een professional kunt inschakelen.' },
      { label: 'Voor opdrachtgevers', href: publicRoutes.clients, kind: 'standard', description: 'Van hulpvraag naar passende professional.' },
      { label: 'Voor professionals', href: publicRoutes.professionals, kind: 'standard', description: 'Vind opdrachten die aansluiten bij uw expertise.' },
    ],
  },
  {
    key: 'workmatchr',
    label: 'WorkMatchr',
    items: [
      { label: 'Kenniscentrum', href: publicRoutes.knowledge, kind: 'standard', description: 'Praktische kennis over gezond en veilig werken.' },
      { label: 'E-learning', href: publicRoutes.elearning, kind: 'standard', description: 'Online Arbo-opleidingen met eindtoets en certificaat. Binnenkort beschikbaar.' },
      { label: 'Arbo Compliance Check', href: publicRoutes.complianceGuide, kind: 'standard', description: 'Krijg inzicht in uw Arbo-verplichtingen. Publieke uitleg; inloggen om de check te starten.' },
    ],
  },
] as const satisfies readonly PublicNavigationGroup[]

export const publicNavigationItems: readonly PublicNavigationItem[] = [
  ...publicNavigationGroups.flatMap<PublicNavigationItem>((group) => group.items),
  { label: 'Inloggen', href: publicRoutes.login, kind: 'auth' },
]

export const publicFooterGroups = [
  {
    title: 'Vind uw route',
    links: [
      { label: 'Kenniscentrum', href: publicRoutes.knowledge },
      { label: 'Sectoren', href: publicRoutes.sectors },
      { label: 'Diensten', href: publicRoutes.services },
      { label: 'Wettelijke verplichtingen', href: publicRoutes.obligations },
      { label: 'Arbo-wijzers', href: publicRoutes.guides },
    ],
  },
  {
    title: 'WorkMatchr',
    links: [
      { label: 'Over WorkMatchr', href: publicRoutes.about },
      { label: 'Contact', href: publicRoutes.contact },
      { label: 'Privacy', href: publicRoutes.privacy },
      { label: 'Cookies', href: publicRoutes.cookies },
      { label: 'Algemene voorwaarden', href: publicRoutes.terms },
    ],
  },
  {
    title: 'Account',
    links: [{ label: 'Inloggen', href: publicRoutes.login }],
  },
] as const satisfies readonly { title: string; links: readonly { label: string; href: PublicNavigationHref }[] }[]

export const indexablePublicRoutes = [
  publicRoutes.home,
  publicRoutes.services,
  publicRoutes.clients,
  publicRoutes.professionals,
  publicRoutes.elearning,
  publicRoutes.rieLearning,
  publicRoutes.rieService,
  publicRoutes.preventionOfficerService,
  publicRoutes.bhvService,
  publicRoutes.occupationalPhysicianService,
  publicRoutes.pmoService,
  publicRoutes.safetyExpertService,
  publicRoutes.occupationalHygienistService,
  publicRoutes.incidentInvestigationService,
  publicRoutes.mediumSafetyExpertService,
  publicRoutes.aoExpertService,
  publicRoutes.ergonomistService,
  publicRoutes.machineSafetyService,
  publicRoutes.hazardousSubstancesService,
  publicRoutes.explosionSafetyService,
  publicRoutes.fireSafetyService,
  publicRoutes.noiseExpertService,
  publicRoutes.radiationExpertService,
  publicRoutes.occupationalPsychologistService,
  publicRoutes.confidentialAdvisorService,
  publicRoutes.absenceCaseManagerService,
  publicRoutes.occupationalHealthService,
  publicRoutes.inspectionBodyService,
  publicRoutes.obligations,
  publicRoutes.rieObligation,
  publicRoutes.actionPlanObligation,
  publicRoutes.preventionOfficerObligation,
  publicRoutes.bhvObligation,
  publicRoutes.basicContractObligation,
  publicRoutes.occupationalPhysicianAccessObligation,
  publicRoutes.pagoObligation,
  publicRoutes.psaObligation,
  publicRoutes.accidentsObligation,
  publicRoutes.instructionObligation,
  publicRoutes.sectors,
  publicRoutes.constructionSector,
  publicRoutes.industrySector,
  publicRoutes.healthcareSector,
  publicRoutes.educationSector,
  publicRoutes.logisticsSector,
  publicRoutes.businessServicesSector,
  publicRoutes.knowledge,
  publicRoutes.rieQuestion,
  publicRoutes.preventionOfficerQuestion,
  publicRoutes.bhvQuestion,
  publicRoutes.pmoPagoQuestion,
  publicRoutes.occupationalPhysicianQuestion,
  publicRoutes.psaQuestion,
  publicRoutes.accidentQuestion,
  publicRoutes.occupationalHygienistQuestion,
  publicRoutes.incidentInvestigationQuestion,
  publicRoutes.guides,
  publicRoutes.complianceGuide,
  publicRoutes.bhvGuide,
  publicRoutes.adviceGuide,
] as const satisfies readonly PublicRoute[]

export function isRegisteredPublicHref(href: string): href is PublicNavigationHref {
  return (Object.values(publicRoutes) as readonly string[]).includes(href) || (Object.values(publicAnchors) as readonly string[]).includes(href)
}
