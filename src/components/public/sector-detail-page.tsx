import { Text } from '@/components/ui/text'
import type { SectorContent } from '@/content/public-content-model'
import { publicRoutes } from '@/content/public-routes'
import { resolvePublicSources } from '@/content/public-sources'
import { resolvePublicContentCta, resolveRelatedPublicContent } from '@/content/public-content'
import { KnowledgeCallToAction } from './knowledge-call-to-action'
import { PublicPageLayout } from './public-page-layout'
import { RelatedTopics } from './related-topics'
import { PublicBulletList, PublicContentStatus, PublicDetailBody, PublicFaqList, PublicSourceList, PublicSteps, PublicTextSection } from './public-detail-shared'

export function SectorDetailPage({ content }: { content: SectorContent }) {
  const cta = resolvePublicContentCta(content.id)
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: publicRoutes.home }, { label: 'Sectoren', href: publicRoutes.sectors }, { label: content.title }]} eyebrow="Sectorcontext" title={content.title} description={content.summary}><PublicDetailBody><PublicContentStatus content={content} /><PublicTextSection id="kenmerken" title="Kenmerken van de sector"><Text>{content.description}</Text></PublicTextSection><PublicTextSection id="werkzaamheden" title="Typische werkzaamheden"><PublicBulletList items={content.activities} /></PublicTextSection><PublicTextSection id="risicos" title="Veelvoorkomende veiligheids- en gezondheidsrisico’s"><Text>{content.nuance}</Text><PublicBulletList items={content.risks} /></PublicTextSection><PublicTextSection id="organisatie" title="Organisatorische aandachtspunten"><PublicBulletList items={content.organizationalPoints} /></PublicTextSection><PublicTextSection id="eerste-stappen" title="Praktische eerste stappen"><PublicSteps items={content.firstSteps} /></PublicTextSection><PublicTextSection id="ondersteuning" title="Wanneer kan deskundige ondersteuning passend zijn?"><Text>{content.supportWhen}</Text></PublicTextSection><PublicFaqList faq={content.faq} /><PublicSourceList sources={resolvePublicSources(content.sourceIds)} />{cta && <KnowledgeCallToAction content={cta} />}<RelatedTopics currentContentId={content.id} topics={resolveRelatedPublicContent(content.id)} /></PublicDetailBody></PublicPageLayout>
}
