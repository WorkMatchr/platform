import { Section } from '@/components/layout/section'
import {
  resolvePublicContentCta,
  resolveRelatedPublicContent,
  type PublicContentId,
} from '@/content/public-content'
import { KnowledgeCallToAction } from './knowledge-call-to-action'
import { RelatedTopics } from './related-topics'

export function PublicContentPathways({ contentId }: { contentId: PublicContentId }) {
  const relatedContent = resolveRelatedPublicContent(contentId)
  const callToAction = resolvePublicContentCta(contentId)

  if (relatedContent.length === 0 && !callToAction) return null

  return (
    <Section spacing="compact" className="bg-surface-subtle" containerClassName="space-y-10">
      {callToAction && <KnowledgeCallToAction content={callToAction} />}
      <RelatedTopics
        currentContentId={contentId}
        topics={relatedContent}
        title="Verken vanuit dit overzicht"
        limit={2}
      />
    </Section>
  )
}
