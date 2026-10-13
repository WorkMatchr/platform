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
    expect(html.match(/>Vraag ondersteuning aan</g)).toHaveLength(1)
    expect(html).toContain('href="/opdracht-starten"')
    expect(html).not.toContain('shadow-card')
  })

  it('behoudt een contextuele Advieswijzer-route', () => {
    const html = renderToStaticMarkup(<PublicContentPathways contentId="knowledge:incident-investigation" primaryHref="/opdracht-starten?bron=incident" embedded />)
    expect(html).toContain('href="/opdracht-starten?bron=incident"')
  })
})

it.each([false, true])('allows a scoped CTA label without changing other pages (embedded=%s)', embedded => {
  const service = renderToStaticMarkup(<PublicContentPathways contentId="overview:services" embedded={embedded} linkLabel="Start uw opdracht" />)
  expect(service.match(/>Start uw opdracht</g)).toHaveLength(1)
  expect(service).toContain('href="/opdracht-starten"')
  for (const contentId of ['overview:knowledge', 'overview:sectors', 'overview:obligations'] as const) {
    const other = renderToStaticMarkup(<PublicContentPathways contentId={contentId} embedded={embedded} />)
    expect(other.match(/>Vraag ondersteuning aan</g)).toHaveLength(1)
    expect(other).not.toContain('>Start uw opdracht<')
    expect(other).toContain('font-semibold text-brand-primary hover:text-brand-primary-hover')
  }
})
it.each(['overview:services', 'service:rie', 'service:bedrijfsarts'] as const)('uses the existing darker token for service related links: %s', contentId => {
  const html = renderToStaticMarkup(<PublicContentPathways contentId={contentId} />)
  const links = [...html.matchAll(/class="(group inline-flex[^"]+)"/g)]
  expect(links.length).toBeGreaterThan(0)
  for (const link of links) expect(link[1]).toContain('text-brand-primary-hover hover:text-brand-dark')
})
