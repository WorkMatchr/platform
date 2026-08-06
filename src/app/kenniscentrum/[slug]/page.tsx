import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { KnowledgeArticlePage } from '@/components/public/knowledge-article-page'
import { getKnowledgeArticleBySlug, knowledgeArticles } from '@/content/knowledge/articles'
import { createPublicContentMetadata } from '@/content/public-metadata'
import { getDevelopmentKnowledgeImprovementTarget } from '@/lib/knowledge/knowledge-improvement-policy'

export const dynamicParams = false
export function generateStaticParams() { return knowledgeArticles.filter((item) => item.slug !== 'moet-ik-een-rie-hebben').map((item) => ({ slug: item.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const content = getKnowledgeArticleBySlug((await params).slug); return content ? createPublicContentMetadata(content) : {} }
export default async function KnowledgeArticleRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ testVerbetering?: string }>
}) {
  const content = getKnowledgeArticleBySlug((await params).slug)
  if (!content || content.slug === 'moet-ik-een-rie-hebben') notFound()

  const developmentTestRequested = (await searchParams).testVerbetering === '1'
  const developmentTarget = developmentTestRequested
    ? await getDevelopmentKnowledgeImprovementTarget()
    : null
  const improvementReportHref = developmentTarget
    ? `/kenniscentrum/verbetering-melden/${developmentTarget.id}` as const
    : undefined

  return (
    <KnowledgeArticlePage
      content={content}
      improvementReportHref={improvementReportHref}
      developmentImprovementTestMode={Boolean(developmentTarget)}
    />
  )
}
