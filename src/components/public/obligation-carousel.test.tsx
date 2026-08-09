import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { legalOverview } from '@/content/public-overviews'
import { isRegisteredPublicHref } from '@/content/public-routes'
import { ObligationCarousel } from './obligation-carousel'
import {
  getNextPublicContentIndex as getNextObligationIndex,
  getPreviousPublicContentIndex as getPreviousObligationIndex,
  PUBLIC_CONTENT_CAROUSEL_AUTOPLAY_INTERVAL_MS as OBLIGATION_CAROUSEL_AUTOPLAY_INTERVAL_MS,
  shouldAutoplayPublicContentCarousel as shouldAutoplayObligationCarousel,
} from './public-content-carousel-state'

const items = legalOverview.filter((item) => item.href !== undefined)

describe('wettelijke-verplichtingencarousel', () => {
  it('toont de eerste bestaande verplichting met route en toegankelijke bediening', () => {
    const html = renderToStaticMarkup(<ObligationCarousel items={items} />)

    expect(html).toContain('RI&amp;E als wettelijke verplichting')
    expect(html).toContain('href="/wettelijke-verplichtingen/rie"')
    expect(html).toContain('aria-label="Vorige verplichting"')
    expect(html).toContain('aria-label="Volgende verplichting"')
    expect(html).toContain('aria-label="Positie 1 van 10"')
    expect(html).toContain('aria-live="off"')
  })

  it('behoudt de vaste volgorde van alle bestaande publieke verplichtingen', () => {
    expect(items.map((item) => item.title)).toEqual([
      'RI&E als wettelijke verplichting',
      'Plan van aanpak bij de RI&E',
      'De preventiemedewerker organiseren',
      'Bedrijfshulpverlening organiseren',
      'Basiscontract arbodienstverlening',
      'Toegang tot de bedrijfsarts',
      'PAGO aanbieden',
      'Beleid tegen psychosociale arbeidsbelasting',
      'Arbeidsongevallen melden en registreren',
      'Voorlichting en onderricht',
    ])
    expect(items.every((item) => isRegisteredPublicHref(item.href))).toBe(true)
  })

  it('loopt voorspelbaar vooruit en achteruit door alle posities', () => {
    expect(getNextObligationIndex(0, 10)).toBe(1)
    expect(getNextObligationIndex(9, 10)).toBe(0)
    expect(getPreviousObligationIndex(1, 10)).toBe(0)
    expect(getPreviousObligationIndex(0, 10)).toBe(9)
  })

  it('gebruikt acht seconden autoplay en pauzeert bij aandacht of interactie', () => {
    expect(OBLIGATION_CAROUSEL_AUTOPLAY_INTERVAL_MS).toBe(8_000)
    expect(
      shouldAutoplayObligationCarousel({
        isFocusWithin: false,
        isInteractionPaused: false,
        isPointerInside: false,
        prefersReducedMotion: false,
      }),
    ).toBe(true)

    for (const pausedState of [
      { isFocusWithin: true },
      { isInteractionPaused: true },
      { isPointerInside: true },
      { prefersReducedMotion: true },
    ]) {
      expect(
        shouldAutoplayObligationCarousel({
          isFocusWithin: false,
          isInteractionPaused: false,
          isPointerInside: false,
          prefersReducedMotion: false,
          ...pausedState,
        }),
      ).toBe(false)
    }
  })
})
