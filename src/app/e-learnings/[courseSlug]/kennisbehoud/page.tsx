import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { AnnualReminderConsent, RetentionOptIn, StopRetention } from '@/components/learning/retention-program-controls'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getMyRetentionOverview, ensureMyRetentionWeeklyChecks } from '@/lib/learning/learning-retention-service'

export default async function RetentionProgramPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params
  if (courseSlug !== 'rie-in-de-praktijk') notFound()
  const user = await requireLearningUser(`/e-learnings/${courseSlug}/kennisbehoud`)
  let overview = await getMyRetentionOverview(user.id)
  if (overview.participation && !overview.participation.stoppedAt) {
    try { await ensureMyRetentionWeeklyChecks(user.id, overview.participation.id) } catch { /* Draft content or a closed program stays unavailable; never expose a partial check. */ }
    overview = await getMyRetentionOverview(user.id)
  }
  if (!overview.eligible) return <main className="mx-auto max-w-3xl space-y-5 px-4 py-10 sm:px-6">
    <h1 className="text-3xl font-bold text-brand-dark">Kennisbehoud</h1>
    <Card><p>Kennisbehoud is beschikbaar nadat u de opleiding en de eindtoets succesvol heeft afgerond.</p><Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-primary underline" href="/e-learnings/mijn">Terug naar Mijn e-learnings</Link></Card>
  </main>

  const participation = overview.participation
  return <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">WL-001 · RI&E in de praktijk</p>
    <h1 className="text-3xl font-bold text-brand-dark">Kennisbehoud</h1>
    <Card className="space-y-5">
      {!participation && overview.programAvailable && <RetentionOptIn />}
      {!participation && !overview.programAvailable && <div className="space-y-2"><h2 className="text-xl font-bold text-brand-dark">12 weken kennisbehoud</h2><p className="text-text-secondary">De vrijwillige kennischecks zijn op dit moment nog niet beschikbaar.</p></div>}
      {participation && <section className="space-y-4" aria-labelledby="retention-status-title">
        <h2 id="retention-status-title" className="text-xl font-bold text-brand-dark">Uw deelname</h2>
        <p role="status">{participation.status === 'STOPPED' ? 'Gestopt' : participation.status === 'COMPLETED' ? 'Afgerond' : 'Actief'} · weekchecks lopen 12 weken, met 5 vragen per week.</p>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Overzicht van de twaalf kennischecks">
          {Array.from({ length: 12 }, (_, index) => {
            const weekNumber = index + 1
            const week = overview.weeks.find((item) => item.weekNumber === weekNumber)
            const status = week?.completed ? 'Afgerond' : week?.closed ? (week.answered ? 'Gedeeltelijk verlopen' : 'Gemist') : week?.available ? 'Beschikbaar' : 'Nog niet beschikbaar'
            return <li key={weekNumber} className="rounded-card border border-border p-4">
              <p className="font-semibold text-brand-dark">Week {weekNumber} — {status}</p>
              {week?.available && <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand-primary underline" href={week.href}>{week.completed ? 'Resultaat bekijken' : week.closed ? 'Eerdere antwoorden bekijken' : week.answered ? 'Hervat kennischeck' : 'Open kennischeck'}{week.answered ? ` · ${week.answered} van 5 beantwoord` : ''}</Link>}
            </li>
          })}
        </ol>
        {participation.status === 'ACTIVE' && <StopRetention participationId={participation.id} />}
      </section>}
      <AnnualReminderConsent enabled={Boolean(overview.annualReminder && !overview.annualReminder.revokedAt && !overview.annualReminder.sentAt)} scheduledFor={overview.annualReminder?.scheduledFor?.toISOString() ?? null} sent={Boolean(overview.annualReminder?.sentAt)} />
      <Link className="inline-flex min-h-11 items-center font-semibold text-brand-primary underline" href="/e-learnings/mijn">Terug naar Mijn e-learnings</Link>
    </Card>
  </main>
}
