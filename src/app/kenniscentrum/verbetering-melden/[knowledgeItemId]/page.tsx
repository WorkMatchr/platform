import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { KnowledgeImprovementReportForm } from '@/components/knowledge/knowledge-improvement-report-form'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { requireUser } from '@/lib/authorization'
import { getKnowledgeItemForImprovementReport } from '@/lib/knowledge/knowledge-improvement-service'

export const metadata: Metadata = { title: 'Inhoudelijke verbetering melden | WorkMatchr' }

export default async function KnowledgeImprovementPage({ params }: { params: Promise<{ knowledgeItemId: string }> }) {
  const { knowledgeItemId } = await params
  const user = await requireUser(`/kenniscentrum/verbetering-melden/${knowledgeItemId}`)
  const item = await getKnowledgeItemForImprovementReport(user.id, knowledgeItemId)
  if (!item) notFound()

  return (
    <PublicPageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Kenniscentrum', href: '/kenniscentrum' }, { label: 'Inhoudelijke verbetering melden' }]}
      eyebrow="Kenniscentrum"
      title="Meld een inhoudelijke verbetering"
      description="Uw vakinhoudelijke signaal helpt WorkMatchr om bronnen, actualiteit en formuleringen gericht opnieuw te controleren."
    >
      <section className="mx-auto grid max-w-3xl gap-5 px-4 py-8 sm:px-6" aria-labelledby="knowledge-item-title">
        <div className="rounded-card border border-border bg-surface-subtle p-5">
          {item.publicationStatus !== 'PUBLISHED' || item.validationStatus !== 'VALIDATED' ? (
            <p className="mb-3 text-sm font-semibold text-status-warning" role="status">
              Developmenttest: dit interne kennisitem is nog niet gepubliceerd en gevalideerd.
            </p>
          ) : null}
          <h2 className="text-lg font-bold text-brand-dark" id="knowledge-item-title">{item.topic.title}</h2>
          <p className="mt-2 leading-6 text-text-secondary">{item.statement}</p>
        </div>
        <KnowledgeImprovementReportForm knowledgeItemId={item.id} />
      </section>
    </PublicPageLayout>
  )
}
