'use client'

import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { Section } from '@/components/layout/section'

export default function IntakeError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Section spacing="compact" containerSize="narrow">
      <Heading as="h1" size="h2">De hulpvragen konden niet worden geladen</Heading>
      <p className="mt-3 text-text-secondary">Probeer het opnieuw. Blijft het probleem bestaan, neem dan contact op met WorkMatchr.</p>
      <Button className="mt-6" onClick={reset}>Opnieuw proberen</Button>
    </Section>
  )
}
