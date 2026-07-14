import type { AssignmentDetailView } from '@/lib/assignments/assignment-query-service'
import { assignmentStatusLabels, formatAssignmentDate, formatOptionalAssignmentDate } from '@/lib/assignments/assignment-presentation'
import { AssignmentStatusBadge } from './assignment-status-badge'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import type { AssignmentActionState } from '@/app/opdrachten/actions'
import { AssignmentStatusActions } from './assignment-status-actions'
import { AssignmentWithdrawForm } from './assignment-publication-actions'

type Action = (state: AssignmentActionState, formData: FormData) => Promise<AssignmentActionState>

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-sm font-semibold text-text-secondary">{label}</dt><dd className="mt-1 font-medium text-text-primary">{value}</dd></div>
}

export function AssignmentDetail({ assignment, actions }: { assignment: AssignmentDetailView; actions: { ready: Action; reopen: Action; cancel: Action; withdraw: Action } }) {
  const wasPublished = Boolean(assignment.publishedAt && assignment.publishedVersion)

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AssignmentStatusBadge status={assignment.status} />
          <time className="text-sm text-text-secondary" dateTime={assignment.createdAt}>Aangemaakt op {formatAssignmentDate(assignment.createdAt)}</time>
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <Detail label="Organisatie" value={assignment.organizationName} />
          <Detail label="Gewenste startdatum" value={formatOptionalAssignmentDate(assignment.desiredStartDate)} />
          <Detail label="Locatie" value={assignment.location ?? (assignment.allowsRemoteWork ? 'Op afstand mogelijk' : 'Nog niet bepaald')} />
          <Detail label="Betrokken medewerkers" value={assignment.employeeCount?.toLocaleString('nl-NL') ?? 'Nog niet bepaald'} />
          <Detail label="Sector" value={assignment.sectorName ?? 'Nog niet bepaald'} />
          <Detail
            label="Versie"
            value={
              assignment.publishedVersion
                ? `Publicatieversie ${assignment.publishedVersion}`
                : `Opdrachtversie ${assignment.version}`
            }
          />
          <Detail label="Laatst gewijzigd" value={formatAssignmentDate(assignment.updatedAt)} />
        </dl>
      </Card>

      {wasPublished && (
        <Card variant="subtle">
          <h2 className="text-xl font-bold text-brand-dark">Publicatie</h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <Detail
              label="Gepubliceerd op"
              value={formatAssignmentDate(assignment.publishedAt!)}
            />
            <Detail
              label="Gepubliceerd door"
              value={assignment.publishedByName ?? 'Bevoegde organisatiegebruiker'}
            />
            <Detail
              label="Vastgelegde versie"
              value={`Versie ${assignment.publishedVersion}`}
            />
            <Detail
              label="Marktverwerking"
              value={
                assignment.status === 'OPEN'
                  ? 'Gereed voor marktverwerking'
                  : 'Publicatie ingetrokken'
              }
            />
          </dl>
        </Card>
      )}

      {assignment.originalHelpRequest && (
        <Card>
          <h2 className="text-xl font-bold text-brand-dark">Oorspronkelijke hulpvraag</h2>
          <p className="mt-4 whitespace-pre-wrap text-text-primary">{assignment.originalHelpRequest}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold text-brand-dark">Omschrijving van de opdracht</h2>
        <p className="mt-4 whitespace-pre-wrap text-text-primary">{assignment.description}</p>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-brand-dark">Voortgang</h2>
        <ol className="mt-5 space-y-4">
          {assignment.statusHistory.map((item, index) => (
            <li key={`${item.status}-${item.createdAt}`} className="flex gap-4">
              <span aria-hidden="true" className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-primary-subtle text-xs font-bold text-brand-primary-hover">{index + 1}</span>
              <div>
                <p className="font-semibold text-brand-dark">{assignmentStatusLabels[item.status]}</p>
                <time className="text-sm text-text-secondary" dateTime={item.createdAt}>{formatAssignmentDate(item.createdAt)}</time>
                {item.reason && <p className="mt-1 text-sm text-text-secondary">Reden: {item.reason}</p>}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm text-text-secondary">
          De opdracht heeft {assignment.revisionCount === 1 ? 'één vastgelegde inhoudsversie' : `${assignment.revisionCount} vastgelegde inhoudsversies`}.
        </p>
      </Card>

      {assignment.canManage && <AssignmentStatusActions assignmentId={assignment.id} status={assignment.status} version={assignment.version} actions={actions} />}

      {assignment.canManage && assignment.status === 'OPEN' && (
        <section className="rounded-card border border-border bg-surface p-6" aria-labelledby="withdraw-publication-title">
          <details>
            <summary id="withdraw-publication-title" className="min-h-11 cursor-pointer text-xl font-bold text-brand-dark">
              Publicatie intrekken
            </summary>
            <p className="mt-3 text-sm text-text-secondary">
              Intrekken is definitief. De opdracht blijft ongewijzigd en kan binnen deze versie niet opnieuw worden gepubliceerd.
            </p>
            <AssignmentWithdrawForm
              action={actions.withdraw}
              assignmentId={assignment.id}
              version={assignment.version}
            />
          </details>
        </section>
      )}

      <Card variant="subtle">
        <h2 className="text-lg font-bold text-brand-dark">Wat gebeurt hierna?</h2>
        {assignment.status === 'OPEN' ? (
          <p className="mt-2 text-text-secondary">
            De opdracht is gereed voor toekomstige marktverwerking. Zij is nog niet zichtbaar voor aanbieders; matching, credits en betalingen zijn niet gestart.
          </p>
        ) : assignment.status === 'CANCELLED' && wasPublished ? (
          <p className="mt-2 text-text-secondary">
            De publicatie is ingetrokken. De vastgelegde inhoud en historie blijven behouden; opnieuw publiceren is binnen deze versie niet mogelijk.
          </p>
        ) : assignment.status === 'READY_FOR_REVIEW' ? (
          <p className="mt-2 text-text-secondary">
            De opdracht staat intern gereed. Een eigenaar of beheerder kan de publicatie afzonderlijk controleren en bevestigen.
          </p>
        ) : (
          <p className="mt-2 text-text-secondary">
            Deze opdracht is nog niet gepubliceerd. Publicatie, matching en het benaderen van specialisten zijn niet gestart.
          </p>
        )}
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        {assignment.intakeId && <LinkButton href={`/hulpvragen/${assignment.intakeId}/controle`}>Bekijk oorspronkelijke hulpvraag</LinkButton>}
        <LinkButton href="/opdrachten" variant="outline">Terug naar opdrachten</LinkButton>
      </div>
    </div>
  )
}
