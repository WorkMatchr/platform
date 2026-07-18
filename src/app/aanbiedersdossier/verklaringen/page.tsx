import { acceptProviderTermAction } from '../actions'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderTermAcceptanceForm } from '@/components/providers/provider-onboarding-forms'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderDossierDashboard, getProviderDossierTermsSection } from '@/lib/providers/provider-dossier-query-service'

export default async function ProviderDeclarationsPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/verklaringen')
  const [data, dashboard] = await Promise.all([getProviderDossierTermsSection(context.user.id, context.providerProfileId), getProviderDossierDashboard(context.user.id, context.providerProfileId)])
  if (data.section !== 'DECLARATIONS') return null
  const editable = context.canManage && dashboard.completeness.editableSections.includes('DECLARATIONS')
  return <><ProviderPageHeader title="Verklaringen" description="Alleen een OWNER of ADMIN kan namens de organisatie een actuele versie accepteren." readOnly={!editable} /><div className="space-y-5">{data.value.map((term) => <Card key={term.id}><h2 className="font-bold">{term.label}</h2><p className="mt-1 text-sm text-text-secondary">Versie {term.version} · ingangsdatum {term.effectiveFrom?.toLocaleDateString('nl-NL') ?? 'niet opgegeven'}</p>{term.contentReference && <a href={term.contentReference} className="mt-3 inline-block font-semibold text-brand underline" target="_blank" rel="noreferrer">Verklaring lezen</a>}<p className="mt-3 text-sm font-semibold">{term.accepted ? 'Geaccepteerd' : 'Nog niet geaccepteerd'}</p>{'acceptedAt' in term && term.acceptedAt && <p className="text-sm text-text-secondary">Door {term.acceptedBy ?? 'een bevoegde gebruiker'} op {term.acceptedAt.toLocaleDateString('nl-NL')}</p>}{editable && !term.accepted && <div className="mt-5"><ProviderTermAcceptanceForm action={acceptProviderTermAction} profileVersion={dashboard.profileVersion} documentVersionId={term.id} /></div>}</Card>)}</div></>
}
