import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/kenniscentrum' }))

import { PublicNavigation } from './public-navigation'

describe('publieke navigatie', () => {
  it('markeert de actieve route in desktop- en mobiele navigatie', () => {
    const html = renderToStaticMarkup(<PublicNavigation />)
    expect(html.match(/aria-current="page"/g)).toHaveLength(2)
    expect(html.match(/href="\/kenniscentrum"/g)).toHaveLength(2)
    expect(html).toContain('Hoofdnavigatie openen of sluiten')
  })

  it('biedt de volledige navigatie en Advieswijzer zonder dode links', () => {
    const html = renderToStaticMarkup(<PublicNavigation />)
    expect(html).toContain('Wettelijke verplichtingen')
    expect(html).toContain('Over WorkMatchr')
    expect(html).toContain('Start de Advieswijzer')
    expect(html).not.toContain('href="#"')
  })
})
