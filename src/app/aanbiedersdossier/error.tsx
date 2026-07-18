'use client'

import { Button } from '@/components/ui/button'

export default function ProviderDossierError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="rounded-card border border-error/30 bg-error/10 p-6" aria-labelledby="provider-error-title"><h1 id="provider-error-title" className="text-xl font-bold text-brand-dark">Het dienstverlenersprofiel kon niet worden geladen</h1><p className="mt-3 text-text-secondary">Probeer het opnieuw. Er worden geen technische details of profielgegevens getoond.</p><Button className="mt-5" onClick={reset}>Opnieuw proberen</Button></section>
}
