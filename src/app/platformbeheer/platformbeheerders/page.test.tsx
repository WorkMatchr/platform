import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Platformbeheerderspagina', () => {
  const source = readFileSync(
    'src/app/platformbeheer/platformbeheerders/page.tsx',
    'utf8',
  )

  it('gebruikt begrijpelijke platformrollen en beheeracties', () => {
    expect(source).toContain("OWNER: 'Platformeigenaar'")
    expect(source).toContain("ADMIN: 'Platformbeheerder'")
    expect(source).toContain("MEMBER: 'Platformauditor'")
    expect(source).toContain('Nieuwe beheerder uitnodigen')
    expect(source).toContain('Opnieuw versturen')
    expect(source).toContain('Uitnodiging intrekken')
    expect(source).toContain('Blokkeren')
    expect(source).toContain('Toegang intrekken')
  })

  it('laat uitsluitend de platformeigenaar mutatieformulieren zien', () => {
    expect(source).toContain(
      "data.context.platformMembership.role === 'OWNER'",
    )
    expect(source).toContain('Alleen lezen')
  })
})
