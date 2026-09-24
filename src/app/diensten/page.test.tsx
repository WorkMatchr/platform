import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { expertiseOverview, serviceOverview } from '@/content/public-overviews'
import { getServiceBySlug, services } from '@/content/services'
import { canonicalExpertiseServices, existingCanonicalServiceSlugs } from '@/content/canonical-expertise-services'
import { requestedExpertiseOptions } from '@/lib/requests/simple-advice-contract'
import ServicesPage from './page'
import ServicePage, { generateStaticParams } from './[slug]/page'

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;')
}

describe('publiek dienstenoverzicht', () => {
  it('toont alle diensten in een compacte, logisch geordende lijst', () => {
    const html = renderToStaticMarkup(<ServicesPage />)

    expect(serviceOverview).toHaveLength(2)
    expect(expertiseOverview).toHaveLength(20)
    expect(html).toContain('Diensten en vraagstukken')
    expect(html).toContain('Deskundigen en specialisten')
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
    const dynamicServices = services.filter((item) => item.href !== '/diensten/rie')

    expect(dynamicServices.every((item) => generatedSlugs.has(item.href!.split('/').at(-1)!))).toBe(true)
    expect(getServiceBySlug('bedrijfsarts')).toBeTruthy()

    const html = renderToStaticMarkup(
      await ServicePage({ params: Promise.resolve({ slug: 'bedrijfsarts' }) }),
    )
    expect(html).toContain('Ondersteuning door een bedrijfsarts')
    expect(html).toContain('Home')
    expect(html).toContain('Diensten')
  })

  it('dekt alle twintig onveranderde canonieke keuzes met een unieke publieke bestemming', () => {
    expect(canonicalExpertiseServices.map((item) => item.id)).toEqual(requestedExpertiseOptions.map((item) => item.value))
    expect(new Set(canonicalExpertiseServices.map((item) => item.href)).size).toBe(20)
    expect(new Set(canonicalExpertiseServices.map((item) => item.slug)).size).toBe(20)
    for (const mapping of canonicalExpertiseServices) {
      const content = services.find((item) => item.href === mapping.href)
      expect(content, mapping.id).toBeTruthy()
      expect(content!.sourceIds.length, mapping.id).toBeGreaterThan(0)
      expect(content!.metadata.title, mapping.id).toContain(content!.title)
      expect(content!.metadata.description, mapping.id).toBe(content!.summary)
      expect(content!.faq.length, mapping.id).toBeGreaterThanOrEqual(2)
    }
    expect(existingCanonicalServiceSlugs).toEqual(new Set(['hogere-veiligheidskundige', 'arbeidshygienist', 'bedrijfsarts', 'incidentonderzoek', 'preventiemedewerker', 'bhv']))
    expect(getServiceBySlug('rie')).toBeTruthy()
    expect(getServiceBySlug('pmo')).toBeTruthy()
    expect(services).toHaveLength(22)
  })

  it('gebruikt voor alle nieuwe deskundigenpagina’s de actuele detailopmaak met één Advieswijzer-CTA', async () => {
    const addedExpertises = canonicalExpertiseServices.filter(
      (expertise) => !existingCanonicalServiceSlugs.has(expertise.href.split('/').at(-1)!),
    )

    expect(addedExpertises).toHaveLength(14)

    for (const expertise of addedExpertises) {
      const html = renderToStaticMarkup(
        await ServicePage({ params: Promise.resolve({ slug: expertise.href.split('/').at(-1)! }) }),
      )
      const adviceLinks = html.match(/href="\/advieswijzer"/g) ?? []
      const service = services.find((item) => item.href === expertise.href)
      const faqQuestions = service!.faq.map((item) => item.question)

      expect(adviceLinks, expertise.id).toHaveLength(1)
      expect(html, expertise.id).toContain('Algemene vakinformatie')
      expect(html, expertise.id).toContain('Bronnen en onderbouwing')
      expect(new Set(faqQuestions).size, expertise.id).toBe(faqQuestions.length)
    }
  })

  it('houdt dienstgerichte routes apart van canonieke deskundigheden', () => {
    expect(serviceOverview.map((item) => item.href)).toEqual(['/diensten/rie', '/diensten/pmo'])
    expect(expertiseOverview).toHaveLength(20)
    expect(expertiseOverview.some((item) => item.href === '/diensten/pmo')).toBe(false)
  })
})
