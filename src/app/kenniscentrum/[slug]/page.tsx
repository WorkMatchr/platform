import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { KnowledgeArticlePage } from '@/components/public/knowledge-article-page'
import { getKnowledgeArticleBySlug, knowledgeArticles } from '@/content/knowledge/articles'
import { createPublicContentMetadata } from '@/content/public-metadata'

export const dynamicParams = false
export function generateStaticParams() { return knowledgeArticles.filter((item) => item.slug !== 'moet-ik-een-rie-hebben').map((item) => ({ slug: item.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const content = getKnowledgeArticleBySlug((await params).slug); return content ? createPublicContentMetadata(content) : {} }
export default async function KnowledgeArticleRoute({ params }: { params: Promise<{ slug: string }> }) { const content = getKnowledgeArticleBySlug((await params).slug); if (!content || content.slug === 'moet-ik-een-rie-hebben') notFound(); return <KnowledgeArticlePage content={content} /> }
