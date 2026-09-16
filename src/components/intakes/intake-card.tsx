import Link from 'next/link'
import type { IntakeListItem } from '@/lib/intakes/intake-query-service'
import { IntakeStatusBadge } from './intake-status-badge'
import { Card } from '@/components/ui/card'

export function IntakeCard({ intake }: { intake: IntakeListItem }) {
  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <IntakeStatusBadge status={intake.hasUnpublishedAssignment ? 'DRAFT' : intake.status} />
        <time className="text-sm text-text-secondary" dateTime={intake.updatedAt}>
          Bijgewerkt {new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium' }).format(new Date(intake.updatedAt))}
        </time>
      </div>
      <h2 className="mt-5 line-clamp-2 text-lg font-bold text-brand-dark">{intake.freeText}</h2>
      {!intake.isOwn && (
        <p className="mt-2 text-sm text-text-secondary">Aangemaakt door {intake.createdByDisplayName ?? 'een organisatielid'}</p>
      )}
      <p className="mt-6 text-sm text-text-secondary">Vul uw opdracht aan en controleer uw gegevens voordat u publiceert.</p>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link href={`/hulpvragen/${intake.id}`} className="inline-flex min-h-11 items-center font-semibold text-brand-primary-hover underline underline-offset-4">
          {intake.status === 'READY_FOR_REVIEW' ? 'Opdracht controleren' : 'Opdracht hervatten'}
        </Link>
        {intake.canDelete && ['DRAFT', 'IN_PROGRESS'].includes(intake.status) && (
          <Link href={`/hulpvragen/${intake.id}/verwijderen`} className="inline-flex min-h-11 items-center font-semibold text-error underline underline-offset-4">
            Opdracht verwijderen
          </Link>
        )}
      </div>
    </Card>
  )
}
