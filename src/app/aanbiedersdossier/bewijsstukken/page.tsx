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
  return <><ProviderPageHeader title="Bewijsstukken" description="Bekijk uitsluitend veilige metadata. Bestandsinhoud en opslaglocaties worden hier nooit openbaar gemaakt." readOnly={!context.canManage} /><ProviderFailureNotice title="Upload is productie-fail-closed">Bewijsupload blijft geblokkeerd totdat private objectopslag, malwarescan, toegangscontrole en bewaarbeleid volledig zijn geconfigureerd. Publieke logo-opslag wordt nooit gebruikt.</ProviderFailureNotice><div className="mt-6 space-y-4">{data.value.length === 0 && <Card><p>Nog geen bewijsstukken beschikbaar.</p></Card>}{data.value.map((item) => <Card key={item.id}><h2 className="font-bold">Bewijsstuk</h2><p className="mt-1 text-sm text-text-secondary">Status: {providerEvidenceStatusLabels[item.status]} | revisie {item.version}</p>{'revisions' in item && <p className="mt-2 text-sm">{item.revisions[0]?.originalFileName ?? 'Geen veilige revisie'} | scanstatus {item.revisions[0] ? providerEvidenceScanStatusLabels[item.revisions[0].scanStatus] : 'Onbekend'}</p>}</Card>)}</div></>
}
