import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ServiceDetailPage } from '@/components/public/service-detail-page'
import { createPublicContentMetadata } from '@/content/public-metadata'
import { getServiceBySlug, services } from '@/content/services'

export const dynamicParams = false
export function generateStaticParams() { return services.filter((item) => item.slug !== 'rie').map((item) => ({ slug: item.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const content = getServiceBySlug((await params).slug); return content ? createPublicContentMetadata(content) : {} }
export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) { const content = getServiceBySlug((await params).slug); if (!content || content.slug === 'rie') notFound(); return <ServiceDetailPage content={content} /> }
