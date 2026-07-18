import Link from 'next/link'
import { ProviderFailureNotice } from '@/components/providers/provider-failure-notice'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import {
  getProviderDossierDashboard,
  getProviderDossierProfessionalsSection,
} from '@/lib/providers/provider-dossier-query-service'

export default async function ProviderProfessionalsPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/professionals')
  const [data, dashboard] = await Promise.all([
    getProviderDossierProfessionalsSection(context.user.id, context.providerProfileId),
    getProviderDossierDashboard(context.user.id, context.providerProfileId),
  ])
  if (data.section !== 'PROFESSIONALS') return null

  const sectionEditable = dashboard.completeness.editableSections.includes('PROFESSIONALS')
  const canAddProfessional = context.canManage && sectionEditable

  return (
    <>
      <ProviderPageHeader
        title="Professionals"
        groupLabel="Professionals en kwalificaties"
        description="Beheer alleen de professionals en gegevens die noodzakelijk zijn voor platformbesluiten. Privécontactgegevens worden niet gebruikt voor selectie."
        readOnly={!context.canManage}
      />
      {canAddProfessional && (
        <LinkButton href="/aanbiedersdossier/professionals/nieuw" className="mb-6">
          Professional toevoegen
        </LinkButton>
      )}
      {context.canManage && !sectionEditable && (
        <div className="mb-6">
          <ProviderFailureNotice title="Professional toevoegen is tijdelijk niet beschikbaar">
            Dit dossieronderdeel is tijdens de huidige beoordeling alleen-lezen. Rond de beoordeling af of laat
            Professionals expliciet heropenen voordat U een professional toevoegt.
          </ProviderFailureNotice>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.value.map((item) => {
          const identity = item.identityRevisions[0]
          return (
            <Card key={item.id}>
              <h2 className="font-bold">
                {identity && 'displayName' in identity ? identity.displayName : 'Professional'}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">{identity?.functionalRole}</p>
              <p className="mt-2 text-sm">{item.qualifications.length} kwalificatie(s)</p>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link href={`/aanbiedersdossier/professionals/${item.id}`} className="font-semibold text-brand-primary-hover underline">Bekijken</Link>
                {context.canManage && <Link href={`/aanbiedersdossier/professionals/${item.id}/kwalificaties`} className="font-semibold text-brand-primary-hover underline">Kwalificaties beheren</Link>}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
