import type { ProviderCompletenessAssessment } from '@/lib/providers/provider-dossier-completeness'
import { Card } from '@/components/ui/card'

export function ProviderCompleteness({ assessment }: { assessment: ProviderCompletenessAssessment }) {
  return (
    <Card className="mt-6" aria-labelledby="completeness-heading">
      <h2 id="completeness-heading" className="text-xl font-bold text-brand-dark">Dossiercompleetheid</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <p><span className="block text-2xl font-bold">{assessment.completed}</span><span className="text-sm text-text-secondary">Gereed</span></p>
        <p><span className="block text-2xl font-bold">{assessment.actionRequired}</span><span className="text-sm text-text-secondary">Actie nodig</span></p>
        <p><span className="block text-2xl font-bold">{assessment.expired}</span><span className="text-sm text-text-secondary">Verlopen</span></p>
        <p><span className="block text-2xl font-bold">{assessment.notStarted}</span><span className="text-sm text-text-secondary">Niet gestart</span></p>
        <p><span className="block text-2xl font-bold">{assessment.percentage}%</span><span className="text-sm text-text-secondary">Ingevuld</span></p>
      </div>
      <p className="mt-5 border-t border-border pt-4 text-sm text-text-secondary">Dit percentage geeft alleen aan hoeveel verplichte dossieronderdelen zijn ingevuld. Het zegt niets over goedkeuring, kwaliteit of geschiktheid voor opdrachten.</p>
    </Card>
  )
}
