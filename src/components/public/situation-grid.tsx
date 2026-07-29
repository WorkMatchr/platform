import type { SituationContent } from '@/content/public-homepage'
import { SituationCard } from './situation-card'

export function SituationGrid({ situations }: { situations: readonly SituationContent[] }) {
  return (
    <div className="grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {situations.map((situation) => <SituationCard key={situation.key} situation={situation} />)}
    </div>
  )
}
