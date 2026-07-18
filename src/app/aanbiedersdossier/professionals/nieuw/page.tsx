import { saveProviderProfessionalAction } from '../../actions'
import { ProviderFailureNotice } from '@/components/providers/provider-failure-notice'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderProfessionalForm } from '@/components/providers/provider-onboarding-forms'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderDossierDashboard } from '@/lib/providers/provider-dossier-query-service'

export default async function NewProviderProfessionalPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/professionals/nieuw')
  const dashboard = await getProviderDossierDashboard(context.user.id, context.providerProfileId)
  const sectionEditable = dashboard.completeness.editableSections.includes('PROFESSIONALS')
  const editable = context.canManage && sectionEditable

  return (
    <>
      <ProviderPageHeader
        title="Professional toevoegen"
        groupLabel="Professionals en kwalificaties"
        description="Leg alleen minimale identiteitsgegevens vast die nodig zijn voor het dossier."
        readOnly={!context.canManage}
      />
      {editable && (
        <Card>
          <ProviderProfessionalForm
            action={saveProviderProfessionalAction}
            profileVersion={dashboard.profileVersion}
          />
        </Card>
      )}
      {context.canManage && !sectionEditable && (
        <ProviderFailureNotice title="Professional toevoegen is tijdelijk niet beschikbaar">
          Dit dossieronderdeel is tijdens de huidige beoordeling alleen-lezen. Rond de beoordeling af of laat
          Professionals expliciet heropenen voordat U een professional toevoegt.
        </ProviderFailureNotice>
      )}
    </>
  )
}
