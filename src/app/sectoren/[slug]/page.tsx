import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SectorDetailPage } from '@/components/public/sector-detail-page'
import { createPublicContentMetadata } from '@/content/public-metadata'
import { getSectorBySlug, sectors } from '@/content/sectors'

export const dynamicParams = false
export function generateStaticParams() { return sectors.map((item) => ({ slug: item.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const content = getSectorBySlug((await params).slug); return content ? createPublicContentMetadata(content) : {} }
export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) { const content = getSectorBySlug((await params).slug); if (!content) notFound(); return <SectorDetailPage content={content} /> }
