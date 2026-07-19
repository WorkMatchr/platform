import type { Metadata } from 'next'
import { ServiceDetailPage } from '@/components/public/service-detail-page'
import { createPublicContentMetadata } from '@/content/public-metadata'
import { getServiceBySlug } from '@/content/services'

const content = getServiceBySlug('rie')!
export const metadata: Metadata = createPublicContentMetadata(content)
export default function RieServiceRoute() { return <ServiceDetailPage content={content} /> }
