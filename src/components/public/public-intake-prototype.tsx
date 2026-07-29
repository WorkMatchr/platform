'use client'

import { useEffect, useState } from 'react'
import { clearPublicIntakeSessionAction } from '@/app/advieswijzer/actions'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import { PublicIntakeStart } from './public-intake-start'
import { PublicIntakeWorkspace } from './public-intake-workspace'

export function PublicIntakePrototype({
  initialDraft,
  invalidSession = false,
}: {
  initialDraft: PublicIntakeDraftView | null
  invalidSession?: boolean
}) {
  const [draft, setDraft] = useState(initialDraft)
  const [sessionNotice, setSessionNotice] = useState<string | undefined>()

  useEffect(() => {
    if (invalidSession) void clearPublicIntakeSessionAction()
  }, [invalidSession])

  if (!draft) {
    return (
      <PublicIntakeStart
        sessionNotice={
          sessionNotice ??
          (invalidSession
            ? 'Uw eerdere conceptsessie kon niet meer worden hervat. U kunt hieronder opnieuw beginnen.'
            : undefined)
        }
        onCreated={setDraft}
      />
    )
  }

  return (
    <PublicIntakeWorkspace
      initialDraft={draft}
      onRestart={() => {
        setDraft(null)
        setSessionNotice('U kunt hieronder een nieuwe hulpvraag starten.')
      }}
    />
  )
}
