import type { PlatformMembershipRole } from './platform-admin-policy'

const link = (path: string, label: string) => ({ href: `/platformbeheer${path}`, label })

export const platformAdminChapters = [
  { label: 'Overzicht', items: [link('', 'Dagelijkse cockpit'), link('/actiecentrum', 'Actiecentrum'), link('/trends', 'Trends'), link('/rapportages', 'Rapportages')] },
  { label: 'Gebruikers & organisaties', items: [link('/organisaties', 'Organisaties'), link('/gebruikers', 'Gebruikers')] },
  { label: 'Opdrachten & dienstverlening', items: [link('/opdrachten', 'Opdrachten'), link('/dienstverleners', 'Dienstverleners'), link('/reviewer', 'Reviews'), link('/approver', 'Goedkeuringen'), link('/marketplace/betrouwbaarheid', 'Betrouwbaarheid')] },
  { label: 'Financieel', items: [link('/financien', 'Overzicht & abonnementen'), link('/financien/betalingen', 'Betalingen'), link('/financien/facturen', 'Facturen'), link('/financien/terugbetalingen', 'Terugbetalingen'), link('/marketplace', 'Credits & marketplace'), link('/marketplace/regels', 'Prijzen & bedrijfsregels')] },
  { label: 'Kennis & content', items: [link('/kennisbank', 'Kennisbeheer'), link('/kennisbank/bronnen/uploaden', 'Bronnen toevoegen'), link('/kennisbank/beoordelingen', 'Beoordelingen'), link('/kennisbank/meldingen', 'Meldingen')] },
  { label: 'Platform & instellingen', items: [link('/instellingen', 'Instellingen'), link('/trading/toegang', 'Tradingtoegang')] },
  { label: 'Beveiliging & audit', items: [link('/auditor', 'Audit'), link('/platformbeheerders', 'Platformbeheerders')] },
]

export function getPlatformAdminChapters(role: PlatformMembershipRole) {
  return role === 'MEMBER'
    ? [{ label: 'Beveiliging & audit', items: [link('/auditor', 'Audit')] }]
    : platformAdminChapters
}

export function getPlatformAdminActiveItem(pathname: string, role: PlatformMembershipRole) {
  const chapters = getPlatformAdminChapters(role)
  // Detail routes belong to the most specific existing management screen.
  const path = /\/dienstverleners\/[^/]+\/credits$/.test(pathname)
    ? '/platformbeheer/marketplace'
    : pathname.startsWith('/platformbeheer/communicatie/') ? '/platformbeheer/auditor' : pathname
  return chapters.flatMap((chapter) => chapter.items.map((item) => ({ chapter, item })))
    .filter(({ item }) => path === item.href || (item.href !== '/platformbeheer' && path.startsWith(`${item.href}/`)))
    .sort((a, b) => b.item.href.length - a.item.href.length)[0]
}
