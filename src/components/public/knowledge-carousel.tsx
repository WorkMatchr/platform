import { PublicContentCarousel, type PublicContentCarouselItem } from './public-content-carousel'

export type KnowledgeCarouselItem = PublicContentCarouselItem

type KnowledgeCarouselProps = {
  items: readonly KnowledgeCarouselItem[]
}

export function KnowledgeCarousel({ items }: KnowledgeCarouselProps) {
  return (
    <PublicContentCarousel
      ariaLabel="Kenniscentrumartikelen"
      itemLabel="Kennisitem"
      items={items}
      nextButtonLabel="Volgend kennisitem"
      previousButtonLabel="Vorig kennisitem"
    />
  )
}
