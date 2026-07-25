export const platformAdminNavigationGroups = [
  {
    label: 'Dagelijks beheer',
    items: [
      { href: '/platformbeheer', label: 'Dashboard' },
      { href: '/platformbeheer/organisaties', label: 'Organisaties' },
      { href: '/platformbeheer/gebruikers', label: 'Gebruikers' },
      { href: '/platformbeheer/dienstverleners', label: 'Dienstverleners' },
      { href: '/platformbeheer/opdrachten', label: 'Opdrachten' },
    ],
  },
  {
    label: 'Beoordelingen',
    items: [
      { href: '/platformbeheer/reviewer', label: 'Reviews' },
      { href: '/platformbeheer/approver', label: 'Goedkeuringen' },
      { href: '/platformbeheer/auditor', label: 'Audit' },
    ],
  },
  {
    label: 'Inzicht',
    items: [
      { href: '/platformbeheer/marketplace', label: 'Marketplace' },
      { href: '/platformbeheer/trends', label: 'Trends' },
      { href: '/platformbeheer/rapportages', label: 'Rapportages' },
    ],
  },
  {
    label: 'Systeem',
    items: [{ href: '/platformbeheer/instellingen', label: 'Instellingen' }],
  },
] as const

export const platformAdminNavigation = [
  ...platformAdminNavigationGroups[0].items,
  ...platformAdminNavigationGroups[1].items,
  ...platformAdminNavigationGroups[2].items,
  ...platformAdminNavigationGroups[3].items,
] as const

export type PlatformAdminRoute = (typeof platformAdminNavigation)[number]['href']
