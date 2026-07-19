import { Text } from '@/components/ui/text'
import type { ServiceContent } from '@/content/public-content-model'
import { publicRoutes } from '@/content/public-routes'
import { resolvePublicSources } from '@/content/public-sources'
import { KnowledgeCallToAction } from './knowledge-call-to-action'
import { PublicPageLayout } from './public-page-layout'
import { RelatedTopics } from './related-topics'
import { resolvePublicContentCta, resolveRelatedPublicContent } from '@/content/public-content'
import { PublicBulletList, PublicContentStatus, PublicDetailBody, PublicFaqList, PublicSourceList, PublicSteps, PublicTextSection } from './public-detail-shared'

export function ServiceDetailPage({ content }: { content: ServiceContent }) {
  const cta = resolvePublicContentCta(content.id)
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: publicRoutes.home }, { label: 'Diensten', href: publicRoutes.services }, { label: content.title }]} eyebrow="Dienst" title={content.title} description={content.summary}><PublicDetailBody><PublicContentStatus content={content} /><PublicTextSection id="wat" title="Wat is deze dienst of deskundigheid?"><Text>{content.positioning}</Text></PublicTextSection><PublicTextSection id="situatie" title="Bij welke situatie kan dit relevant zijn?"><Text>{content.problem}</Text><PublicBulletList items={content.appropriateWhen} /></PublicTextSection><PublicTextSection id="niet-direct" title="Wanneer is dit niet direct de eerste stap?"><PublicBulletList items={content.notDirectlyWhen} /></PublicTextSection><PublicTextSection id="opbrengst" title="Wat levert professionele ondersteuning op?"><PublicBulletList items={content.outcomes} /></PublicTextSection><PublicTextSection id="traject" title="Hoe verloopt een gebruikelijk traject?"><PublicSteps items={content.process} /></PublicTextSection><PublicTextSection id="verantwoordelijkheid" title="Wat blijft de verantwoordelijkheid van de organisatie?"><Text>{content.organizationResponsibility}</Text></PublicTextSection><PublicTextSection id="deskundigheid" title="Welke deskundigheid kan nodig zijn?"><Text>{content.audience}</Text><PublicBulletList items={content.expertise} /></PublicTextSection><PublicTextSection id="wettelijke-context" title="Relevante wettelijke context"><Text>{content.legalContext}</Text></PublicTextSection><PublicFaqList faq={content.faq} /><PublicSourceList sources={resolvePublicSources(content.sourceIds)} />{cta && <KnowledgeCallToAction content={cta} />}<RelatedTopics currentContentId={content.id} topics={resolveRelatedPublicContent(content.id)} /></PublicDetailBody></PublicPageLayout>
}
