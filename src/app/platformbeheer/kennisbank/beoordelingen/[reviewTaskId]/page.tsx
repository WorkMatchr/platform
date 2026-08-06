import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  KnowledgeApprovalWithdrawalForm,
  KnowledgeReviewEditorialForm,
  KnowledgeSourceWithdrawalButton,
  KnowledgeSupportingSourceForm,
} from '@/components/platform-admin/knowledge-review-forms'
import { AdminPageHeader, AdminSection, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import {
  formatKnowledgeCitationLocation,
  formatKnowledgeInternalExcerpt,
  formatKnowledgePublicationYear,
  knowledgeAdminLabels,
} from '@/lib/knowledge/knowledge-admin-presentation'
import { getKnowledgeReviewTask, getKnowledgeSourceOptions } from '@/lib/knowledge/knowledge-review-query-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const metadata: Metadata = { title: 'Kenniscontrole | WorkMatchr' }

const dateTime = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })

export default async function KnowledgeReviewDetailPage({ params }: { params: Promise<{ reviewTaskId: string }> }) {
  await requirePlatformAdministrator('/platformbeheer/kennisbank/beoordelingen')
  const { reviewTaskId } = await params
  const [task, sourceOptions] = await Promise.all([
    getKnowledgeReviewTask(reviewTaskId),
    getKnowledgeSourceOptions(),
  ])
  if (!task) notFound()
  const terminal = ['CONTENT_APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].includes(task.status)
  const humanActionRequired = task.requiresHumanAction && !terminal
  const sourceActionRequired = humanActionRequired && ['SOURCE_CONFLICT', 'INSUFFICIENT_TRACEABILITY', 'SOURCE_EXPIRED', 'PUBLICATION_BLOCKED', 'HIGH_RISK_PUBLICATION'].includes(task.controlExceptionType ?? '')
  const activeSourceReferences = task.sourceReferences.filter((reference) => reference.action === 'ADDED' && reference.withdrawnByReferences.length === 0)
  return (
    <div>
      <AdminPageHeader
        eyebrow="Kennisbeheer"
        title={humanActionRequired ? 'Uitzondering beoordelen' : 'Historische kenniscontrole'}
        description={humanActionRequired ? 'Beoordeel uitsluitend de concrete uitzondering die menselijke aandacht vereist.' : 'Deze registratie blijft beschikbaar voor historie en audit, maar vormt geen actieve werktaak.'}
        action={<Link className="inline-flex min-h-10 items-center rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-primary-subtle" href="/platformbeheer/kennisbank/beoordelingen">Terug naar kenniscontroles</Link>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Kenniscontrole</p><StatusPill tone={task.status === 'CONTENT_APPROVED' ? 'good' : task.status === 'REJECTED' ? 'bad' : 'warning'}>{knowledgeAdminLabels.reviewTaskStatus(task.status)}</StatusPill></div>
        <div className="rounded-card border border-border bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Broncontrole</p><p className="mt-2 font-semibold text-brand-dark">{knowledgeAdminLabels.sourceControlStatus(task.claim.sourceControlStatus)}</p></div>
        <div className="rounded-card border border-border bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Beschikbaarheid</p><p className="mt-2 font-semibold text-brand-dark">{knowledgeAdminLabels.publicationStatus(task.claim.publicationStatus)}</p></div>
      </div>

      <div className="mb-6 rounded-card border border-warning/40 bg-warning/5 p-4 text-sm leading-6 text-brand-dark" role="note">
        <p className="font-semibold">{humanActionRequired ? 'Waarom uw aandacht nodig is' : 'Geen menselijke actie nodig'}</p>
        <p>{humanActionRequired ? task.controlExceptionReason : 'Dit kennisitem is intern en niet publiceerbaar. De eerdere generieke controletaak is uit de dagelijkse werkvoorraad gehaald.'}</p>
        {humanActionRequired && task.controlExceptionType ? <p className="mt-2"><strong>Risico:</strong> {knowledgeAdminLabels.controlException(task.controlExceptionType)}. <strong>Minimale beslissing:</strong> uitzondering afhandelen, gemotiveerd openhouden, uitstellen of het kennisitem afwijzen.</p> : null}
        <p className="mt-2">Geen enkele afhandeling publiceert dit kennisitem automatisch.</p>
      </div>

      <AdminSection title="Kennisitem">
        <dl className="grid gap-4 rounded-card border border-border bg-surface p-5 md:grid-cols-2">
          <div className="md:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Huidige tekst</dt><dd className="mt-1 leading-7 text-brand-dark">{task.claim.statement}</dd></div>
          {task.proposedStatement ? <div className="md:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Eigen WorkMatchr-formulering</dt><dd className="mt-1 leading-7 text-brand-dark">{task.proposedStatement}</dd></div> : null}
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Soort kennis</dt><dd className="mt-1">{knowledgeAdminLabels.claimType(task.claim.claimType)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Onderwerp</dt><dd className="mt-1">{task.claim.topic.title}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Toepassingsgebied</dt><dd className="mt-1">{task.claim.applicability}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Toegangsniveau</dt><dd className="mt-1">{knowledgeAdminLabels.accessTier(task.claim.accessTier)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Prioriteit</dt><dd className="mt-1">{knowledgeAdminLabels.reviewPriority(task.priority)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Risicoklasse</dt><dd className="mt-1">{knowledgeAdminLabels.controlRisk(task.claim.controlRisk)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Verantwoordelijke</dt><dd className="mt-1">{task.assignedTo?.displayName || task.assignedTo?.email || 'Niet toegewezen'}</dd></div>
        </dl>
      </AdminSection>

      <AdminSection title="Bronherleidbaarheid" description="Alleen een korte interne bronreferentie wordt getoond. De oorspronkelijke PDF, pagina-afbeelding, tabel of scan is niet beschikbaar via deze route.">
        <div className="grid gap-4">
          {task.claim.citations.map((citation) => (
            <article className="rounded-card border border-border bg-surface p-5" key={citation.id}>
              <div className="grid gap-3 md:grid-cols-3">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Bron</p><p className="mt-1 font-semibold text-brand-dark">{citation.sourceVersion.source.code} — {citation.sourceVersion.source.title}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Editie en jaar</p><p className="mt-1">{citation.sourceVersion.source.edition ?? citation.sourceVersion.versionLabel} · {formatKnowledgePublicationYear(citation.sourceVersion.publicationDate || citation.sourceVersion.source.publicationDate)}</p></div>
                <div><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Uitgever</p><p className="mt-1">{citation.sourceVersion.source.publisher ?? 'Onbekend'}</p></div>
              </div>
              <p className="mt-3 text-sm font-semibold text-brand-dark">{citation.fragment ? formatKnowledgeCitationLocation(citation.fragment) : 'Locatie niet vastgelegd'}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{formatKnowledgeInternalExcerpt(citation.fragment?.internalExcerpt ?? null)}</p>
              <p className="mt-2 text-xs text-warning">Historische, auteursrechtelijk beperkte bron. Niet openbaar maken of als actuele waarheid behandelen.</p>
            </article>
          ))}
        </div>
      </AdminSection>

      {humanActionRequired ? (
        <AdminSection title="Minimale beslissing" description="Leg alleen vast wat nodig is om de concrete uitzondering af te handelen. Een volledige herschrijving of nieuwe doelgroepbepaling is niet standaard nodig.">
          <div className="rounded-card border border-border bg-surface p-5">
            <KnowledgeReviewEditorialForm task={task} disabled={false} />
          </div>
        </AdminSection>
      ) : null}

      {sourceActionRequired ? <AdminSection title="Actuele ondersteunende bronnen" description="Alleen voor deze bronuitzondering kunt u gericht een bron koppelen. Geen bron wordt automatisch betrouwbaar of publiceerbaar.">
        <div className="grid gap-4">
          {activeSourceReferences.length ? (
            <ul className="grid gap-3">
              {activeSourceReferences.map((reference) => (
                <li className="rounded-card border border-border bg-surface p-4" key={reference.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-semibold text-brand-dark">{reference.title}</p><p className="mt-1 text-sm text-text-secondary">{reference.publisher ?? 'Uitgever niet vastgelegd'} · {knowledgeAdminLabels.sourceType(reference.sourceType)} · {knowledgeAdminLabels.authorityLevel(reference.authorityLevel)}</p><p className="mt-1 text-sm">{knowledgeAdminLabels.supportType(reference.supportType)}</p></div>
                    {terminal ? null : <KnowledgeSourceWithdrawalButton referenceId={reference.id} reviewTaskId={task.id} version={task.version} />}
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="rounded-card border border-dashed border-border bg-surface p-4 text-sm text-text-secondary">Er zijn nog geen actuele ondersteunende bronnen geregistreerd.</p>}
          <KnowledgeSupportingSourceForm disabled={false} reviewTaskId={task.id} sourceOptions={sourceOptions} version={task.version} />
        </div>
      </AdminSection> : null}

      {task.status === 'CONTENT_APPROVED' ? (
        <AdminSection title="Broncontrole intrekken" description="Intrekken wist de eerdere controle niet. Er wordt een nieuwe registratie toegevoegd en de kenniscontrole wordt heropend.">
          <KnowledgeApprovalWithdrawalForm reviewTaskId={task.id} version={task.version} />
        </AdminSection>
      ) : null}

      <AdminSection title="Controlehistorie">
        {task.decisions.length ? (
          <ol className="grid gap-3">
            {task.decisions.map((decision) => (
              <li className="rounded-card border border-border bg-surface p-4" key={decision.id}>
                <p className="font-semibold text-brand-dark">{knowledgeAdminLabels.reviewTaskStatus(decision.nextStatus)}</p>
                <p className="mt-1 text-sm text-text-secondary">{decision.actorUser.displayName || decision.actorUser.email} · {dateTime.format(decision.createdAt)}</p>
                {decision.reason ? <p className="mt-2 text-sm leading-6">{decision.reason}</p> : null}
              </li>
            ))}
          </ol>
        ) : <p className="rounded-card border border-dashed border-border bg-surface p-4 text-sm text-text-secondary">Er zijn nog geen controlebeslissingen vastgelegd.</p>}
      </AdminSection>
    </div>
  )
}
