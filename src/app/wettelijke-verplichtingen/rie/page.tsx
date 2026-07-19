import type { Metadata } from 'next'
import { ObligationDetailPage } from '@/components/public/obligation-detail-page'
import { getObligationBySlug } from '@/content/obligations'
import { createPublicContentMetadata } from '@/content/public-metadata'

const content = getObligationBySlug('rie')!
export const metadata: Metadata = createPublicContentMetadata(content)
export default function RieLegalRoute() { return <ObligationDetailPage content={content} /> }
