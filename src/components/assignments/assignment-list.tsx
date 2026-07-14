import Link from 'next/link'
import type { AssignmentListItem } from '@/lib/assignments/assignment-query-service'
import { formatAssignmentDate } from '@/lib/assignments/assignment-presentation'
import { AssignmentStatusBadge } from './assignment-status-badge'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'

export function AssignmentList({ items }: { items: AssignmentListItem[] }) {
  if (items.length === 0) {
    return (
      <Card variant="subtle" className="text-center">
        <h2 className="text-xl font-bold text-brand-dark">Uw organisatie heeft nog geen opdrachten.</h2>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">
          Start een hulpvraag en dien deze na de controle in om een conceptopdracht te vormen.
        </p>
        <LinkButton href="/hulpvragen/nieuw" className="mt-6">Start een nieuwe hulpvraag</LinkButton>
      </Card>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {items.map((assignment) => (
        <Card key={assignment.id} className="flex h-full min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AssignmentStatusBadge status={assignment.status} />
            <time className="text-sm text-text-secondary" dateTime={assignment.createdAt}>
              {formatAssignmentDate(assignment.createdAt)}
            </time>
          </div>
          <h2 className="mt-5 break-words text-lg font-bold text-brand-dark">{assignment.title}</h2>
          <p className="mt-2 text-sm text-text-secondary">{assignment.organizationName}</p>
          <p className="mt-2 text-sm text-text-secondary">Gebaseerd op Uw hulpvraag</p>
          <Link href={`/opdrachten/${assignment.id}`} className="mt-6 inline-flex min-h-11 items-center font-semibold text-brand-primary-hover underline underline-offset-4">
            Bekijk de opdracht
          </Link>
        </Card>
      ))}
    </div>
  )
}
