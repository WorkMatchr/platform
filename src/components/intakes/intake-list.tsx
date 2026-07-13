import type { IntakeListItem } from '@/lib/intakes/intake-query-service'
import { IntakeCard } from './intake-card'

export function IntakeList({ items }: { items: IntakeListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-border bg-surface-subtle p-7 text-center sm:p-10">
        <h2 className="text-xl font-bold text-brand-dark">Nog geen hulpvragen</h2>
        <p className="mx-auto mt-3 max-w-xl text-text-secondary">
          Start met een korte omschrijving. Daarna helpt WorkMatchr U de vraag stap voor stap te verduidelijken.
        </p>
      </div>
    )
  }

  return <div className="grid gap-5 md:grid-cols-2">{items.map((item) => <IntakeCard key={item.id} intake={item} />)}</div>
}
