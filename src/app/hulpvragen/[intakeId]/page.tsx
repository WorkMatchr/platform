import { LegacySimpleAdvicePage } from '@/components/requests/legacy-simple-advice-page'

export default async function ResumeIntakePage({ params }: { params: Promise<{ intakeId: string }> }) {
  const { intakeId } = await params
  return <LegacySimpleAdvicePage intakeId={intakeId} />
}
