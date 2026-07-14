import type { AssignmentDetailView } from '@/lib/assignments/assignment-query-service'
import { assignmentStatusLabels, formatAssignmentDate, formatOptionalAssignmentDate } from '@/lib/assignments/assignment-presentation'
import { AssignmentStatusBadge } from './assignment-status-badge'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import type { AssignmentActionState } from '@/app/opdrachten/actions'
import { AssignmentStatusActions } from './assignment-status-actions'

type Action = (state: AssignmentActionState, formData: FormData) => Promise<AssignmentActionState>

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-sm font-semibold text-text-secondary">{label}</dt><dd className="mt-1 font-medium text-text-primary">{value}</dd></div>
}

export function AssignmentDetail({ assignment, actions }: { assignment: AssignmentDetailView; actions: { ready: Action; reopen: Action; cancel: Action } }) {
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
          <Detail label="Versie" value={`Conceptversie ${assignment.version}`} />
          <Detail label="Laatst gewijzigd" value={formatAssignmentDate(assignment.updatedAt)} />
        </dl>
      </Card>

      {assignment.originalHelpRequest && (
        <Card>
          <h2 className="text-xl font-bold text-brand-dark">Oorspronkelijke hulpvraag</h2>
          <p className="mt-4 whitespace-pre-wrap text-text-primary">{assignment.originalHelpRequest}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-xl font-bold text-brand-dark">Omschrijving van de conceptopdracht</h2>
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
          De opdracht heeft {assignment.revisionCount === 1 ? 'één vastgelegde conceptversie' : `${assignment.revisionCount} vastgelegde conceptversies`}.
        </p>
      </Card>

      {assignment.canManage && <AssignmentStatusActions assignmentId={assignment.id} status={assignment.status} version={assignment.version} actions={actions} />}

      <Card variant="subtle">
        <h2 className="text-lg font-bold text-brand-dark">Wat gebeurt hierna?</h2>
        <p className="mt-2 text-text-secondary">
          Deze opdracht is nog niet gepubliceerd. Publicatie, matching en het benaderen van specialisten volgen in een latere module.
        </p>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        {assignment.intakeId && <LinkButton href={`/hulpvragen/${assignment.intakeId}/controle`}>Bekijk oorspronkelijke hulpvraag</LinkButton>}
        <LinkButton href="/opdrachten" variant="outline">Terug naar opdrachten</LinkButton>
      </div>
    </div>
  )
}
