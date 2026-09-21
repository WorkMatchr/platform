import { Text } from '@/components/ui/text'
import type { KnowledgeArticleContent } from '@/content/public-content-model'
import { publicRoutes } from '@/content/public-routes'
import { resolvePublicSources } from '@/content/public-sources'
import { KnowledgeInformationNotice } from '@/components/knowledge/knowledge-information-notice'
import { KnowledgeSummary } from './knowledge-summary'
import { PublicContentCallToAction, PublicContentRelations } from './public-content-pathways'
import { PublicPageLayout } from './public-page-layout'
import { PublicBulletList, PublicContentStatus, PublicDetailBody, PublicFaqList, PublicSourceList, PublicTextSection } from './public-detail-shared'

export function KnowledgeArticlePage({
  content,
  improvementReportHref,
  developmentImprovementTestMode = false,
}: {
  content: KnowledgeArticleContent
  improvementReportHref?: `/kenniscentrum/verbetering-melden/${string}`
  developmentImprovementTestMode?: boolean
}) {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: publicRoutes.home }, { label: 'Kenniscentrum', href: publicRoutes.knowledge }, { label: content.title }]} eyebrow="Kennis" title={content.title} description={content.summary}><PublicDetailBody><PublicContentStatus content={content} /><KnowledgeSummary>{content.shortAnswer}</KnowledgeSummary><PublicTextSection id="relevant" title="Wanneer is dit relevant?"><Text>{content.relevantWhen}</Text></PublicTextSection><PublicTextSection id="context" title="Wat betekent dit in de praktijk?">{content.context.map((paragraph) => <Text key={paragraph}>{paragraph}</Text>)}</PublicTextSection><PublicTextSection id="praktijkvoorbeeld" title="Praktijkvoorbeeld"><Text>{content.practiceExample}</Text></PublicTextSection><PublicTextSection id="aandachtspunten" title="Praktische aandachtspunten"><PublicBulletList items={content.practicalPoints} /></PublicTextSection><PublicTextSection id="rie" title="Wat is de relatie met de RI&E?"><Text>{content.rieRelationship}</Text></PublicTextSection><PublicTextSection id="ondersteuning" title="Wanneer is ondersteuning verstandig?"><Text>{content.supportWhen}</Text></PublicTextSection><PublicTextSection id="vervolg" title="Wat kunt u nu doen?"><Text>{content.nextStep}</Text></PublicTextSection><PublicTextSection id="wettelijke-context" title="Wettelijke context"><Text>{content.legalContext}</Text></PublicTextSection><KnowledgeInformationNotice reportHref={improvementReportHref} developmentTestMode={developmentImprovementTestMode} /><PublicContentRelations contentId={content.id} /><PublicFaqList faq={content.faq} /><PublicContentCallToAction /><PublicSourceList sources={resolvePublicSources(content.sourceIds)} /></PublicDetailBody></PublicPageLayout>
}
