import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AdminPageHeader,
  AdminSection,
  AdminTable,
  EmptyState,
  MetricCard,
  StatusPill,
} from '@/components/platform-admin/platform-admin-ui'
import {
  formatKnowledgeCitationLocation,
  formatKnowledgePublicationYear,
  knowledgeAdminLabels,
} from '@/lib/knowledge/knowledge-admin-presentation'
import { getKnowledgeAdminOverview } from '@/lib/knowledge/knowledge-search-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const metadata: Metadata = { title: 'Kennisbeheer | WorkMatchr' }

export default async function KnowledgeAdminPage() {
  await requirePlatformAdministrator('/platformbeheer/kennisbank')
  const data = await getKnowledgeAdminOverview()

  return (
    <div>
      <AdminPageHeader
        eyebrow="Knowledge Engine"
        title="Kennisbeheer"
        description="Bewaak bronnen, actualiteit, conflicten en gerichte uitzonderingen. Een afgeronde broncontrole publiceert niets automatisch."
        action={<div className="flex flex-wrap gap-2"><Link className="inline-flex min-h-10 items-center rounded-control bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-dark" href="/platformbeheer/kennisbank/beoordelingen">Open uitzonderingen</Link><Link className="inline-flex min-h-10 items-center rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-primary-subtle" href="/platformbeheer/kennisbank/meldingen">Open meldingen</Link></div>}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <MetricCard
          label="Uitzonderingen"
          value={data.counts.openReviews}
          detail="Vragen daadwerkelijk menselijke aandacht"
          href="/platformbeheer/kennisbank/beoordelingen"
          attention={data.counts.openReviews > 0}
        />
        <MetricCard
          label="Inhoudelijke meldingen"
          value={data.counts.improvementReports}
          detail="Gemelde verbeteringen van professionals"
          href="/platformbeheer/kennisbank/meldingen"
          attention={data.counts.improvementReports > 0}
        />
        <MetricCard
          label="Bronconflicten"
          value={data.counts.conflicts}
          detail="Vereisen gerichte hercontrole"
          attention={data.counts.conflicts > 0}
        />
        <MetricCard label="Verouderde bronnen" value={data.counts.outdatedSources} detail="Actieve uitzonderingen door actualiteit" attention={data.counts.outdatedSources > 0} />
        <MetricCard label="Geblokkeerd voor publicatie" value={data.counts.blockedForPublication} detail="Publicatie blijft fail-closed" attention={data.counts.blockedForPublication > 0} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MetricCard label="Conceptkennis" value={data.counts.claims} detail="Intern en niet automatisch gepubliceerd" />
        <MetricCard label="Automatisch verwerkt" value={data.counts.automaticallyProcessed} detail="Geen menselijke uitzondering actief" />
        <MetricCard label="Historische interne kennis" value={data.counts.historicalInternal} detail="Alleen als historische input bewaard" />
      </div>

      <AdminSection
        title="Importpreview"
        description="Valideer en bekijk een lokaal pakket via de CLI voordat een expliciet bevestigde import wordt uitgevoerd."
      >
        <div className="rounded-card border border-border bg-surface p-4 text-sm leading-6 text-text-secondary">
          <p>
            <code>npm run knowledge:validate -- &lt;bestand&gt;</code>
          </p>
          <p>
            <code>npm run knowledge:preview -- &lt;bestand&gt;</code>
          </p>
          <p className="mt-2 font-semibold text-warning">
            De vijf PoC-bronnen zijn historisch en auteursrechtelijk beperkt. Import maakt uitsluitend
            interne conceptkennis.
          </p>
        </div>
      </AdminSection>

      <AdminSection title="Bronnen en versies">
        {data.sources.length === 0 ? (
          <EmptyState>
            Er zijn nog geen kennisbronnen geïmporteerd. Valideer en bekijk eerst een lokaal importpakket.
          </EmptyState>
        ) : (
          <AdminTable
            headers={['Code', 'Brongegevens', 'Uitgever', 'Jaar', 'Status', 'Versie en controle']}
          >
            {data.sources.map((source) => (
              <tr key={source.id}>
                <td className="px-4 py-3 font-semibold">{source.code}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-brand-dark">{source.title}</span>
                  <span className="mt-1 block text-xs text-text-secondary">
                    Editie: {source.edition ?? 'Onbekend'}
                  </span>
                </td>
                <td className="px-4 py-3">{source.publisher ?? 'Onbekend'}</td>
                <td className="px-4 py-3">{formatKnowledgePublicationYear(source.publicationDate)}</td>
                <td className="px-4 py-3">
                  <StatusPill tone="warning">
                    {knowledgeAdminLabels.temporalStatus(source.temporalStatus)}
                  </StatusPill>
                </td>
                <td className="px-4 py-3">
                  {source.versions.map((version) => (
                    <div key={version.id}>
                      <span className="font-medium text-brand-dark">{version.versionLabel}</span>
                      <span className="mt-1 block text-xs text-text-secondary">
                        {knowledgeAdminLabels.reviewStatus(version.reviewStatus)} ·{' '}
                        {knowledgeAdminLabels.extractionStatus(version.extractionStatus)} ·{' '}
                        {version.checksum ? 'Checksum vastgelegd' : 'Checksum ontbreekt'}
                      </span>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminSection>

      <AdminSection
        title="Conceptkennis"
        description="Conceptkennis wordt risicogestuurd gecontroleerd op bronherleidbaarheid, actualiteit, conflicten, toepassingsgebied en auteursrecht. Alleen uitzonderingen, hoog risico en steekproeven vragen standaard om menselijke inhoudelijke controle."
      >
        {data.claims.length === 0 ? (
          <EmptyState>
            Er is nog geen conceptkennis. Controleer of een gevalideerd importpakket expliciet is
            geïmporteerd.
          </EmptyState>
        ) : (
          <AdminTable headers={['Bron en locatie', 'Onderwerp', 'Kennisitem', 'Controlestatus']}>
            {data.claims.map((claim) => {
              const citation = claim.citations[0]
              return (
                <tr key={claim.id}>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-brand-dark">
                      {citation?.sourceVersion.source.code ?? 'Bron onbekend'}
                    </span>
                    <span className="mt-1 block text-xs text-text-secondary">
                      {citation?.fragment
                        ? formatKnowledgeCitationLocation(citation.fragment)
                        : 'Locatie niet vastgelegd'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{claim.topic.title}</td>
                  <td className="max-w-xl px-4 py-3">{claim.statement}</td>
                  <td className="px-4 py-3">
                    <span className="block">
                      {knowledgeAdminLabels.temporalStatus(claim.temporalStatus)}
                    </span>
                    <span className="block">
                      {knowledgeAdminLabels.validationStatus(claim.validationStatus)}
                    </span>
                    <span className="block">
                      {knowledgeAdminLabels.publicationStatus(claim.publicationStatus)}
                    </span>
                    <span className="block">{knowledgeAdminLabels.accessTier(claim.accessTier)}</span>
                    <span className="block">Risico: {knowledgeAdminLabels.controlRisk(claim.controlRisk)}</span>
                    <span className="block">{knowledgeAdminLabels.sourceControlStatus(claim.sourceControlStatus)}</span>
                  </td>
                </tr>
              )
            })}
          </AdminTable>
        )}
      </AdminSection>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSection title="Uitzonderingen">
          <ul className="rounded-card border border-border bg-surface p-4 text-sm text-text-secondary">
            {data.reviewTasks.length ? (
              data.reviewTasks.map((task) => {
                return (
                  <li className="border-b border-border py-2 last:border-0" key={task.id}>
                    <span className="font-semibold text-brand-dark">
                      {task.claim.externalKey}
                    </span>
                    <span className="ml-2">
                      {knowledgeAdminLabels.reviewTaskStatus(task.status)} · prioriteit{' '}
                      {knowledgeAdminLabels.reviewPriority(task.priority).toLowerCase()}
                    </span>
                    <span className="mt-1 block">{task.controlExceptionReason ?? task.reviewReason}</span>
                  </li>
                )
              })
            ) : (
              <li>Er zijn geen concrete uitzonderingen die menselijke aandacht vereisen.</li>
            )}
          </ul>
        </AdminSection>
        <AdminSection title="Bronconflicten">
          <ul className="rounded-card border border-border bg-surface p-4 text-sm text-text-secondary">
            {data.conflicts.length ? (
              data.conflicts.map((conflict) => (
                <li className="border-b border-border py-2 last:border-0" key={conflict.id}>
                  {conflict.controlExceptionReason ?? conflict.claim.externalKey}
                </li>
              ))
            ) : (
              <li>Geen geregistreerde conflicten.</li>
            )}
          </ul>
        </AdminSection>
      </div>

      <AdminSection title="Audittrail">
        <ul className="rounded-card border border-border bg-surface p-4 text-sm text-text-secondary">
          {data.auditEvents.length ? (
            data.auditEvents.map((event) => (
              <li className="border-b border-border py-2 last:border-0" key={event.id}>
                {knowledgeAdminLabels.auditEvent(event.eventType)} ·{' '}
                {event.result === 'SUCCESS' ? 'Geslaagd' : event.result}
              </li>
            ))
          ) : (
            <li>Er zijn nog geen kennisauditevents. Voltooide imports worden hier automatisch vastgelegd.</li>
          )}
        </ul>
      </AdminSection>
    </div>
  )
}
