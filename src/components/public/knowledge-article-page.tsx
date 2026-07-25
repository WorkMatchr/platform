import { Text } from '@/components/ui/text'
import type { KnowledgeArticleContent } from '@/content/public-content-model'
import { publicRoutes } from '@/content/public-routes'
import { resolvePublicSources } from '@/content/public-sources'
import { resolvePublicContentCta, resolveRelatedPublicContent } from '@/content/public-content'
import { KnowledgeCallToAction } from './knowledge-call-to-action'
import { KnowledgeSummary } from './knowledge-summary'
import { PublicPageLayout } from './public-page-layout'
import { RelatedTopics } from './related-topics'
import { PublicBulletList, PublicContentStatus, PublicDetailBody, PublicFaqList, PublicSourceList, PublicTextSection } from './public-detail-shared'

export function KnowledgeArticlePage({ content }: { content: KnowledgeArticleContent }) {
  const cta = resolvePublicContentCta(content.id)
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: publicRoutes.home }, { label: 'Kenniscentrum', href: publicRoutes.knowledge }, { label: content.title }]} eyebrow="Kennis" title={content.title} description={content.summary}><PublicDetailBody><PublicContentStatus content={content} /><KnowledgeSummary>{content.shortAnswer}</KnowledgeSummary><PublicTextSection id="relevant" title="Wanneer is dit relevant?"><Text>{content.relevantWhen}</Text></PublicTextSection><PublicTextSection id="context" title="Wat betekent dit in de praktijk?">{content.context.map((paragraph) => <Text key={paragraph}>{paragraph}</Text>)}</PublicTextSection><PublicTextSection id="praktijkvoorbeeld" title="Praktijkvoorbeeld"><Text>{content.practiceExample}</Text></PublicTextSection><PublicTextSection id="aandachtspunten" title="Praktische aandachtspunten"><PublicBulletList items={content.practicalPoints} /></PublicTextSection><PublicTextSection id="rie" title="Wat is de relatie met de RI&E?"><Text>{content.rieRelationship}</Text></PublicTextSection><PublicTextSection id="ondersteuning" title="Wanneer is ondersteuning verstandig?"><Text>{content.supportWhen}</Text></PublicTextSection><PublicTextSection id="vervolg" title="Wat kunt u nu doen?"><Text>{content.nextStep}</Text></PublicTextSection><PublicTextSection id="wettelijke-context" title="Wettelijke context"><Text>{content.legalContext}</Text></PublicTextSection><PublicFaqList faq={content.faq} /><PublicSourceList sources={resolvePublicSources(content.sourceIds)} />{cta && <KnowledgeCallToAction content={cta} />}<RelatedTopics currentContentId={content.id} topics={resolveRelatedPublicContent(content.id)} /></PublicDetailBody></PublicPageLayout>
}
