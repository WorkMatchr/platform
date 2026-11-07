import Link from 'next/link'
import type { ProviderDossierSection } from '@/generated/prisma/client'
import { providerSectionDetails } from '@/lib/providers/provider-dossier-open-actions'
import { providerDossierSectionLabels } from '@/lib/providers/provider-dossier-presentation'
import type { ProviderCompletenessAssessment } from '@/lib/providers/provider-dossier-completeness'
import { Card } from '@/components/ui/card'

export function ProviderCompleteness({ assessment }: { assessment: ProviderCompletenessAssessment }) {
  return (
    <Card className="mt-6" aria-labelledby="completeness-heading">
      <h2 id="completeness-heading" className="text-xl font-bold text-brand-dark">{assessment.isSubmittable ? 'Uw profiel is compleet' : 'Uw profiel afronden'}</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <p><span className="block text-2xl font-bold">{assessment.completed}</span><span className="text-sm text-text-secondary">Gereed</span></p>
        <p><span className="block text-2xl font-bold">{assessment.actionRequired}</span><span className="text-sm text-text-secondary">Actie nodig</span></p>
        <p><span className="block text-2xl font-bold">{assessment.expired}</span><span className="text-sm text-text-secondary">Verlopen</span></p>
        <p><span className="block text-2xl font-bold">{assessment.notStarted}</span><span className="text-sm text-text-secondary">Niet gestart</span></p>
        <p><span className="block text-2xl font-bold">{assessment.percentage}%</span><span className="text-sm text-text-secondary">Ingevuld</span></p>
      </div>
      <ul className="mt-5 divide-y divide-border">
        {(Object.keys(providerSectionDetails) as ProviderDossierSection[]).map(section => {
          const reason = assessment.reasons.find(item => item.section === section)
          const unavailable = section === 'CAPACITY'
          const status = unavailable ? 'Niet van toepassing' : reason ? 'Verplicht · nog afronden' : 'Verplicht · afgerond'
          const href = section === 'CAPABILITIES' ? '/aanbiedersdossier/diensten-en-ervaring#diensten'
            : section === 'SECTOR_EXPERIENCE' ? '/aanbiedersdossier/diensten-en-ervaring#sectoren'
            : section === 'ORGANIZATION' ? '/organisatie/profiel' : providerSectionDetails[section].routeHint
          return <li key={section} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
            {reason && !unavailable
              ? <Link href={href} className="font-semibold underline">{providerDossierSectionLabels[section]}</Link>
              : <span>{providerDossierSectionLabels[section]}</span>}
            <span className="text-sm">{status}</span>
            {reason?.code === 'TERMS_NOT_CONFIGURED' && <span className="w-full text-sm">Platformbeheer moet de verplichte verklaringen beschikbaar stellen.</span>}
            {reason?.code === 'EVIDENCE_UNAVAILABLE' && <span className="w-full text-sm">Er ontbreekt gecontroleerd bewijs. Bekijk bij Bewijsstukken welke aanlevermogelijkheden beschikbaar zijn.</span>}
          </li>
        })}
      </ul>
      <p className="mt-5 border-t border-border pt-4 text-sm text-text-secondary">Dit percentage geeft alleen aan hoeveel verplichte dossieronderdelen zijn ingevuld. Het zegt niets over goedkeuring, kwaliteit of geschiktheid voor opdrachten.</p>
    </Card>
  )
}
