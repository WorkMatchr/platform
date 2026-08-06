import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { serviceOverview } from '@/content/public-overviews'
import { getServiceBySlug } from '@/content/services'
import ServicesPage from './page'
import ServicePage, { generateStaticParams } from './[slug]/page'

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;')
}

describe('publiek dienstenoverzicht', () => {
  it('toont alle diensten in een compacte, logisch geordende lijst', () => {
    const html = renderToStaticMarkup(<ServicesPage />)

    expect(serviceOverview).toHaveLength(8)
    expect(html).toContain('data-overview-density="compact"')
    expect(html).toContain('<ul')
    expect(html).not.toContain('Bekijk dienst')
    expect(html).not.toContain('>Dienst<')

    for (const item of serviceOverview) {
      expect(html).toContain(escapeHtml(item.title))
      expect(html).toContain(escapeHtml(item.description))
      expect(html).toContain(`href="${item.href}"`)
    }

    expect(html.indexOf(escapeHtml(serviceOverview[0]!.title))).toBeLessThan(
      html.indexOf(escapeHtml(serviceOverview[1]!.title)),
    )
  })

  it('genereert iedere dynamische dienstslug en rendert Bedrijfsarts inhoudelijk', async () => {
    const generatedSlugs = new Set(generateStaticParams().map(({ slug }) => slug))
    const dynamicServices = serviceOverview.filter((item) => item.href !== '/diensten/rie')

    expect(dynamicServices.every((item) => generatedSlugs.has(item.href!.split('/').at(-1)!))).toBe(true)
    expect(getServiceBySlug('bedrijfsarts')).toBeTruthy()

    const html = renderToStaticMarkup(
      await ServicePage({ params: Promise.resolve({ slug: 'bedrijfsarts' }) }),
    )
    expect(html).toContain('Ondersteuning door een bedrijfsarts')
    expect(html).toContain('Home')
    expect(html).toContain('Diensten')
  })
})
