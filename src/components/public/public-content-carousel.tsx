'use client'

import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type TouchEvent } from 'react'
import type { InternalHref } from '@/content/public-homepage'
import { Button } from '@/components/ui/button'
import { PublicContentCard } from './public-content-card'
import {
  getNextPublicContentIndex,
  getPreviousPublicContentIndex,
  PUBLIC_CONTENT_CAROUSEL_AUTOPLAY_INTERVAL_MS,
  PUBLIC_CONTENT_CAROUSEL_INTERACTION_PAUSE_MS,
  shouldAutoplayPublicContentCarousel,
} from './public-content-carousel-state'

export type PublicContentCarouselItem = {
  title: string
  description: string
  href: InternalHref
}

type PublicContentCarouselProps = {
  ariaLabel: string
  itemLabel: string
  items: readonly PublicContentCarouselItem[]
  nextButtonLabel: string
  previousButtonLabel: string
}

type TouchPosition = {
  x: number
  y: number
}

const SWIPE_THRESHOLD_PX = 48

export function PublicContentCarousel({
  ariaLabel,
  itemLabel,
  items,
  nextButtonLabel,
  previousButtonLabel,
}: PublicContentCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFocusWithin, setIsFocusWithin] = useState(false)
  const [isInteractionPaused, setIsInteractionPaused] = useState(false)
  const [isPointerInside, setIsPointerInside] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const interactionPauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStart = useRef<TouchPosition | null>(null)

  const pauseAfterInteraction = useCallback(() => {
    setIsInteractionPaused(true)
    if (interactionPauseTimer.current) clearTimeout(interactionPauseTimer.current)
    interactionPauseTimer.current = setTimeout(() => {
      setIsInteractionPaused(false)
      interactionPauseTimer.current = null
    }, PUBLIC_CONTENT_CAROUSEL_INTERACTION_PAUSE_MS)
  }, [])

  const showNext = useCallback(() => {
    setCurrentIndex((index) => getNextPublicContentIndex(index, items.length))
  }, [items.length])

  const showPrevious = useCallback(() => {
    setCurrentIndex((index) => getPreviousPublicContentIndex(index, items.length))
  }, [items.length])

  const handleManualNext = useCallback(() => {
    pauseAfterInteraction()
    showNext()
  }, [pauseAfterInteraction, showNext])

  const handleManualPrevious = useCallback(() => {
    pauseAfterInteraction()
    showPrevious()
  }, [pauseAfterInteraction, showPrevious])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)
    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  useEffect(() => {
    if (
      items.length <= 1 ||
      !shouldAutoplayPublicContentCarousel({
        isFocusWithin,
        isInteractionPaused,
        isPointerInside,
        prefersReducedMotion,
      })
    ) {
      return
    }

    const interval = setInterval(showNext, PUBLIC_CONTENT_CAROUSEL_AUTOPLAY_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isFocusWithin, isInteractionPaused, isPointerInside, items.length, prefersReducedMotion, showNext])

  useEffect(() => {
    return () => {
      if (interactionPauseTimer.current) clearTimeout(interactionPauseTimer.current)
    }
  }, [])

  if (items.length === 0) return null

  const displayIndex = currentIndex % items.length

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsFocusWithin(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      handleManualPrevious()
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      handleManualNext()
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0]
    if (!touch) return
    touchStart.current = { x: touch.clientX, y: touch.clientY }
    pauseAfterInteraction()
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current
    const touch = event.changedTouches[0]
    touchStart.current = null
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) return
    if (deltaX < 0) showNext()
    else showPrevious()
  }

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      className="touch-pan-y"
      data-autoplay-interval={PUBLIC_CONTENT_CAROUSEL_AUTOPLAY_INTERVAL_MS}
      onBlurCapture={handleBlur}
      onFocusCapture={() => setIsFocusWithin(true)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPointerInside(true)}
      onMouseLeave={() => setIsPointerInside(false)}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
    >
      <div
        role="group"
        aria-label={`${itemLabel} ${displayIndex + 1} van ${items.length}`}
        aria-roledescription="dia"
        aria-live="off"
        className="grid"
      >
        {items.map((item, index) => (
          <div
            key={item.href}
            aria-hidden={index !== displayIndex}
            className={`col-start-1 row-start-1 ${index === displayIndex ? 'visible' : 'invisible pointer-events-none'}`}
          >
            <PublicContentCard {...item} headingLevel="h3" compact />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="size-11 shrink-0 !px-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            aria-label={previousButtonLabel}
            onClick={handleManualPrevious}
          >
            <span aria-hidden="true">←</span>
          </Button>
          <span
            aria-label={`Positie ${displayIndex + 1} van ${items.length}`}
            className="text-sm font-semibold tabular-nums text-text-secondary"
          >
            {displayIndex + 1} / {items.length}
          </span>
          <Button
            variant="ghost"
            className="size-11 shrink-0 !px-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            aria-label={nextButtonLabel}
            onClick={handleManualNext}
          >
            <span aria-hidden="true">→</span>
          </Button>
        </div>
      )}
    </div>
  )
}
