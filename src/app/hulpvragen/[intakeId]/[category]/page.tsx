import type { Metadata } from 'next'
import { LegacySimpleAdvicePage } from '@/components/requests/legacy-simple-advice-page'

export const metadata: Metadata = { title: 'Opdracht invullen | WorkMatchr' }

export default async function IntakeCategoryPage({ params }: { params: Promise<{ intakeId: string; category: string }> }) {
  const { intakeId } = await params
  return <LegacySimpleAdvicePage intakeId={intakeId} />
}
