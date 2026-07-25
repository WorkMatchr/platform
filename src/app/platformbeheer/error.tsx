'use client'

import { Button } from '@/components/ui/button'

export default function PlatformAdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-card border border-error bg-surface p-6">
      <h1 className="text-xl font-bold text-brand-dark">Platformbeheer kon niet worden geladen</h1>
      <p className="mt-2 text-sm text-text-secondary">Probeer het opnieuw. Blijft het probleem bestaan, raadpleeg dan de technische logging met de foutreferentie.</p>
      <Button className="mt-4" onClick={reset}>Opnieuw proberen</Button>
    </div>
  )
}
