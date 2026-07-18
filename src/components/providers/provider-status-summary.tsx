import { Card } from '@/components/ui/card'

type Statuses = {
  dossierCompleteness: string
  platformQualification: string
  professionalQualification: string
  reviewStatus: string
  selectability: string
}

export function ProviderStatusSummary({ statuses }: { statuses: Statuses }) {
  const items = [
    ['Dossiercompleetheid', statuses.dossierCompleteness],
    ['Platformkwalificatie', statuses.platformQualification],
    ['Beroepskwalificatie', statuses.professionalQualification],
    ['Beoordelingsstatus', statuses.reviewStatus],
    ['Selecteerbaarheid', statuses.selectability],
  ]
  return (
    <section aria-labelledby="status-heading">
      <h2 id="status-heading" className="text-xl font-bold text-brand-dark">Uw dossierstatus</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {items.map(([label, value]) => <Card key={label} className="p-5"><h3 className="text-sm font-semibold text-text-secondary">{label}</h3><p className="mt-2 font-bold text-brand-dark">{value}</p></Card>)}
      </div>
    </section>
  )
}
