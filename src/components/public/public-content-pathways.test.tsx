import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PublicContentPathways } from './public-content-pathways'

describe('publieke vervolgroutes', () => {
  it('groepeert bestaande relaties compact en toont één duidelijke CTA', () => {
    const html = renderToStaticMarkup(<PublicContentPathways contentId="knowledge:rie-required" embedded />)

    expect(html).toContain('Gerelateerde diensten')
    expect(html).toContain('Gerelateerde sectoren')
    expect(html).toContain('Gerelateerde wettelijke verplichtingen')
    expect(html).not.toContain('Gerelateerde kennis')
    expect(html.match(/>Stel uw vraag</g)).toHaveLength(1)
    expect(html).toContain('href="/advieswijzer"')
    expect(html).not.toContain('shadow-card')
  })

  it('behoudt een contextuele Advieswijzer-route', () => {
    const html = renderToStaticMarkup(<PublicContentPathways contentId="knowledge:incident-investigation" primaryHref="/advieswijzer?bron=incident" embedded />)
    expect(html).toContain('href="/advieswijzer?bron=incident"')
  })
})
