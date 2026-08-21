import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ArboGuideNotice, ArboGuideOverviewCard, ArboGuidePageLayout, ArboGuideResultGrid } from './arbo-guide-layout'

describe('gedeelde Arbo-wijzerlayout', () => {
  it('bouwt overzicht en detail met dezelfde productfamilie en behouden routes', () => {
    const overview = renderToStaticMarkup(
      <ArboGuidePageLayout title="Kies een Arbo-wijzer" description="Kies wat bij uw vraag past.">
        <ArboGuideOverviewCard title="Advieswijzer" description="Verduidelijk uw vraag." href="/advieswijzer" actionLabel="Start de Advieswijzer" />
      </ArboGuidePageLayout>,
    )
    const detail = renderToStaticMarkup(
      <ArboGuidePageLayout currentLabel="Compliance-wijzer" title="Controleer uw situatie" description="Beantwoord de vragen.">
        <ArboGuideNotice>Indicatieve uitkomst.</ArboGuideNotice>
      </ArboGuidePageLayout>,
    )

    expect(overview).toContain('Arbo-wijzers')
    expect(overview).toContain('href="/advieswijzer"')
    expect(detail).toContain('href="/wijzers"')
    expect(detail).toContain('Compliance-wijzer')
    expect(detail).toContain('Indicatieve uitkomst')
    expect(detail).toContain('py-12 sm:py-16')
  })

  it('toont uitsluitend de resultaatkaarten vanaf brede schermen in twee kolommen', () => {
    const html = renderToStaticMarkup(
      <ArboGuideResultGrid>
        <article>Een kort resultaat</article>
        <article>Een resultaat met meer toelichting en een langere aanbevolen vervolgstap.</article>
      </ArboGuideResultGrid>,
    )

    expect(html).toContain('class="grid gap-5 lg:grid-cols-2"')
    expect(html).not.toContain('line-clamp')
    expect(html).toContain('Een kort resultaat')
    expect(html).toContain('Een resultaat met meer toelichting')
  })
})
