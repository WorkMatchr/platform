import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getPlatformAdminNavigationGroups, platformAdminNavigation, platformAdminNavigationGroups } from './platform-admin-navigation'

describe('platformbeheernavigatie', () => {
  it('groepeert alle afgesproken hoofdonderdelen in vaste volgorde', () => {
    expect(platformAdminNavigationGroups.map((group) => group.label)).toEqual([
      'Dagelijks beheer', 'Beoordelingen', 'Inzicht', 'Financieel', 'Systeem',
    ])
    expect(platformAdminNavigation.map((item) => item.label)).toEqual([
      'Dashboard', 'Actiecentrum', 'Organisaties', 'Dienstverleners', 'Opdrachten',
      'Reviews', 'Goedkeuringen', 'Audit',
      'Betrouwbaarheid', 'Trends', 'Rapportages', 'Kennisbeheer',
      'Overzicht', 'Betalingen', 'Facturen', 'Terugbetalingen', 'Marketplace',
      'Platformbeheerders', 'Instellingen', 'Bedrijfsregels',
    ])
    expect(platformAdminNavigation.map((item) => item.label)).not.toContain('Gebruikers')
    expect(platformAdminNavigationGroups.find((group) => group.label === 'Financieel')?.items.map((item) => item.label)).toContain('Marketplace')
    expect(platformAdminNavigationGroups.find((group) => group.label === 'Systeem')?.items.map((item) => item.label)).toContain('Bedrijfsregels')
  })

  it('verwijst uitsluitend naar bestaande beveiligde pagina’s', () => {
    for (const item of platformAdminNavigation) {
      const relative = item.href === '/platformbeheer' ? 'src/app/platformbeheer/page.tsx' : `src/app${item.href}/page.tsx`
      expect(existsSync(join(process.cwd(), relative)), relative).toBe(true)
    }
    const layout = readFileSync(join(process.cwd(), 'src/app/platformbeheer/layout.tsx'), 'utf8')
    expect(layout).toContain('requirePlatformAuditor')
  })

  it('beperkt de navigatie voor een platformauditor tot audit', () => {
    expect(getPlatformAdminNavigationGroups('MEMBER')).toEqual([
      { label: 'Controle', tone: 'reviews', items: [{ href: '/platformbeheer/auditor', label: 'Audit' }] },
    ])
    expect(getPlatformAdminNavigationGroups('ADMIN')).toEqual(platformAdminNavigationGroups)
    expect(getPlatformAdminNavigationGroups('OWNER')).toEqual(platformAdminNavigationGroups)
  })

  it('behoudt een logische mobiele en toetsenbordvolgorde met native links', () => {
    const menu = readFileSync(join(process.cwd(), 'src/components/platform-admin/platform-admin-navigation-menu.tsx'), 'utf8')
    const accordion = readFileSync(join(process.cwd(), 'src/components/layout/accordion-navigation.tsx'), 'utf8')
    expect(accordion).toContain('<nav')
    expect(accordion).toContain('<details')
    expect(accordion).toContain('<summary')
    expect(accordion).toContain('aria-current')
    expect(menu).not.toContain('tabIndex={-1}')
  })

  it('houdt de platformmatcher binnen de clientgrens', () => {
    const menu = readFileSync(join(process.cwd(), 'src/components/platform-admin/platform-admin-navigation-menu.tsx'), 'utf8')
    const shell = readFileSync(join(process.cwd(), 'src/components/platform-admin/platform-admin-shell.tsx'), 'utf8')

    expect(menu.trimStart().startsWith("'use client'")).toBe(true)
    expect(menu).toContain('isRouteActive={isPlatformAdminRouteActive}')
    expect(shell).not.toContain('isRouteActive=')
    expect(shell).toContain('<PlatformAdminNavigationMenu membershipRole={membershipRole} />')
  })

  it('biedt gebruikersbeheer vanuit iedere organisatiecontext aan', () => {
    const route = join(process.cwd(), 'src/app/platformbeheer/organisaties/[organizationId]/gebruikers/page.tsx')
    expect(existsSync(route)).toBe(true)
    expect(readFileSync(route, 'utf8')).toContain('PlatformOrganizationUsers')
  })
})
