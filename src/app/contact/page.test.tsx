import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ContactPage, { metadata } from './page'

describe('publieke contactpagina', () => {
  const html = renderToStaticMarkup(<ContactPage />)

  it('biedt alle afgesproken contactroutes zonder placeholdertekst', () => {
    for (const title of [
      'Algemene vragen',
      'Voor opdrachtgevers',
      'Voor professionals',
      'Vragen over opdrachten',
      'Kenniscentrum',
      'Technische ondersteuning',
      'Privacy en klachten',
    ]) expect(html).toContain(title)

    expect(html).not.toContain('wordt voorbereid')
    expect(html).toContain('mailto:contact@workmatchr.nl')
    expect(html).toContain('href="/privacy"')
    expect(html).toContain('href="/advieswijzer"')
  })

  it('behoudt een logische headingstructuur en responsieve DOM-volgorde', () => {
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html.match(/<h2(?:\s|>)/g)).toHaveLength(7)
    expect(html).toContain('md:grid-cols-2')
    expect(html).toContain('xl:grid-cols-3')
    expect(html).toContain('min-w-0')
    expect(html).toContain('w-full sm:w-fit')
  })

  it('is indexeerbaar en heeft publieke metadata', () => {
    expect(metadata.alternates?.canonical).toBe('/contact')
    expect(metadata.robots).toBeUndefined()
  })
})
