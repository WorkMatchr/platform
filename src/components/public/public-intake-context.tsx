'use client'

import { useState } from 'react'
import type { IntakeDecisionStep } from '@/lib/public-intake/intake-decision-engine'

type ProgressState = 'done' | 'current' | 'upcoming'

const progressItems = [
  { key: 'situation', label: 'Situatie beschreven' },
  { key: 'clarification', label: 'Vraag verduidelijken' },
  { key: 'organization', label: 'Organisatiecontext' },
  { key: 'finish', label: 'Eerste gegevens afronden' },
] as const

function progressState(
  key: (typeof progressItems)[number]['key'],
  step: IntakeDecisionStep,
): ProgressState {
  if (step === 'LIMITED_ROUTE') return key === 'situation' ? 'done' : 'upcoming'
  if (step === 'SITUATION') {
    return key === 'situation'
      ? 'done'
      : key === 'clarification'
        ? 'current'
        : 'upcoming'
  }
  if (step === 'ORGANIZATION') {
    return key === 'finish'
      ? 'upcoming'
      : key === 'organization'
        ? 'current'
        : 'done'
  }
  if (step === 'PLANNING') return key === 'finish' ? 'current' : 'done'
  return 'done'
}

const stateLabels: Record<ProgressState, string> = {
  done: 'Afgerond',
  current: 'Nu bezig',
  upcoming: 'Volgt later',
}

export type AdviceStepContext = {
  title: string
  lines: readonly string[]
  callout?: string
  buttonLabel: string
}

export function getAdviceStepContext(step: IntakeDecisionStep): AdviceStepContext {
  if (step === 'PLANNING') {
    return {
      title: 'Controleer uw opdracht',
      lines: [
        'Bekijk of uw vraag en voorkeuren goed zijn weergegeven.',
        'U kunt onderdelen nog wijzigen voordat u de opdracht publiceert.',
      ],
      buttonLabel: 'Waarom dit controleren?',
    }
  }

  if (step === 'ORGANIZATION') {
    return {
      title: 'Beschrijf uw situatie',
      lines: [
        'Vertel kort wat er speelt en wat u wilt bereiken. U hoeft geen vaktermen te gebruiken.',
        'Een duidelijke beschrijving helpt professionals om te beoordelen of de opdracht bij hen past.',
      ],
      buttonLabel: 'Waarom dit vragen?',
    }
  }

  return {
    title: 'Welke keuze past u?',
    lines: [
      'Kies “Ja” als u al weet welke deskundigheid u zoekt. U kiest de deskundigheid vervolgens zelf.',
      'Kies “Nee” als u nog niet weet welke deskundigheid bij uw vraag past. U kiest dan eerst het onderwerp waar uw vraag over gaat.',
    ],
    callout: 'Weet u het echt niet? Geen probleem. Ook dan kunt u uw opdracht gewoon verder invullen.',
    buttonLabel: 'Waarom vragen wij dit?',
  }
}

function ContextContent({ step, context }: { step: IntakeDecisionStep; context?: AdviceStepContext }) {
  const content = context ?? getAdviceStepContext(step)

  return (
    <div className="space-y-4 text-sm text-text-secondary">
      <section>
        <h2 className="font-semibold text-brand-dark">{content.title}</h2>
        {content.lines.map((line) => (
          <p key={line} className="mt-1.5">
            {line}
          </p>
        ))}
        {content.callout && (
          <p className="mt-4 rounded-control border border-warning/30 bg-warning-subtle p-3 text-sm">
            {content.callout}
          </p>
        )}
      </section>
      <section className="border-t border-border pt-4">
        <h2 className="font-semibold text-brand-dark">Uw privacy</h2>
        <p className="mt-1.5">
          Vermeld geen namen, medische gegevens of andere gevoelige persoonsgegevens.
        </p>
      </section>
      {!context && <section className="border-t border-border pt-4" aria-labelledby="intake-progress-title">
        <h2 id="intake-progress-title" className="font-semibold text-brand-dark">
          Uw voortgang
        </h2>
        <ol className="mt-2 space-y-2.5">
          {progressItems.map((item) => {
            const state = progressState(item.key, step)
            return (
              <li key={item.key} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                    state === 'done'
                      ? 'bg-success'
                      : state === 'current'
                        ? 'bg-brand-primary'
                        : 'border border-border bg-surface'
                  }`}
                />
                <span>
                  <span className="block font-medium text-brand-dark">{item.label}</span>
                  <span className="block text-xs">{stateLabels[state]}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </section>}
    </div>
  )
}

export function PublicIntakeDesktopContext({
  step,
  className = '',
  context,
}: {
  step: IntakeDecisionStep
  className?: string
  context?: AdviceStepContext
}) {
  return (
    <aside
      className={`hidden rounded-card border border-border bg-surface-subtle p-5 md:sticky md:top-4 md:block ${className}`}
    >
      <ContextContent step={step} context={context} />
    </aside>
  )
}

export function PublicIntakeMobileContext({
  step,
  mobileOpen,
  onToggle,
  contextId = 'mobile-intake-context',
  context,
}: {
  step: IntakeDecisionStep
  mobileOpen?: boolean
  onToggle?: () => void
  contextId?: string
  context?: AdviceStepContext
}) {
  const [open, setOpen] = useState(false)
  const expanded = mobileOpen ?? open
  const content = context ?? getAdviceStepContext(step)

  return (
    <section className="md:hidden">
      <button
        type="button"
        className="inline-flex w-full items-center justify-between rounded-control border border-border bg-surface-subtle px-3 py-2.5 text-sm font-semibold text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/30"
        aria-expanded={expanded}
        aria-controls={contextId}
        aria-label={content.buttonLabel}
        onClick={onToggle ?? (() => setOpen(value => !value))}
      >
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true">ℹ︎</span>
          <span>{content.buttonLabel}</span>
        </span>
        <span aria-hidden="true" className="text-xs" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ›
        </span>
      </button>
      <section
        id={contextId}
        className="mt-3"
        hidden={!expanded}
        aria-live="polite"
      >
        <div className="rounded-card border border-border bg-surface-subtle p-4">
          <ContextContent step={step} context={context} />
        </div>
      </section>
    </section>
  )
}
