import type { PlatformMembershipRole } from './platform-admin-policy'

const operatorNavigationGroups = [
  {
    label: 'Dagelijks beheer',
    items: [
      { href: '/platformbeheer', label: 'Dashboard' },
      { href: '/platformbeheer/actiecentrum', label: 'Actiecentrum' },
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
      { href: '/platformbeheer/marketplace/regels', label: 'Bedrijfsregels' },
      { href: '/platformbeheer/marketplace/betrouwbaarheid', label: 'Betrouwbaarheid' },
      { href: '/platformbeheer/trends', label: 'Trends' },
      { href: '/platformbeheer/rapportages', label: 'Rapportages' },
      { href: '/platformbeheer/kennisbank', label: 'Kennisbeheer' },
    ],
  },
  {
    label: 'Financieel',
    items: [
      { href: '/platformbeheer/financien', label: 'Overzicht' },
      { href: '/platformbeheer/financien/betalingen', label: 'Betalingen' },
      { href: '/platformbeheer/financien/facturen', label: 'Facturen' },
      { href: '/platformbeheer/financien/terugbetalingen', label: 'Terugbetalingen' },
    ],
  },
  {
    label: 'Systeem',
    items: [
      { href: '/platformbeheer/platformbeheerders', label: 'Platformbeheerders' },
      { href: '/platformbeheer/instellingen', label: 'Instellingen' },
    ],
  },
] as const

const auditorNavigationGroups = [
  {
    label: 'Controle',
    items: [{ href: '/platformbeheer/auditor', label: 'Audit' }],
  },
] as const

export function getPlatformAdminNavigationGroups(membershipRole: PlatformMembershipRole) {
  return membershipRole === 'MEMBER' ? auditorNavigationGroups : operatorNavigationGroups
}

export const platformAdminNavigationGroups = operatorNavigationGroups

export const platformAdminNavigation = [
  ...operatorNavigationGroups[0].items,
  ...operatorNavigationGroups[1].items,
  ...operatorNavigationGroups[2].items,
  ...operatorNavigationGroups[3].items,
  ...operatorNavigationGroups[4].items,
] as const

export type PlatformAdminRoute = (typeof platformAdminNavigation)[number]['href']
