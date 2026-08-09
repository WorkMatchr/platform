import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { publicHomepageContent } from '@/content/public-homepage'
import { ProcessSteps } from './process-steps'
import { PublicContentCard } from './public-content-card'
import { PublicCallToAction } from './public-call-to-action'
import { SituationCard } from './situation-card'

describe('compacte publieke presentatie', () => {
  it('houdt informatiekaarten compact en veilig bij lange tekst', () => {
    const html = renderToStaticMarkup(<PublicContentCard title="Een lange titel die op kleine schermen veilig moet kunnen afbreken" description="Beknopte toelichting." href="/kenniscentrum" />)
    expect(html).toContain('!p-5')
    expect(html).toContain('sm:!p-6')
    expect(html).toContain('break-words')
    expect(html).toContain('min-w-0')
    expect(html).toContain('min-h-11')
  })

  it('maakt beide CTA’s leesbaar en stapelt ze op smalle schermen', () => {
    const html = renderToStaticMarkup(<PublicCallToAction title="Vervolg" description="Kies een passende vervolgstap." primaryAction={{ href: '/advieswijzer', label: 'Stel uw vraag' }} secondaryAction={{ href: '/kenniscentrum', label: 'Bekijk kennis' }} />)
    expect(html).toContain('text-text-on-dark')
    expect(html).toContain('border-text-on-dark')
    expect(html.match(/w-full/g)?.length).toBeGreaterThanOrEqual(2)
    expect(html).toContain('sm:w-auto')
  })

  it('houdt situatiekaarten compact met een volledig bruikbaar klikdoel', () => {
    const html = renderToStaticMarkup(
      <SituationCard situation={publicHomepageContent.situations[0]} />,
    )
    expect(html).toContain('data-card-density="compact"')
    expect(html).toContain('!p-4')
    expect(html).toContain('sm:!p-5')
    expect(html).toContain('min-h-11')
    expect(html).toContain('after:absolute after:inset-0')
  })

  it('geeft lange proceslabels voldoende binnenruimte en veilige regelafbreking', () => {
    const html = renderToStaticMarkup(
      <ProcessSteps steps={publicHomepageContent.steps} />,
    )
    expect(html).toContain('sm:grid-cols-2')
    expect(html).toContain('xl:grid-cols-4')
    expect(html).toContain('!p-6')
    expect(html).toContain('sm:!p-7')
    expect(html.match(/break-words/g)).toHaveLength(4)
  })
})
