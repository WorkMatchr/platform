import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('Mijn opdrachten-pagina', () => {
  it('combineert de bestaande intake- en opdrachtpresentatie op de canonieke route', () => {
    const page = read('src/app/opdrachten/page.tsx')
    const overview = read('src/components/assignments/my-assignments-overview.tsx')

    expect(page).toContain('Mijn opdrachten')
    expect(page).toContain('getMyAssignmentsOverview')
    expect(page).toContain('IntakeStartForm')
    expect(page).toContain('lg:grid-cols-[minmax(0,1.85fr)_minmax(20rem,1fr)]')
    expect(page).toContain('order-1 lg:order-2')
    expect(page).toContain('order-2 lg:order-1')
    expect(overview).toContain('Open voor offertes')
    expect(overview).toContain('Afgerond')
    expect(overview).toContain('Beëindigd')
  })

  it('houdt de nieuwe-opdrachtflow bij de bestaande server action', () => {
    const page = read('src/app/opdrachten/page.tsx')

    expect(page).toContain('action={createIntakeAction}')
    expect(page).toContain('label="Waar heeft u ondersteuning bij nodig?"')
    expect(page).toContain('organizationId={organization.id}')
  })
})
