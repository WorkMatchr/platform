import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { startFinalExamAction } from '@/app/e-learnings/exam-actions'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getFinalExamOverview } from '@/lib/learning/learning-final-exam-service'

export default async function FinalExamLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string }>
  searchParams: Promise<{ melding?: string }>
}) {
  const [{ courseSlug }, query] = await Promise.all([params, searchParams])
  const user = await requireLearningUser(`/e-learnings/${courseSlug}/eindtoets`)
  const overview = await getFinalExamOverview(user.id, courseSlug)
  if (!overview) notFound()

  const passingAttempt = overview.attempts.find((attempt) => attempt.passed)
  const latest = overview.attempts.at(-1)
  const hasAttempts = overview.attempts.length > 0
  const resumeHref = overview.activeAttempt
    ? `/e-learnings/${courseSlug}/eindtoets/${overview.activeAttempt.id}`
    : null

  return <Container className="py-10 sm:py-14">
    <Link className="text-sm font-semibold text-brand-primary hover:underline" href={`/e-learnings/${courseSlug}`}>← Terug naar de opleiding</Link>
    <div className="mx-auto mt-6 max-w-3xl space-y-6">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-primary">WL-001 · Eindtoets v1.0</p>
        <h1 className="text-3xl font-bold text-brand-dark sm:text-4xl">Eindtoets — RI&E in de praktijk</h1>
        <p className="mt-4 text-lg leading-8 text-text-secondary">De toets bevat 50 vragen. U slaagt vanaf 40 goede antwoorden (80%). U heeft geen tijdslimiet; de indicatieve duur is 45–60 minuten. Teruggaan en antwoorden wijzigen kan tot u de toets definitief inlevert. Tijdens de toets krijgt u geen goed/foutfeedback. U kunt de toets onbeperkt opnieuw doen.</p>
      </div>
      {query.melding === 'toegang' && <p role="alert" className="rounded-card border border-warning/30 bg-warning/10 p-4">De eindtoets is beschikbaar nadat alle tien hoofdstukken zijn afgerond en uw eigen inschrijving geldig is.</p>}
      {!overview.enrollment && <Card><p>Start eerst deze e-learning en rond de tien hoofdstukken af voordat de eindtoets beschikbaar wordt.</p></Card>}
      {overview.enrollment && !overview.eligible && <Card><p className="font-semibold">Eerst de hoofdstukken afronden</p><p className="mt-2 text-sm leading-6 text-text-secondary">Afgerond: {overview.completedChapters} van {overview.chapterCount} hoofdstukken.</p><Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand-primary hover:underline" href={`/e-learnings/${courseSlug}`}>Verder met de opleiding</Link></Card>}
      {overview.eligible && <Card className="space-y-4">
        <h2 className="text-xl font-bold text-brand-dark">Uw eindtoets</h2>
        {passingAttempt && <p className="rounded-card border border-success/30 bg-success/10 p-3">Eindtoets behaald — beste geslaagde resultaat {passingAttempt.percentage}%.</p>}
        {!passingAttempt && latest && <p className="text-text-secondary">Laatste poging: {latest.percentage}% — nog niet behaald. U kunt opnieuw proberen.</p>}
        {overview.activeAttempt
          ? <Link className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark" href={resumeHref!}>Hervat eindtoets</Link>
          : <form action={startFinalExamAction.bind(null, courseSlug)}><button type="submit" className="min-h-11 rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark">{hasAttempts ? 'Opnieuw proberen' : 'Start eindtoets'}</button></form>}
        {overview.attempts.length > 0 && <section aria-labelledby="attempt-history-title">
          <h3 id="attempt-history-title" className="font-semibold text-brand-dark">Uw pogingen</h3>
          <ol className="mt-2 space-y-2">{overview.attempts.map((attempt) => <li key={attempt.id}><Link className="text-sm font-medium text-brand-primary hover:underline" href={`/e-learnings/${courseSlug}/eindtoets/resultaat/${attempt.id}`}>Poging {attempt.attemptNumber} — {attempt.percentage}% — {attempt.passed ? 'behaald' : 'nog niet behaald'}</Link></li>)}</ol>
        </section>}
      </Card>}
      <p className="text-sm leading-6 text-text-secondary">Deze e-learning geeft basiskennis over de RI&E. Het afronden van de eindtoets maakt u niet automatisch tot gecertificeerd arbokerndeskundige of specialist voor ieder arbeidsrisico.</p>
    </div>
  </Container>
}
