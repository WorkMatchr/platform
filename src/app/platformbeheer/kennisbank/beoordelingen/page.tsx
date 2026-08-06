import type { Metadata } from 'next'
import Link from 'next/link'
import type {
  KnowledgeClaimType,
  KnowledgePublicationStatus,
  KnowledgeReviewPriority,
  KnowledgeReviewTaskStatus,
  KnowledgeValidationStatus,
} from '@/generated/prisma/enums'
import { AdminPageHeader, AdminTable, EmptyState, FilterField, FilterForm, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { formatKnowledgeCitationLocation, knowledgeAdminLabels } from '@/lib/knowledge/knowledge-admin-presentation'
import { getKnowledgeReviewOverview } from '@/lib/knowledge/knowledge-review-query-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const metadata: Metadata = { title: 'Kennisuitzonderingen | WorkMatchr' }

const claimTypes = ['DEFINITION', 'HAZARD', 'RISK', 'HEALTH_EFFECT', 'LEGAL_REQUIREMENT', 'PROHIBITION', 'THRESHOLD', 'RECOMMENDATION', 'CONTROL_MEASURE', 'RESPONSIBILITY', 'ROLE', 'EXCEPTION', 'CONDITION', 'PROCEDURAL_STEP', 'INSPECTION_POINT', 'MEASUREMENT_REQUIREMENT', 'RECORD_RETENTION', 'TRAINING_REQUIREMENT', 'PPE_REQUIREMENT', 'EMERGENCY_REQUIREMENT', 'OTHER'] as const satisfies readonly KnowledgeClaimType[]
const priorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as const satisfies readonly KnowledgeReviewPriority[]
const statuses = ['OPEN', 'IN_PROGRESS', 'DEFERRED', 'CHANGES_REQUIRED'] as const satisfies readonly KnowledgeReviewTaskStatus[]
const validationStatuses = ['UNVALIDATED', 'PARTIALLY_VALIDATED', 'VALIDATED', 'CONFLICTING', 'REJECTED', 'EXPIRED', 'REVIEW_REQUIRED'] as const satisfies readonly KnowledgeValidationStatus[]
const publicationStatuses = ['DRAFT', 'INTERNAL_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'REJECTED'] as const satisfies readonly KnowledgePublicationStatus[]

function selected<T extends string>(value: string | undefined, values: readonly T[]): T | undefined {
  return values.includes(value as T) ? value as T : undefined
}

export default async function KnowledgeReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePlatformAdministrator('/platformbeheer/kennisbank/beoordelingen')
  const query = await searchParams
  const value = (key: string) => typeof query[key] === 'string' ? query[key] : undefined
  const filters = {
    sourceCode: value('bron'),
    topicSlug: value('onderwerp'),
    claimType: selected(value('soort'), claimTypes),
    priority: selected(value('prioriteit'), priorities),
    status: selected(value('status'), statuses),
    validationStatus: selected(value('validatie'), validationStatuses),
    publicationStatus: selected(value('publicatie'), publicationStatuses),
    sort: selected(value('sortering'), ['oldest', 'newest', 'priority', 'source', 'topic'] as const),
  }
  const data = await getKnowledgeReviewOverview(filters)
  return (
    <div>
      <AdminPageHeader
        eyebrow="Kennisbeheer"
        title="Kennisuitzonderingen"
        description="Hier staan uitsluitend concrete uitzonderingen die menselijke aandacht vereisen. Automatisch verwerkte en historische interne kennis vormen geen algemene werkvoorraad."
        action={<Link className="inline-flex min-h-10 items-center rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-primary-subtle" href="/platformbeheer/kennisbank">Terug naar kennisbeheer</Link>}
      />
      <FilterForm>
        <FilterField label="Bron" name="bron">
          <select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" defaultValue={filters.sourceCode ?? ''} name="bron">
            <option value="">Alle bronnen</option>
            {data.sources.map((source) => <option key={source.code} value={source.code}>{source.code} — {source.title}</option>)}
          </select>
        </FilterField>
        <FilterField label="Onderwerp" name="onderwerp">
          <select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" defaultValue={filters.topicSlug ?? ''} name="onderwerp">
            <option value="">Alle onderwerpen</option>
            {data.topics.map((topic) => <option key={topic.slug} value={topic.slug}>{topic.title}</option>)}
          </select>
        </FilterField>
        <FilterField label="Soort kennis" name="soort">
          <select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" defaultValue={filters.claimType ?? ''} name="soort">
            <option value="">Alle soorten</option>
            {claimTypes.map((type) => <option key={type} value={type}>{knowledgeAdminLabels.claimType(type)}</option>)}
          </select>
        </FilterField>
        <FilterField label="Prioriteit" name="prioriteit">
          <select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" defaultValue={filters.priority ?? ''} name="prioriteit">
            <option value="">Alle prioriteiten</option>
            {priorities.map((priority) => <option key={priority} value={priority}>{knowledgeAdminLabels.reviewPriority(priority)}</option>)}
          </select>
        </FilterField>
        <FilterField label="Controlestatus" name="status">
          <select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" defaultValue={filters.status ?? ''} name="status">
            <option value="">Actieve uitzonderingen</option>
            {statuses.map((status) => <option key={status} value={status}>{knowledgeAdminLabels.reviewTaskStatus(status)}</option>)}
          </select>
        </FilterField>
        <FilterField label="Validatiestatus" name="validatie">
          <select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" defaultValue={filters.validationStatus ?? ''} name="validatie">
            <option value="">Alle validatiestatussen</option>
            {validationStatuses.map((status) => <option key={status} value={status}>{knowledgeAdminLabels.validationStatus(status)}</option>)}
          </select>
        </FilterField>
        <FilterField label="Publicatiestatus" name="publicatie">
          <select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" defaultValue={filters.publicationStatus ?? ''} name="publicatie">
            <option value="">Alle publicatiestatussen</option>
            {publicationStatuses.map((status) => <option key={status} value={status}>{knowledgeAdminLabels.publicationStatus(status)}</option>)}
          </select>
        </FilterField>
        <FilterField label="Sortering" name="sortering">
          <select className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm" defaultValue={filters.sort ?? 'oldest'} name="sortering">
            <option value="oldest">Oudste eerst</option><option value="newest">Nieuwste eerst</option>
            <option value="priority">Prioriteit</option><option value="source">Broncode</option><option value="topic">Onderwerp</option>
          </select>
        </FilterField>
      </FilterForm>
      <p className="mb-3 text-sm text-text-secondary">{data.total} actieve uitzonderingen gevonden.</p>
      {data.tasks.length === 0 ? <EmptyState>Er zijn geen concrete uitzonderingen die aan deze filters voldoen.</EmptyState> : (
        <AdminTable headers={['Bron', 'Kennisitem', 'Onderwerp en soort', 'Uitzondering', 'Status', 'Aangemaakt', 'Verantwoordelijke', 'Actie']}>
          {data.tasks.map((task) => {
            const citation = task.claim.citations[0]
            return (
              <tr key={task.id}>
                <td className="px-4 py-3"><span className="font-semibold text-brand-dark">{citation?.sourceVersion.source.code ?? 'Bron onbekend'}</span><span className="mt-1 block text-xs text-text-secondary">{citation?.fragment ? formatKnowledgeCitationLocation(citation.fragment) : 'Locatie niet vastgelegd'}</span></td>
                <td className="max-w-md px-4 py-3"><span className="font-semibold text-brand-dark">{task.claim.statement}</span><span className="mt-1 block text-xs text-text-secondary">{task.claim.externalKey}</span></td>
                <td className="px-4 py-3">{task.claim.topic.title}<span className="mt-1 block text-xs text-text-secondary">{knowledgeAdminLabels.claimType(task.claim.claimType)}</span></td>
                <td className="px-4 py-3"><span className="font-semibold text-brand-dark">{task.controlExceptionType ? knowledgeAdminLabels.controlException(task.controlExceptionType) : 'Gerichte uitzondering'}</span><span className="mt-1 block text-xs text-text-secondary">{task.controlExceptionReason}</span></td>
                <td className="px-4 py-3"><StatusPill tone={task.status === 'REJECTED' ? 'bad' : task.status === 'CONTENT_APPROVED' ? 'good' : 'warning'}>{knowledgeAdminLabels.reviewTaskStatus(task.status)}</StatusPill><span className="mt-1 block text-xs text-text-secondary">{knowledgeAdminLabels.sourceControlStatus(task.claim.sourceControlStatus)} · risico {knowledgeAdminLabels.controlRisk(task.claim.controlRisk).toLowerCase()}</span><span className="mt-1 block text-xs text-text-secondary">{knowledgeAdminLabels.validationStatus(task.claim.validationStatus)} · {knowledgeAdminLabels.publicationStatus(task.claim.publicationStatus)}</span></td>
                <td className="px-4 py-3">{new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium' }).format(task.createdAt)}</td>
                <td className="px-4 py-3">{task.assignedTo?.displayName || task.assignedTo?.email || 'Niet toegewezen'}</td>
                <td className="px-4 py-3"><Link className="font-semibold text-brand-primary underline-offset-4 hover:underline" href={`/platformbeheer/kennisbank/beoordelingen/${task.id}`}>Beoordelen</Link></td>
              </tr>
            )
          })}
        </AdminTable>
      )}
    </div>
  )
}
