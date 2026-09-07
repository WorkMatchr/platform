import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
const read = (name: string) => readFileSync(name, 'utf8')
describe('Trading beheerinterface', () => {
  it('gebruikt bestaande beheerdersguard en geen losse beheerlogin', () => {
    const page=read('src/app/platformbeheer/trading/toegang/page.tsx')
    const actions=read('src/app/platformbeheer/trading/toegang/actions.ts')
    expect(page).toContain('requirePlatformOperator')
    expect(actions.match(/await requirePlatformOperator/g)).toHaveLength(2)
    expect(page).toContain('Wachtwoord resetten')
    expect(page).toContain('Alle sessies beëindigen')
    expect(page+actions).not.toContain('TRADING_ADMIN_API_TOKEN')
    expect(page+actions).not.toContain('reset_url')
  })
  it('voegt Trading toe aan operatornavigatie, niet aan auditornavigatie', () => {
    const navigation=read('src/lib/platform-admin/platform-admin-navigation.ts')
    expect(navigation.split('const auditorNavigationGroups')[0]).toContain('/platformbeheer/trading/toegang')
    expect(navigation.split('const auditorNavigationGroups')[1].split('export function')[0]).not.toContain('/trading')
  })
})
