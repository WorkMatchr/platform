import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { platformAdminNavigation, platformAdminNavigationGroups } from './platform-admin-navigation'

describe('platformbeheernavigatie', () => {
  it('groepeert alle afgesproken hoofdonderdelen in vaste volgorde', () => {
    expect(platformAdminNavigationGroups.map((group) => group.label)).toEqual([
      'Dagelijks beheer', 'Beoordelingen', 'Inzicht', 'Systeem',
    ])
    expect(platformAdminNavigation.map((item) => item.label)).toEqual([
      'Dashboard', 'Organisaties', 'Gebruikers', 'Dienstverleners', 'Opdrachten',
      'Reviews', 'Goedkeuringen', 'Audit',
      'Marketplace', 'Trends', 'Rapportages', 'Instellingen',
    ])
  })

  it('verwijst uitsluitend naar bestaande beveiligde pagina’s', () => {
    for (const item of platformAdminNavigation) {
      const relative = item.href === '/platformbeheer' ? 'src/app/platformbeheer/page.tsx' : `src/app${item.href}/page.tsx`
      expect(existsSync(join(process.cwd(), relative)), relative).toBe(true)
    }
    const layout = readFileSync(join(process.cwd(), 'src/app/platformbeheer/layout.tsx'), 'utf8')
    expect(layout).toContain('requirePlatformAdministrator')
  })

  it('behoudt een logische mobiele en toetsenbordvolgorde met native links', () => {
    const shell = readFileSync(join(process.cwd(), 'src/components/platform-admin/platform-admin-shell.tsx'), 'utf8')
    expect(shell).toContain('<nav')
    expect(shell).toContain('<Link')
    expect(shell).toContain('platformAdminNavigationGroups.map')
    expect(shell).not.toContain('tabIndex={-1}')
  })
})
