export const PUBLIC_CONTENT_CAROUSEL_AUTOPLAY_INTERVAL_MS = 8_000
export const PUBLIC_CONTENT_CAROUSEL_INTERACTION_PAUSE_MS = 16_000

export type PublicContentCarouselPauseState = {
  isFocusWithin: boolean
  isInteractionPaused: boolean
  isPointerInside: boolean
  prefersReducedMotion: boolean
}

export function getNextPublicContentIndex(currentIndex: number, itemCount: number): number {
  if (itemCount <= 0) return 0
  return (currentIndex + 1) % itemCount
}

export function getPreviousPublicContentIndex(currentIndex: number, itemCount: number): number {
  if (itemCount <= 0) return 0
  return (currentIndex - 1 + itemCount) % itemCount
}

export function shouldAutoplayPublicContentCarousel({
  isFocusWithin,
  isInteractionPaused,
  isPointerInside,
  prefersReducedMotion,
}: PublicContentCarouselPauseState): boolean {
  return !isFocusWithin && !isInteractionPaused && !isPointerInside && !prefersReducedMotion
}
