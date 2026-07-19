import { Text } from '@/components/ui/text'
import type { ObligationContent } from '@/content/public-content-model'
import { publicRoutes } from '@/content/public-routes'
import { resolvePublicSources } from '@/content/public-sources'
import { EvidencePanel } from './evidence-panel'
import { KnowledgeCallToAction } from './knowledge-call-to-action'
import { PublicPageLayout } from './public-page-layout'
import { RelatedTopics } from './related-topics'
import { resolvePublicContentCta, resolveRelatedPublicContent } from '@/content/public-content'
import { PublicBulletList, PublicContentStatus, PublicDetailBody, PublicFaqList, PublicSourceList, PublicTextSection } from './public-detail-shared'

export function ObligationDetailPage({ content }: { content: ObligationContent }) {
  const cta = resolvePublicContentCta(content.id)
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: publicRoutes.home }, { label: 'Wettelijke verplichtingen', href: publicRoutes.obligations }, { label: content.title }]} eyebrow="Wettelijke verplichting" title={content.title} description={content.summary}><PublicDetailBody><PublicContentStatus content={content} /><EvidencePanel /><PublicTextSection id="inhoud" title="Wat houdt de verplichting in?"><Text>{content.explanation}</Text></PublicTextSection><PublicTextSection id="toepassing" title="Voor wie kan deze gelden?"><Text>{content.potentiallyRelevantFor}</Text></PublicTextSection><PublicTextSection id="praktijk" title="Wat moet een organisatie praktisch regelen?"><PublicBulletList items={content.practicalActions} /></PublicTextSection><PublicTextSection id="nuance" title="Welke context of uitzonderingen zijn relevant?"><PublicBulletList items={content.nuances} /></PublicTextSection><PublicTextSection id="verantwoordelijkheid" title="Wie heeft welke verantwoordelijkheid?"><Text>{content.responsibilities}</Text></PublicTextSection><PublicTextSection id="rie" title="Hoe hangt dit samen met de RI&E?"><Text>{content.rieRelationship}</Text></PublicTextSection><PublicTextSection id="ondersteuning" title="Welke ondersteuning kan passend zijn?"><Text>{content.suitableSupport}</Text></PublicTextSection><PublicTextSection id="basis" title="Wettelijke basis"><Text>{content.legalBasis}</Text><Text>{content.disclaimer}</Text></PublicTextSection><PublicFaqList faq={content.faq} /><PublicSourceList sources={resolvePublicSources(content.sourceIds)} />{cta && <KnowledgeCallToAction content={cta} />}<RelatedTopics currentContentId={content.id} topics={resolveRelatedPublicContent(content.id)} /></PublicDetailBody></PublicPageLayout>
}
