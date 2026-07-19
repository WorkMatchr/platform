export const publicRoutes = {
  home: '/',
  services: '/diensten',
  rieService: '/diensten/rie',
  obligations: '/wettelijke-verplichtingen',
  rieObligation: '/wettelijke-verplichtingen/rie',
  sectors: '/sectoren',
  knowledge: '/kenniscentrum',
  rieQuestion: '/kenniscentrum/moet-ik-een-rie-hebben',
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
  publicRoutes.obligations,
  publicRoutes.rieObligation,
  publicRoutes.sectors,
  publicRoutes.knowledge,
  publicRoutes.rieQuestion,
  publicRoutes.adviceGuide,
] as const satisfies readonly PublicRoute[]

export type PublicContentReference = {
  type: 'knowledge' | 'service' | 'obligation' | 'sector'
  slug: string
  title: string
  href: PublicRoute
}

export const rieContentReferences = {
  knowledge: {
    type: 'knowledge',
    slug: 'moet-ik-een-rie-hebben',
    title: 'Moet ik een RI&E hebben?',
    href: publicRoutes.rieQuestion,
  },
  service: {
    type: 'service',
    slug: 'rie',
    title: 'Ondersteuning bij een RI&E',
    href: publicRoutes.rieService,
  },
  obligation: {
    type: 'obligation',
    slug: 'rie',
    title: 'RI&E als wettelijke verplichting',
    href: publicRoutes.rieObligation,
  },
} as const satisfies Record<string, PublicContentReference>

export function isRegisteredPublicHref(href: string): href is PublicNavigationHref {
  return (Object.values(publicRoutes) as readonly string[]).includes(href) || (Object.values(publicAnchors) as readonly string[]).includes(href)
}
