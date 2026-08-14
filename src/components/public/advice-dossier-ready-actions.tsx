'use client'

import { useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  prepareAdviceDossierIntakeAction,
  type StartAdviceDossierIntakeActionResult,
} from '@/app/adviesdossiers/actions'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'

const HANDOFF_ERRORS = {
  ACCESS_DENIED: 'U heeft geen toegang om vanuit dit Adviesdossier een opdracht te starten.',
  NOT_ELIGIBLE: 'Vanuit dit Adviesdossier kan momenteel geen opdracht worden gestart.',
  TEMPORARY_ERROR: 'De opdracht kan tijdelijk niet worden voorbereid. Probeer het later opnieuw.',
} as const

const HANDOFF_FALLBACK_ERROR =
  'De opdracht kon niet worden voorbereid. Uw Adviesdossier is bewaard. Probeer het opnieuw.'

export async function prepareAdviceDossierAssignment(input: {
  dossierId: string
  action?: (dossierId: string) => Promise<StartAdviceDossierIntakeActionResult>
  navigate: (href: string) => void
}): Promise<string | null> {
  const result = await (input.action ?? prepareAdviceDossierIntakeAction)(input.dossierId)
  if (result.ok) {
    input.navigate(result.href)
    return null
  }
  return HANDOFF_ERRORS[result.code]
}

export function AdviceDossierAssignmentSubmitButton({
  isPending,
}: Readonly<{ isPending: boolean }>) {
  return (
    <Button
      className="mt-auto w-full sm:w-auto"
      disabled={isPending}
      loading={isPending}
      loadingLabel="Opdracht voorbereiden…"
      type="submit"
    >
      Maak hiervan een opdracht
    </Button>
  )
}

export function AdviceDossierReadyActions({
  dossierId,
}: Readonly<{ dossierId: string }>) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const submitStarted = useRef(false)

  function prepareAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitStarted.current || isPending) return

    submitStarted.current = true
    setError(null)
    startTransition(async () => {
      try {
        const message = await prepareAdviceDossierAssignment({
          dossierId,
          navigate: (href) => router.push(href),
        })
        submitStarted.current = false
        setError(message)
      } catch {
        submitStarted.current = false
        setError(HANDOFF_FALLBACK_ERROR)
      }
    })
  }

  return (
    <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
      <section className="flex min-w-0 flex-col rounded-card border border-success-border bg-surface p-4 sm:p-5">
        <h3 className="text-lg font-bold text-brand-dark">Bekijk uw Adviesdossier</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Bekijk later het volledige advies en uw antwoorden opnieuw.
        </p>
        <LinkButton
          className="mt-auto w-full pt-4 sm:w-auto"
          href={`/adviesdossiers/${dossierId}`}
        >
          Bekijk uw Adviesdossier
        </LinkButton>
      </section>

      <section className="flex min-w-0 flex-col rounded-card border border-success-border bg-surface p-4 sm:p-5">
        <h3 className="text-lg font-bold text-brand-dark">Professionele ondersteuning nodig?</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          Maak van dit advies een opdracht. De informatie uit uw Adviesdossier nemen we alvast mee,
          zodat u niet opnieuw hoeft te beginnen.
        </p>
        <form
          aria-busy={isPending || undefined}
          className="mt-auto pt-4"
          onSubmit={prepareAssignment}
        >
          <AdviceDossierAssignmentSubmitButton isPending={isPending} />
        </form>
        {error ? (
          <div
            className="mt-3 rounded-control border border-error-border bg-error-subtle px-4 py-3 text-sm font-semibold text-brand-dark"
            role="alert"
          >
            {error}
          </div>
        ) : null}
      </section>
    </div>
  )
}
