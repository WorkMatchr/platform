'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  createPublicIntakeDraftAction,
  type PublicIntakeActionResult,
} from '@/app/advieswijzer/actions'
import { recognizableSituations } from '@/lib/public-intake/public-intake-prototype'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import type { RecognizableRequestKey } from '@/lib/public-intake/public-intake-validation'

type PublicIntakeStartProps = {
  sessionNotice?: string
  onCreated: (draft: PublicIntakeDraftView) => void
}

function resultMessage(result: PublicIntakeActionResult): string | null {
  return result.ok ? null : result.message
}

export function PublicIntakeStart({ sessionNotice, onCreated }: PublicIntakeStartProps) {
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingSituation, setPendingSituation] = useState<RecognizableRequestKey | null>(
    null,
  )
  const [isPending, startTransition] = useTransition()

  function finish(result: PublicIntakeActionResult) {
    const message = resultMessage(result)
    if (message) {
      setError(message)
      return
    }
    if (result.ok) onCreated(result.draft)
  }

  function submitDescription() {
    if (isPending) return
    setError(null)
    setPendingSituation(null)
    startTransition(() => {
      void createPublicIntakeDraftAction({
        entryPoint: 'FREE_TEXT',
        originalInput: description,
      }).then(finish)
    })
  }

  function chooseSituation(selectedRequestKey: RecognizableRequestKey) {
    if (isPending) return
    setError(null)
    setPendingSituation(selectedRequestKey)
    startTransition(() => {
      void createPublicIntakeDraftAction({
        entryPoint: 'RECOGNIZABLE_REQUEST',
        selectedRequestKey,
      }).then(finish)
    })
  }

  return (
    <div className="mx-auto max-w-4xl">
      {sessionNotice && (
        <p
          role="status"
          className="mb-5 rounded-control border border-border bg-surface-subtle p-4 text-sm text-text-secondary"
        >
          {sessionNotice}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitDescription()
        }}
        noValidate
      >
        <p id="public-intake-privacy" className="text-sm font-semibold text-brand-dark">
          Vermeld nog geen namen, medische gegevens of andere gevoelige persoonsgegevens.
        </p>
        <label htmlFor="public-intake-description" className="sr-only">
          Beschrijf kort uw situatie
        </label>
        <textarea
          id="public-intake-description"
          value={description}
          onChange={(event) => {
            setDescription(event.target.value)
            setError(null)
          }}
          placeholder="Beschrijf kort uw situatie..."
          minLength={20}
          maxLength={2000}
          rows={5}
          aria-describedby={`public-intake-privacy${error ? ' public-intake-error' : ''}`}
          aria-invalid={Boolean(error)}
          className="mt-3 w-full resize-y rounded-control border border-border bg-surface px-4 py-3 text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
        />
        <div className="mt-4 flex items-center gap-4">
          <Button
            type="submit"
            disabled={isPending}
            loading={isPending && pendingSituation === null}
          >
            Help mij verder
          </Button>
          <span className="text-sm text-text-secondary">
            {description.length.toLocaleString('nl-NL')} / 2.000 tekens
          </span>
        </div>
      </form>

      <div className="my-7 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-sm text-text-secondary">of</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <fieldset disabled={isPending}>
        <legend className="font-semibold text-brand-dark">Of kies een herkenbare situatie</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {recognizableSituations.map((situation) => (
            <button
              key={situation.key}
              type="button"
              onClick={() => chooseSituation(situation.key)}
              aria-pressed={pendingSituation === situation.key}
              className="min-h-11 rounded-control border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-brand-dark transition-colors hover:border-brand-primary hover:bg-brand-primary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              {situation.label}
              {isPending && pendingSituation === situation.key && (
                <span className="ml-2 text-text-secondary">Opslaan…</span>
              )}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p id="public-intake-error" role="alert" className="mt-4 text-sm font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}
