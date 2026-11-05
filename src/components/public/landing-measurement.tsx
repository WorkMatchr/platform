'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { measure } from '@/lib/marketing/measurement'

export function LandingMeasurement() {
  const path = usePathname()
  const previous = useRef<string | null>(null)
  useEffect(() => {
    if (previous.current === path) return
    previous.current = path
    // Full URLs, query strings, fragments and referrers are never read or forwarded.
    if (path) measure('landing_view', path)
  }, [path])
  return null
}
