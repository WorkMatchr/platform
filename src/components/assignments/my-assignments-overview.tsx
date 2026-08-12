import { AssignmentList } from '@/components/assignments/assignment-list'
import { IntakeList } from '@/components/intakes/intake-list'
import { Card } from '@/components/ui/card'
import type { MyAssignmentsOverview } from '@/lib/assignments/my-assignments-overview-query-service'

type Props = {
  overview: MyAssignmentsOverview
}

function AssignmentSection({
  title,
  items,
}: {
  title: string
  items: MyAssignmentsOverview['assignments']
}) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby={`assignment-stage-${title}`}>
      <h3 id={`assignment-stage-${title}`} className="text-lg font-bold text-brand-dark">{title}</h3>
      <div className="mt-4"><AssignmentList items={items} /></div>
    </section>
  )
}

export function MyAssignmentsOverview({ overview }: Props) {
  const unfinishedIntakes = overview.intakes.filter((intake) => ['DRAFT', 'IN_PROGRESS'].includes(intake.status))
  const readyIntakes = overview.intakes.filter((intake) => intake.status === 'READY_FOR_REVIEW')
  const processingIntakes = overview.intakes.filter((intake) => intake.status === 'SUBMITTED')
  const activeAssignments = overview.assignments.filter((assignment) => ['OPEN', 'MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION'].includes(assignment.status))
  const completedAssignments = overview.assignments.filter((assignment) => ['AWARDED', 'CLOSED'].includes(assignment.status))
  const cancelledAssignments = overview.assignments.filter((assignment) => assignment.status === 'CANCELLED')
  const hasItems = overview.intakes.length > 0 || overview.assignments.length > 0

  if (!hasItems) {
    return (
      <Card variant="subtle">
        <h2 className="text-xl font-bold text-brand-dark">U heeft nog geen opdrachten.</h2>
        <p className="mt-2 text-text-secondary">Beschrijf hiernaast kort waar u ondersteuning bij nodig heeft. WorkMatchr helpt u daarna stap voor stap verder.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {unfinishedIntakes.length > 0 && (
        <section aria-labelledby="intakes-unfinished-title">
          <h3 id="intakes-unfinished-title" className="text-lg font-bold text-brand-dark">Nog invullen</h3>
          <div className="mt-4"><IntakeList items={unfinishedIntakes} /></div>
        </section>
      )}
      {readyIntakes.length > 0 && (
        <section aria-labelledby="intakes-ready-title">
          <h3 id="intakes-ready-title" className="text-lg font-bold text-brand-dark">Klaar om te publiceren</h3>
          <div className="mt-4"><IntakeList items={readyIntakes} /></div>
        </section>
      )}
      {processingIntakes.length > 0 && (
        <section aria-labelledby="intakes-processing-title">
          <h3 id="intakes-processing-title" className="text-lg font-bold text-brand-dark">Publicatie wordt verwerkt</h3>
          <div className="mt-4"><IntakeList items={processingIntakes} /></div>
        </section>
      )}
      <AssignmentSection title="Open voor offertes" items={activeAssignments} />
      <AssignmentSection title="Afgerond" items={completedAssignments} />
      <AssignmentSection title="Beëindigd" items={cancelledAssignments} />
    </div>
  )
}
