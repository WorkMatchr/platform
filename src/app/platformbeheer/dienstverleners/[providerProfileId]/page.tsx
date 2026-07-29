import { notFound } from 'next/navigation'
import { PlatformAdminEmailForm, PlatformAdminNoteForm } from '@/components/platform-admin/platform-admin-actions'
import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformAdminObjectActivity, getPlatformProviderDetail } from '@/lib/platform-admin/platform-admin-query-service'

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
      <AdminPageHeader title={provider.organization.name} description="Read-only dossier-, kwalificatie-, review- en Trusted Provider-inzicht." action={<StatusPill tone={provider.selectabilityStatus === 'SELECTABLE' ? 'good' : provider.selectabilityStatus === 'BLOCKED' ? 'bad' : 'warning'}>{provider.selectabilityStatus}</StatusPill>} />
      {query.resultaat ? <p className="rounded-control border border-success-border bg-success-subtle px-4 py-3 text-sm">De beheeractie is uitgevoerd en vastgelegd.</p> : null}
      {query.fout ? <p className="rounded-control border border-danger-border bg-danger-subtle px-4 py-3 text-sm">De beheeractie kon niet veilig worden uitgevoerd.</p> : null}
      <AdminSection title="Communicatie en vastlegging">
        <div className="grid gap-3 xl:grid-cols-2">
          <PlatformAdminEmailForm targetType="PROVIDER" targetId={provider.id} returnTo={returnTo} label="Dienstverlener mailen" />
          <PlatformAdminNoteForm targetType="PROVIDER" targetId={provider.id} returnTo={returnTo} category="Dienstverleners" />
        </div>
      </AdminSection>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Dossier', provider.lifecycleStatus], ['Kwalificatie', provider.platformQualificationStatus], ['Readiness', provider.readinessStatus], ['Profielversie', provider.version]].map(([label, value]) => <div className="rounded-card border border-border bg-surface p-4" key={label}><p className="text-xs text-text-secondary">{label}</p><p className="mt-1 font-semibold text-brand-dark">{value}</p></div>)}</div>
      <AdminSection title="Diensten en specialismen"><AdminTable headers={['Dienst', 'Specialisme', 'Leveringsvormen', 'Verificatie']}>{provider.capabilities.map((capability) => { const revision = capability.revisions[0]; return <tr key={capability.id}><td className="px-4 py-3">{revision?.serviceTerm?.label ?? 'Niet vastgelegd'}</td><td className="px-4 py-3">{revision?.specialismTerm?.label ?? '—'}</td><td className="px-4 py-3">{revision?.deliveryModes.join(', ') || '—'}</td><td className="px-4 py-3">{revision?.verificationLevel ?? '—'}</td></tr> })}</AdminTable></AdminSection>
      <AdminSection title="Professionals en kwalificaties"><AdminTable headers={['Professional', 'Functie', 'Kwalificaties']}>{provider.professionals.map((professional) => { const identity = professional.identityRevisions[0]; return <tr key={professional.id}><td className="px-4 py-3">{identity?.displayName ?? 'Niet vastgelegd'}</td><td className="px-4 py-3">{identity?.functionalRole ?? '—'}</td><td className="px-4 py-3">{professional.qualifications.flatMap((qualification) => qualification.revisions[0]?.qualificationTerm.label ?? []).join(', ') || 'Geen'}</td></tr> })}</AdminTable></AdminSection>
      <AdminSection title="Indieningen en reviews"><AdminTable headers={['Type', 'Status', 'Versie', 'Moment', 'Bevindingen']}>{provider.dossierSubmissions.map((submission) => <tr key={submission.id}><td className="px-4 py-3">Indiening</td><td className="px-4 py-3">{submission.status}</td><td className="px-4 py-3">{submission.version}</td><td className="px-4 py-3">{submission.submittedAt.toLocaleString('nl-NL')}</td><td className="px-4 py-3">—</td></tr>)}{provider.dossierReviewCases.map((review) => <tr key={review.id}><td className="px-4 py-3">Review</td><td className="px-4 py-3">{review.status}</td><td className="px-4 py-3">{review.version}</td><td className="px-4 py-3">{review.openedAt.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{review._count.findings}</td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Trusted Provider-status"><AdminTable headers={['Bronversie', 'Geldig vanaf', 'Geldig tot', 'Status', 'Checksum']}>{provider.trustedProjections.map((projection) => <tr key={projection.id}><td className="px-4 py-3">{projection.sourceVersion}</td><td className="px-4 py-3">{projection.validFrom.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{projection.validUntil.toLocaleString('nl-NL')}</td><td className="px-4 py-3">{projection.invalidation ? `Ingetrokken: ${projection.invalidation.reasonCode}` : 'Geldig'}</td><td className="max-w-48 truncate px-4 py-3 font-mono text-xs">{projection.sha256}</td></tr>)}</AdminTable></AdminSection>
      <AdminSection title="Beheeraudit"><AdminTable headers={['Actie', 'Auteur', 'Toelichting', 'Moment']}>{adminActivity.map((event) => <tr key={event.id}><td className="px-4 py-3 font-semibold">{event.action}</td><td className="px-4 py-3">{event.actorUser.displayName ?? event.actorUser.email}</td><td className="max-w-xl whitespace-pre-wrap px-4 py-3">{event.reason ?? '—'}</td><td className="px-4 py-3">{event.createdAt.toLocaleString('nl-NL')}</td></tr>)}</AdminTable></AdminSection>
    </>
  )
}
