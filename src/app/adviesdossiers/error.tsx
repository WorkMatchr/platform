'use client'

import { Button } from '@/components/ui/button'

export default function AdviceDossiersError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-heading-2 font-bold text-brand-dark">
        Uw adviesdossiers konden niet worden geladen
      </h1>
      <p className="mt-3 text-text-secondary">
        Probeer het opnieuw. Uw opgeslagen adviesversies blijven
        behouden.
      </p>
      <Button className="mt-5" onClick={reset}>
        Opnieuw proberen
      </Button>
    </div>
  )
}
