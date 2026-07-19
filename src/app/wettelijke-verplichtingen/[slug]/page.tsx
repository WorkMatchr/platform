import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ObligationDetailPage } from '@/components/public/obligation-detail-page'
import { getObligationBySlug, obligations } from '@/content/obligations'
import { createPublicContentMetadata } from '@/content/public-metadata'

export const dynamicParams = false
export function generateStaticParams() { return obligations.filter((item) => item.slug !== 'rie').map((item) => ({ slug: item.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const content = getObligationBySlug((await params).slug); return content ? createPublicContentMetadata(content) : {} }
export default async function ObligationPage({ params }: { params: Promise<{ slug: string }> }) { const content = getObligationBySlug((await params).slug); if (!content || content.slug === 'rie') notFound(); return <ObligationDetailPage content={content} /> }
