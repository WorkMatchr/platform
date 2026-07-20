import {
  resolveProviderFindingAction, resubmitProviderDossierAction, submitProviderDossierAction, withdrawProviderDossierAction,
} from '../actions'
import { ProviderCompleteness } from '@/components/providers/provider-completeness'
import { ProviderOpenActions } from '@/components/providers/provider-open-actions'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderFindingResponseForm, ProviderResubmitForm, ProviderSubmitForm, ProviderWithdrawForm } from '@/components/providers/provider-onboarding-forms'
import { ProviderStatusSummary } from '@/components/providers/provider-status-summary'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderDossierControlView } from '@/lib/providers/provider-dossier-query-service'
import { providerDossierSectionLabels, providerReviewLabels } from '@/lib/providers/provider-dossier-presentation'

export default async function ProviderControlPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/controleren')
  const control = await getProviderDossierControlView(context.user.id, context.providerProfileId)
  const canManage = context.canManage
  const canResubmit = control.latestSubmission?.status === 'ADDITIONAL_INFORMATION_REQUIRED' && control.safeFindings.every((finding) => finding.resolved) && control.completeness.isSubmittable
  return <><ProviderPageHeader title="Controleren en indienen" description="Controleer volledigheid, los open acties op en dien vervolgens een immutable momentopname in voor beoordeling." readOnly={!canManage} /><ProviderStatusSummary statuses={control.statuses} /><ProviderCompleteness assessment={control.completeness} /><ProviderOpenActions actions={control.openActions} canManage={canManage} />
    {control.latestSubmission && <Card className="mt-6"><h2 className="font-bold">Laatste indiening</h2><p className="mt-2 text-sm text-text-secondary">Status: {providerReviewLabels[control.latestSubmission.status]} | dossierversie {control.latestSubmission.candidateVersion ?? 'onbekend'} | ingediend op {new Date(control.latestSubmission.submittedAt).toLocaleString('nl-NL')}</p></Card>}
    {canManage && control.isSubmittable && <Card className="mt-6"><h2 className="mb-2 text-lg font-bold">Dossier indienen</h2><p className="mb-5 text-sm text-text-secondary">Na indienen beoordeelt WorkMatchr uitsluitend de vastgelegde candidate. Goedkeuring maakt u niet automatisch gekwalificeerd of selecteerbaar.</p><ProviderSubmitForm action={submitProviderDossierAction} profileVersion={control.profileVersion} /></Card>}
    {canManage && control.activeSubmission && control.activeSubmission.status !== 'ADDITIONAL_INFORMATION_REQUIRED' && <Card className="mt-6"><h2 className="mb-4 text-lg font-bold">Indiening intrekken</h2><ProviderWithdrawForm action={withdrawProviderDossierAction} submissionId={control.activeSubmission.id} version={control.activeSubmission.version} /></Card>}
    {control.latestSubmission?.status === 'ADDITIONAL_INFORMATION_REQUIRED' && <section className="mt-6 space-y-4" aria-labelledby="findings-title"><h2 id="findings-title" className="text-xl font-bold">Gevraagde aanvullingen</h2>{control.safeFindings.map((finding) => <Card key={finding.id}><p className="text-sm font-semibold">Onderdeel: {providerDossierSectionLabels[finding.section]}</p><p className="mt-2">{finding.message}</p>{canManage && !finding.resolved && <div className="mt-4"><ProviderFindingResponseForm action={resolveProviderFindingAction} findingId={finding.id} version={finding.latestResolutionVersion} /></div>}{finding.resolved && <p className="mt-3 text-sm font-semibold text-success">Antwoord vastgelegd</p>}</Card>)}{canManage && canResubmit && control.latestSubmission && <Card><h2 className="mb-4 font-bold">Opnieuw indienen</h2><ProviderResubmitForm action={resubmitProviderDossierAction} submissionId={control.latestSubmission.id} version={control.latestSubmission.version} /></Card>}</section>}
  </>
}
