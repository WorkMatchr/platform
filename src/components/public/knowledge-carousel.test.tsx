import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { knowledgeOverview } from '@/content/public-overviews'
import { isRegisteredPublicHref } from '@/content/public-routes'
import { KnowledgeCarousel } from './knowledge-carousel'

const items = knowledgeOverview.filter((item) => item.href !== undefined)

describe('kenniscentrumcarousel', () => {
  it('toont het eerste bestaande kennisitem met route en toegankelijke bediening', () => {
    const html = renderToStaticMarkup(<KnowledgeCarousel items={items} />)

    expect(html).toContain('Moet ik een RI&amp;E hebben?')
    expect(html).toContain('href="/kenniscentrum/moet-ik-een-rie-hebben"')
    expect(html).toContain('aria-label="Vorig kennisitem"')
    expect(html).toContain('aria-label="Volgend kennisitem"')
    expect(html).toContain('aria-label="Positie 1 van 9"')
    expect(html).toContain('aria-live="off"')
    expect(html.match(/invisible pointer-events-none/g)).toHaveLength(8)
  })

  it('gebruikt alle bestaande kennisitems in een vaste volgorde', () => {
    expect(items.map((item) => item.title)).toEqual([
      'Moet ik een RI&E hebben?',
      'Wat doet een preventiemedewerker?',
      'Hoeveel BHV’ers heeft mijn organisatie nodig?',
      'Wat is het verschil tussen PMO en PAGO?',
      'Wanneer moet ik een bedrijfsarts inschakelen?',
      'Wat valt onder psychosociale arbeidsbelasting?',
      'Wanneer moet een arbeidsongeval worden gemeld?',
      'Wat doet een arbeidshygiënist?',
      'Wanneer is incidentonderzoek zinvol?',
    ])
    expect(items.every((item) => isRegisteredPublicHref(item.href))).toBe(true)
  })
})
