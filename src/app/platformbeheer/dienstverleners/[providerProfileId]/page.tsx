import { notFound } from 'next/navigation'
import { LinkButton } from '@/components/ui/link-button'
import { PlatformAdminEmailForm, PlatformAdminNoteForm } from '@/components/platform-admin/platform-admin-actions'
import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { PlatformAdminAuditRow } from '@/components/platform-admin/platform-admin-audit-row'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformAdminObjectActivity, getPlatformProviderDetail } from '@/lib/platform-admin/platform-admin-query-service'
import {
  providerDeliveryModeLabels,
  providerLifecycleLabels,
  providerQualificationLabels,
  providerReadinessLabels,
  providerReviewCaseLabels,
  providerReviewLabels,
  providerSelectabilityLabels,
  providerVerificationLabels,
} from '@/lib/providers/provider-dossier-presentation'

export default async function PlatformProviderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ providerProfileId: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { providerProfileId } = await params
  const query = await searchParams
  const returnTo = `/platformbeheer/dienstverleners/${providerProfileId}`
  const administrator = await requirePlatformAdministrator(`/platformbeheer/dienstverleners/${providerProfileId}`)
  const [provider, adminActivity] = await Promise.all([
    getPlatformProviderDetail(administrator.id, providerProfileId),
    getPlatformAdminObjectActivity(administrator.id, 'ProviderProfile', providerProfileId),
  ])
  if (!provider) notFound()
  return (
    <>
      <AdminPageHeader title={provider.organization.name} description="Dossier, kwalificaties, beoordelingen en selecteerbaarheid bekijken." action={<div className="flex flex-wrap items-center gap-2"><LinkButton href={`/platformbeheer/dienstverleners/${provider.id}/credits`} variant="outline">Credits bekijken</LinkButton><StatusPill tone={provider.selectabilityStatus === 'SELECTABLE' ? 'good' : provider.selectabilityStatus === 'BLOCKED' ? 'bad' : 'warning'}>{providerSelectabilityLabels[provider.selectabilityStatus]}</StatusPill></div>} />
      {query.resultaat ? <p className="rounded-control border border-success-border bg-success-subtle px-4 py-3 text-sm">De beheeractie is uitgevoerd en vastgelegd.</p> : null}
      {query.fout ? <p className="rounded-control border border-danger-border bg-danger-subtle px-4 py-3 text-sm">De beheeractie is niet uitgevoerd. Er zijn geen wijzigingen doorgevoerd. Controleer de gegevens en uw bevoegdheid en probeer het opnieuw.</p> : null}
      <AdminSection title="Communicatie en vastlegging">
        <div className="grid gap-3 xl:grid-cols-2">
          <PlatformAdminEmailForm targetType="PROVIDER" targetId={provider.id} returnTo={returnTo} label="Dienstverlener mailen" />
          <PlatformAdminNoteForm targetType="PROVIDER" targetId={provider.id} returnTo={returnTo} category="Dienstverleners" />
        </div>
      </AdminSection>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Dossier', providerLifecycleLabels[provider.lifecycleStatus]], ['Kwalificatie', providerQualificationLabels[provider.platformQualificationStatus]], ['Volledigheid', providerReadinessLabels[provider.readinessStatus]], ['Profielversie', provider.version]].map(([label, value]) => <div className="rounded-card border border-border bg-surface p-4" key={label}><p className="text-xs text-text-secondary">{label}</p><p className="mt-1 font-semibold text-brand-dark">{value}</p></div>)}</div>
      <AdminSection title="Diensten en specialismen"><AdminTable headers={['Dienst', 'Specialisme', 'Leveringsvormen', 'Verificatie']}>{provider.capabilities.map((capability) => { const revision = capability.revisions[0]; return <tr key={capability.id}><td className="px-4 py-3">{revision?.serviceTerm?.label ?? 'Niet vastgelegd'}</td><td className="px-4 py-3">{revision?.specialismTerm?.label ?? '—'}</td><td className="px-4 py-3">{revision?.deliveryModes.map((mode) => providerDeliveryModeLabels[mode]).join(', ') || '—'}</td><td className="px-4 py-3">{revision ? providerVerificationLabels[revision.verificationLevel] : '—'}</td></tr> })}</AdminTable></AdminSection>
      <AdminSection title="Professionals en kwalificaties"><AdminTable headers={['Professional', 'Functie', 'Kwalificaties']}>{provider.professionals.map((professional) => { const identity = professional.identityRevisions[0]; return <tr key={professional.id}><td className="px-4 py-3">{identity?.displayName ?? 'Niet vastgelegd'}</td><td className="px-4 py-3">{identity?.functionalRole ?? '—'}</td><td className="px-4 py-3">{professional.qualifications.flatMap((qualification) => qualification.revisions[0]?.qualificationTerm.label ?? []).join(', ') || 'Geen'}</td></tr> })}</AdminTable></AdminSection>
      <AdminSection title="Indieningen en beoordelingen"><AdminTable headers={['Type', 'Status', 'Versie', 'Moment', 'Bevindingen']}>{provider.dossierSubmissions.map((submission) => <tr key={submission.id}><td className="px-4 py-3">Indiening</td><td className="px-4 py-3">{providerReviewLabels[submission.status]}</td><td className="px-4 py-3">{submission.version}</td><td className="px-4 py-3">{submission.submittedAt.toLocaleString('nl-NL')}</td><td className="px-4 py-3">—</td></tr>)}{provider.dossierReviewCases.map((review) => <tr key={review.id}><td className="px-4 py-3">Beoordeling</td><td className="px-4 py-3">{providerReviewCaseLabels[review.status]}</td><td className="px-4 py-3">{review.version}</td><td className="px-4 py-3">{review.openedAt.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{review._count.findings}</td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Gevalideerde selectiegegevens"><AdminTable headers={['Bronversie', 'Geldig vanaf', 'Geldig tot', 'Status', 'Auditgegevens']}>{provider.trustedProjections.map((projection) => <tr key={projection.id}><td className="px-4 py-3">{projection.sourceVersion}</td><td className="px-4 py-3">{projection.validFrom.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{projection.validUntil.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{projection.invalidation ? 'Ingetrokken' : 'Geldig'}</td><td className="px-4 py-3"><details><summary className="cursor-pointer font-semibold">Technische gegevens</summary><p className="mt-2 font-mono text-xs">Controlewaarde: {projection.sha256}</p>{projection.invalidation ? <p className="mt-1 text-xs">Interne reden: {projection.invalidation.reasonCode}</p> : null}</details></td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Beheeraudit"><AdminTable headers={['Actie', 'Auteur', 'Toelichting', 'Moment']}>{adminActivity.map((event) => <PlatformAdminAuditRow event={event} key={event.id} />)}</AdminTable></AdminSection>
    </>
  )
}
