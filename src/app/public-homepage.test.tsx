import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HomePage, { metadata } from './page'
import { PublicHomepageV02 } from '@/components/public/public-homepage-v02'

describe('homepage v0.2 release', () => {
  it('rendert v0.2 op de canonieke homepage', () => {
    expect(renderToStaticMarkup(<HomePage />)).toBe(renderToStaticMarkup(<PublicHomepageV02 />))
    expect(metadata.alternates?.canonical).toBe('/')
    expect(metadata.robots).toBeUndefined()
  })
  it('behoudt alle instaplinks en generieke CTA’s', () => {
    const html = renderToStaticMarkup(<HomePage />)
    expect(html.match(/href="\/advieswijzer\?start=deskundigheid"/g)).toHaveLength(2)
    expect(html.match(/href="\/advieswijzer\?start=onderwerp"/g)).toHaveLength(2)
    expect(html).toContain('href="/advieswijzer"')
    expect(html).toContain('Deskundigheid voor verschillende Arbo- en veiligheidsvragen')
    expect(html).not.toContain('frontpage-v02')
  })
})
