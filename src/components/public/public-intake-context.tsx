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
    return key === 'situation' ? 'done' : key === 'clarification' ? 'current' : 'upcoming'
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

function ContextContent({ step }: { step: IntakeDecisionStep }) {
  return (
    <div className="space-y-4 text-sm text-text-secondary">
      <section>
        <h2 className="font-semibold text-brand-dark">Waarom vragen wij dit?</h2>
        <p className="mt-1.5">
          We stellen alleen vragen die helpen om uw situatie begrijpelijk te maken. U hoeft
          vooraf geen dienst of deskundige te kiezen.
        </p>
      </section>
      <section className="border-t border-border pt-4">
        <h2 className="font-semibold text-brand-dark">Goed om te weten</h2>
        <p className="mt-1.5">
          Uw keuze wordt na bevestiging automatisch opgeslagen. U kunt deze conceptsessie
          later op dit apparaat hervatten.
        </p>
      </section>
      <section className="border-t border-border pt-4">
        <h2 className="font-semibold text-brand-dark">Uw privacy</h2>
        <p className="mt-1.5">
          Vermeld geen namen, medische gegevens of andere gevoelige persoonsgegevens.
        </p>
      </section>
      <section className="border-t border-border pt-4" aria-labelledby="intake-progress-title">
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
      </section>
    </div>
  )
}

export function PublicIntakeDesktopContext({
  step,
}: {
  step: IntakeDecisionStep
}) {
  return (
    <aside className="hidden rounded-card border border-border bg-surface-subtle p-5 lg:sticky lg:top-4 lg:block">
      <ContextContent step={step} />
    </aside>
  )
}

export function PublicIntakeMobileContext({
  step,
}: {
  step: IntakeDecisionStep
}) {
  return (
    <details className="rounded-control border border-border bg-surface-subtle p-4 lg:hidden">
      <summary className="cursor-pointer font-semibold text-brand-dark">
        Waarom vragen wij dit?
      </summary>
      <div className="mt-4">
        <ContextContent step={step} />
      </div>
    </details>
  )
}
