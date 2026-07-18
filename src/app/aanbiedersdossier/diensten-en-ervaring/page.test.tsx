import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProviderServicesExperienceOverview } from './page'

describe('overzicht Diensten en ervaring', () => {
  const html = renderToStaticMarkup(<ProviderServicesExperienceOverview />)

  it('biedt duidelijke toegang tot beide onderdelen', () => {
    expect(html).toContain('Diensten en specialismen')
    expect(html).toContain('href="/aanbiedersdossier/diensten"')
    expect(html).toContain('Sectorervaring')
    expect(html).toContain('href="/aanbiedersdossier/sectorervaring"')
  })

  it('gebruikt semantische links die met het toetsenbord bedienbaar zijn', () => {
    expect(html.match(/<a /g)).toHaveLength(2)
    expect(html).not.toContain('tabindex="-1"')
  })

  it('laat kaarten automatisch naar een enkele mobiele kolom terugvallen', () => {
    expect(html).toContain('grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))]')
    expect(html).toContain('w-full sm:w-fit')
  })
})
