import { redirect } from 'next/navigation'

export default async function SubmitIntakePage({ params }: { params: Promise<{ intakeId: string }> }) {
  const { intakeId } = await params
  redirect(`/hulpvragen/${intakeId}/controle`)
}
