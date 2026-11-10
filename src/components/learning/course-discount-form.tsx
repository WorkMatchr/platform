'use client'

import { useActionState } from 'react'
import { preparePersonalDiscount } from '@/app/platformbeheer/academy/cursussen/personal-discount'
import { fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'

export function CourseDiscountForm({ versionId }: { versionId: string }) {
  const [message, action, busy] = useActionState(preparePersonalDiscount, '')
  return (
    <details>
      <summary>Persoonlijke kortingscode voorbereiden</summary>
      <form action={action} className="grid max-w-xl gap-3 p-4">
        <input name="versionId" type="hidden" value={versionId} />
        <label>
          E-mailadres cursist
          <input name="email" type="email" required className={fieldClassName} />
        </label>
        <label>
          Korting in procenten
          <input name="percentage" type="number" min="1" max="100" required className={fieldClassName} />
        </label>
        <label>
          Vervaldatum (00.00 UTC)
          <input name="until" type="date" required className={fieldClassName} />
        </label>
        <p>Eenmalig voor dit account en deze cursusversie. Inwisselen vereist commerciële vrijgave.</p>
        <Button type="submit" disabled={busy}>Code voorbereiden</Button>
        <p role="status">{message}</p>
      </form>
    </details>
  )
}
