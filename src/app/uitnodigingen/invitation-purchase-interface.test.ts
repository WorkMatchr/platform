import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('opdracht kopen-interface', () => {
  it('communiceert prijs, directe afschrijving en de volledige weergave na aankoop', () => {
    const page = readFileSync(join(root, 'src', 'app', 'uitnodigingen', '[invitationId]', 'page.tsx'), 'utf8')
    expect(page).toContain('Opdracht kopen — 25 credits')
    expect(page).toContain('direct en definitief afgeschreven')
    expect(page).toContain('Maximaal {preview.maximumPurchasers} professionals')
    expect(page).toContain('Volledige opdrachtinformatie')
    expect(page).not.toContain('credits reserveren')
  })

  it('bepaalt preview en volledige toegang in de server-query', () => {
    const query = readFileSync(join(root, 'src', 'lib', 'marketplace', 'dashboard-query-service.ts'), 'utf8')
    expect(query).toContain('toAssignmentPreview')
    expect(query).toContain('fullAssignment: hasFullAccess ? invitation.assignment : null')
  })
})
