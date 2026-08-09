import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OrganizationForm } from './organization-form'

const sectors = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Bouw' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Zorg' },
]

describe('sectorselectie in het organisatieformulier', () => {
  it('rendert centrale sectoropties als toegankelijke checkboxen en behoudt de selectie', () => {
    const html = renderToStaticMarkup(
      <OrganizationForm
        action={async () => ({})}
        initialValues={{ sectorIds: [sectors[1].id] }}
        mode="create"
        sectors={sectors}
      />,
    )

    expect(html).toContain('type="checkbox"')
    expect(html).toContain('>Bouw<')
    expect(html).toContain('>Zorg<')
    expect(html).toMatch(new RegExp(`checked="" value="${sectors[1].id}"`))
    expect(html).not.toContain('sectorIds-error')
  })
})
