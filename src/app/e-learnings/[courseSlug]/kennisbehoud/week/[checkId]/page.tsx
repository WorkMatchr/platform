import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { RetentionWeeklyPlayer } from '@/components/learning/retention-program-controls'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getMyRetentionOverview, getMyRetentionWeeklyCheck } from '@/lib/learning/learning-retention-service'

export default async function RetentionWeeklyCheckPage({ params }: { params: Promise<{ courseSlug: string; checkId: string }> }) {
  const { courseSlug, checkId } = await params
  if (courseSlug !== 'rie-in-de-praktijk' || !/^[0-9a-f-]{36}$/i.test(checkId)) notFound()
  const user = await requireLearningUser(`/e-learnings/${courseSlug}/kennisbehoud/week/${checkId}`)
  const overview = await getMyRetentionOverview(user.id)
  const participationId = overview.participation?.id
  if (!participationId) notFound()
  let check
  try { check = await getMyRetentionWeeklyCheck(user.id, participationId, checkId) } catch { check = null }
  if (!check) notFound()
  return <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-10 sm:px-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">RI&E in de praktijk · Kennisbehoud</p>
    <h1 className="text-3xl font-bold text-brand-dark">Week {check.weekNumber} van 12</h1>
    <Card className="space-y-5">
      {check.closesAt <= new Date() && !check.completedAt && <p className="rounded-card border border-warning/40 p-3" role="status">Deze kennischeck is gesloten. U kunt uw opgeslagen antwoorden nog bekijken.</p>}
      <RetentionWeeklyPlayer check={{ ...check, participationId }} />
      <Link className="inline-flex min-h-11 items-center font-semibold text-brand-primary underline" href={`/e-learnings/${courseSlug}/kennisbehoud`}>Terug naar kennisbehoud</Link>
    </Card>
  </main>
}
