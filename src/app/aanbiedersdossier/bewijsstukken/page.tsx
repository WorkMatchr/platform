import { ProviderFailureNotice } from '@/components/providers/provider-failure-notice'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderDossierEvidenceSection } from '@/lib/providers/provider-dossier-query-service'
import { providerEvidenceScanStatusLabels, providerEvidenceStatusLabels } from '@/lib/providers/provider-dossier-presentation'

export default async function ProviderEvidencePage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/bewijsstukken')
  const data = await getProviderDossierEvidenceSection(context.user.id, context.providerProfileId)
  if (data.section !== 'EVIDENCE') return null
  return <><ProviderPageHeader title="Bewijsstukken" description="Bekijk de vastgelegde bestandsgegevens. Bestandsinhoud en opslaglocaties worden hier nooit openbaar gemaakt." readOnly={!context.canManage} /><ProviderFailureNotice title="Bewijsstukken uploaden is nog niet beschikbaar">Bestanden kunnen pas veilig worden ontvangen wanneer afgeschermde opslag, controle op schadelijke bestanden, toegangscontrole en bewaarbeleid volledig zijn ingericht.</ProviderFailureNotice><div className="mt-6 space-y-4">{data.value.length === 0 && <Card><p>Nog geen bewijsstukken beschikbaar.</p></Card>}{data.value.map((item) => <Card key={item.id}><h2 className="font-bold">Bewijsstuk</h2><p className="mt-1 text-sm text-text-secondary">Status: {providerEvidenceStatusLabels[item.status]} | revisie {item.version}</p>{'revisions' in item && <p className="mt-2 text-sm">{item.revisions[0]?.originalFileName ?? 'Geen veilige revisie'} | bestandscontrole {item.revisions[0] ? providerEvidenceScanStatusLabels[item.revisions[0].scanStatus] : 'Onbekend'}</p>}</Card>)}</div></>
}
