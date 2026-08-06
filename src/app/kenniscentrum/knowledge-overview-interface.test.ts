import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('compact publiek kennisoverzicht', () => {
  it('toont geen publieke zoekfunctie en gebruikt compacte overzichtskaarten', () => {
    const page = read('src/app/kenniscentrum/page.tsx')
    const grid = read('src/components/public/public-overview-grid.tsx')
    const card = read('src/components/public/public-content-card.tsx')

    expect(page).not.toContain('KnowledgeSearch')
    expect(page).not.toContain('Zoeken in publieke informatie')
    expect(page).toContain('compact')
    expect(grid).toContain('gap-3')
    expect(grid).toContain('compact')
    expect(card).toContain('group block h-full')
    expect(card).toContain('!p-4')
  })

  it('linkt de vier informatietypen naar hun bestaande overzichten', () => {
    const page = read('src/app/kenniscentrum/page.tsx')

    expect(page).toContain('title="Diensten"')
    expect(page).toContain('href={publicRoutes.services}')
    expect(page).toContain('title="Wettelijke verplichtingen"')
    expect(page).toContain('href={publicRoutes.obligations}')
    expect(page).toContain('title="Sectoren"')
    expect(page).toContain('href={publicRoutes.sectors}')
    expect(page).toContain('title="Kennisartikelen"')
    expect(page).toContain('href={publicRoutes.knowledge}')
    expect(page).toContain('id="categories-title">Categorieën</Heading>')
  })
})
