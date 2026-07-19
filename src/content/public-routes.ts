export const publicRoutes = {
  home: '/',
  services: '/diensten',
  rieService: '/diensten/rie',
  preventionOfficerService: '/diensten/preventiemedewerker',
  bhvService: '/diensten/bhv',
  occupationalPhysicianService: '/diensten/bedrijfsarts',
  pmoService: '/diensten/pmo',
  safetyExpertService: '/diensten/hogere-veiligheidskundige',
  occupationalHygienistService: '/diensten/arbeidshygienist',
  incidentInvestigationService: '/diensten/incidentonderzoek',
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
  adviceGuide: '/advieswijzer',
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

export const publicNavigationItems = [
  { label: 'Stel uw vraag', href: publicRoutes.adviceGuide, kind: 'primary' },
  { label: 'Diensten', href: publicRoutes.services, kind: 'standard' },
  { label: 'Wettelijke verplichtingen', href: publicRoutes.obligations, kind: 'standard' },
  { label: 'Sectoren', href: publicRoutes.sectors, kind: 'standard' },
  { label: 'Kenniscentrum', href: publicRoutes.knowledge, kind: 'standard' },
  { label: 'Over WorkMatchr', href: publicRoutes.about, kind: 'standard' },
  { label: 'Contact', href: publicRoutes.contact, kind: 'standard' },
  { label: 'Inloggen', href: publicRoutes.login, kind: 'auth' },
] as const satisfies readonly PublicNavigationItem[]

export const publicFooterGroups = [
  {
    title: 'Vind uw route',
    links: publicNavigationItems.filter((item) => item.kind === 'primary' || ['Diensten', 'Wettelijke verplichtingen', 'Sectoren', 'Kenniscentrum'].includes(item.label)),
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
  publicRoutes.rieService,
  publicRoutes.preventionOfficerService,
  publicRoutes.bhvService,
  publicRoutes.occupationalPhysicianService,
  publicRoutes.pmoService,
  publicRoutes.safetyExpertService,
  publicRoutes.occupationalHygienistService,
  publicRoutes.incidentInvestigationService,
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
  publicRoutes.adviceGuide,
] as const satisfies readonly PublicRoute[]

export function isRegisteredPublicHref(href: string): href is PublicNavigationHref {
  return (Object.values(publicRoutes) as readonly string[]).includes(href) || (Object.values(publicAnchors) as readonly string[]).includes(href)
}
