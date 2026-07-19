import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import type { KnowledgeDocument } from '@/content/knowledge/types'
import type { InternalHref } from '@/content/public-homepage'
import {
  getPublicContentItem,
  publicContentTypeLabels,
  resolvePublicContentCta,
  resolveRelatedPublicContent,
} from '@/content/public-content'
import { ContentStatus } from './content-status'
import { EvidencePanel } from './evidence-panel'
import { KnowledgeCallToAction } from './knowledge-call-to-action'
import { KnowledgeSummary } from './knowledge-summary'
import { LastReviewed } from './last-reviewed'
import { PublicPageLayout } from './public-page-layout'
import { RelatedTopics } from './related-topics'
import { SourceList } from './source-list'

type KnowledgeDocumentPageProps = {
  document: KnowledgeDocument
  breadcrumbs: readonly { label: string; href?: InternalHref }[]
  showShortAnswer?: boolean
}

export function KnowledgeDocumentPage({ document, breadcrumbs, showShortAnswer = false }: KnowledgeDocumentPageProps) {
  const relatedContent = resolveRelatedPublicContent(document.contentId)
  const callToAction = resolvePublicContentCta(document.contentId)
  const contentItem = getPublicContentItem(document.contentId)

  return (
    <PublicPageLayout breadcrumbs={breadcrumbs} eyebrow={publicContentTypeLabels[contentItem.type]} title={document.title} description={document.summary}>
      <Section containerSize="narrow" spacing="compact" containerClassName="space-y-10 sm:space-y-12">
        <div className="flex flex-col gap-4"><ContentStatus status={document.status} validationStatus="VALIDATED" /><LastReviewed date={document.lastReviewed} /></div>
        {showShortAnswer && <KnowledgeSummary>{document.summary}</KnowledgeSummary>}
        <EvidencePanel />
        {document.sections.map((section) => <section key={section.id} aria-labelledby={`${section.id}-title`} className="max-w-3xl"><Heading as="h2" size="h2" id={`${section.id}-title`}>{section.title}</Heading><div className="mt-4 space-y-4">{section.paragraphs.map((paragraph) => <Text key={paragraph} className="text-text-secondary">{paragraph}</Text>)}</div>{section.items && <ul className="mt-4 list-disc space-y-2 pl-6 text-body leading-7 text-text-secondary">{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}
        <SourceList sources={document.sources} />
        <LastReviewed date={document.lastReviewed} />
        {callToAction && <KnowledgeCallToAction content={callToAction} />}
        <RelatedTopics currentContentId={document.contentId} topics={relatedContent} />
      </Section>
    </PublicPageLayout>
  )
}
