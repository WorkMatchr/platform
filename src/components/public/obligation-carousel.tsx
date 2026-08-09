import { PublicContentCarousel, type PublicContentCarouselItem } from './public-content-carousel'

export type ObligationCarouselItem = PublicContentCarouselItem

type ObligationCarouselProps = {
  items: readonly ObligationCarouselItem[]
}

export function ObligationCarousel({ items }: ObligationCarouselProps) {
  return (
    <PublicContentCarousel
      ariaLabel="Wettelijke verplichtingen"
      itemLabel="Verplichting"
      items={items}
      nextButtonLabel="Volgende verplichting"
      previousButtonLabel="Vorige verplichting"
    />
  )
}
