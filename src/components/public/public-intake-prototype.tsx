'use client'

import { useEffect, useState } from 'react'
import { clearPublicIntakeSessionAction } from '@/app/advieswijzer/actions'
import { Button } from '@/components/ui/button'
import type { KnowledgeContextDefinition } from '@/content/knowledge/knowledge-contexts'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import { PublicIntakeStart } from './public-intake-start'
import { PublicIntakeWorkspace } from './public-intake-workspace'

export function PublicIntakePrototype({
  initialDraft,
  invalidSession = false,
  temporarilyUnavailable = false,
  knowledgeContext = null,
}: {
  initialDraft: PublicIntakeDraftView | null
  invalidSession?: boolean
  temporarilyUnavailable?: boolean
  knowledgeContext?: KnowledgeContextDefinition | null
}) {
  const [draft, setDraft] = useState(initialDraft)
  const [activeKnowledgeContext, setActiveKnowledgeContext] = useState(knowledgeContext)
  const [sessionNotice, setSessionNotice] = useState<string | undefined>()

  useEffect(() => {
    if (invalidSession) void clearPublicIntakeSessionAction()
  }, [invalidSession])

  const hasContextConflict = Boolean(
    draft && activeKnowledgeContext && (
      draft.knowledgeContext?.id !== activeKnowledgeContext.id ||
      draft.knowledgeContext.version !== activeKnowledgeContext.version
    ),
  )

  async function startNewContext() {
    await clearPublicIntakeSessionAction()
    setDraft(null)
    setSessionNotice(`U begint een nieuwe hulpvraag vanuit ${activeKnowledgeContext?.shortLabel ?? 'de gekozen kenniscontext'}.`)
  }

  if (hasContextConflict && draft && activeKnowledgeContext) {
    const previousTopic = draft.knowledgeContext?.shortLabel ?? 'een ander onderwerp'
    return (
      <section className="mx-auto max-w-3xl rounded-card border border-border bg-surface p-5 sm:p-6" aria-labelledby="context-choice-title">
        <h2 id="context-choice-title" className="text-xl font-bold text-brand-dark">Welke hulpvraag wilt u vervolgen?</h2>
        <p className="mt-3 text-text-secondary">U heeft nog eerdere antwoorden over {previousTopic}. U koos nu bewust voor {activeKnowledgeContext.shortLabel}. We overschrijven uw eerdere antwoorden niet.</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={() => void startNewContext()}>
            Verder met {activeKnowledgeContext.shortLabel}
          </Button>
          <Button type="button" variant="outline" onClick={() => setActiveKnowledgeContext(null)}>
            Eerdere antwoorden hervatten
          </Button>
        </div>
      </section>
    )
  }

  if (!draft) {
    return (
      <PublicIntakeStart
        sessionNotice={
          sessionNotice ??
          (temporarilyUnavailable
            ? 'Er zijn tijdelijk te veel aanvragen gedaan. Probeer het later opnieuw.'
            : undefined) ??
          (invalidSession
            ? 'Uw eerdere antwoorden konden niet meer worden hervat. U kunt hieronder opnieuw beginnen.'
            : undefined)
        }
        onCreated={setDraft}
        knowledgeContext={activeKnowledgeContext}
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
