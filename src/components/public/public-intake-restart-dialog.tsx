'use client'

import { useRef, useState, useTransition } from 'react'
import { abandonPublicIntakeDraftAction } from '@/app/advieswijzer/actions'
import {
  Button,
  buttonBaseStyles,
  buttonVariantStyles,
} from '@/components/ui/button'

export function PublicIntakeRestartDialog({
  onAbandoned,
}: {
  onAbandoned: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function closeDialog() {
    if (isPending) return
    dialogRef.current?.close()
  }

  function confirmAbandonment() {
    if (isPending) return
    setError(null)
    startTransition(() => {
      void abandonPublicIntakeDraftAction().then((result) => {
        if (!result.ok) {
          setError(result.message)
          return
        }
        dialogRef.current?.close()
        onAbandoned()
      })
    })
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${buttonBaseStyles} ${buttonVariantStyles.ghost} px-3`}
        onClick={() => {
          setError(null)
          dialogRef.current?.showModal()
        }}
      >
        <span aria-hidden="true">↺</span>
        Nieuwe hulpvraag starten
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="public-intake-restart-title"
        aria-describedby="public-intake-restart-description"
        onClose={() => triggerRef.current?.focus()}
        className="w-[min(92vw,32rem)] rounded-card border border-border bg-surface p-0 text-text-primary shadow-card backdrop:bg-brand-dark/55"
      >
        <div className="p-6 sm:p-8">
          <h2 id="public-intake-restart-title" className="text-xl font-bold text-brand-dark">
            Nieuwe hulpvraag starten?
          </h2>
          <p id="public-intake-restart-description" className="mt-3 text-text-secondary">
            Uw huidige concept wordt afgesloten. Daarna kunt u direct opnieuw beginnen.
          </p>
          {error && (
            <p role="alert" className="mt-4 rounded-control bg-error/10 p-3 text-sm font-semibold text-error">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={isPending}>
              Annuleren
            </Button>
            <Button type="button" variant="secondary" onClick={confirmAbandonment} loading={isPending}>
              <span aria-hidden="true">↺</span>
              Nieuwe hulpvraag starten
            </Button>
          </div>
        </div>
      </dialog>
    </>
  )
}
