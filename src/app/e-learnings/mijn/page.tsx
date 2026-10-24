import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getMyLearningEnrollments } from '@/lib/learning/learning-query-service'
import { getFinalExamOverview } from '@/lib/learning/learning-final-exam-service'
import { getMyLearningCertificate } from '@/lib/learning/learning-certificate-service'
import { getMyRetentionOverview } from '@/lib/learning/learning-retention-service'

function statusLabel(status: string) {
  if (status === 'COMPLETED') return 'Hoofdstuk afgerond'
  if (status === 'IN_PROGRESS') return 'Bezig'
  if (status === 'NOT_STARTED') return 'Nog niet gestart'
  return 'Gestart'
}

export default async function MyLearningPage() {
  const user = await requireLearningUser('/e-learnings/mijn')
  const [enrollments, examOverview, retentionOverview] = await Promise.all([
    getMyLearningEnrollments(user.id),
    getFinalExamOverview(user.id),
    getMyRetentionOverview(user.id),
  ])
  const certificate = await getMyLearningCertificate(user.id)
  return <Container className="py-10 sm:py-14">
    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-primary">E-learnings</p>
    <h1 className="text-3xl font-bold text-brand-dark sm:text-4xl">Mijn e-learnings</h1>
    <p className="mt-4 max-w-2xl text-lg leading-8 text-text-secondary">U kunt hier verdergaan met uw opleidingen en afgeronde hoofdstukken terugvinden.</p>
    <div className="mt-8 space-y-5">
      {enrollments.map((enrollment) => {
        const course = enrollment.courseVersion.course
        const chapters = enrollment.courseVersion.chapters
        const chapter = chapters.find((item) => item.progress[0]?.status === 'IN_PROGRESS')
          ?? chapters.find((item) => item.progress[0]?.status !== 'COMPLETED')
          ?? chapters.at(-1)
        const progress = chapter?.progress[0]
        const versionQuery = `version=${encodeURIComponent(enrollment.courseVersion.version)}`
        const resumeHref = chapter
          ? `/e-learnings/${course.slug}/leren/${chapter.slug}?${versionQuery}${progress?.status === 'COMPLETED' ? '&opnieuw=1' : ''}`
          : `/e-learnings/${course.slug}`
        return <Card key={enrollment.id} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p className="text-sm font-semibold text-brand-primary">{course.code} · {enrollment.courseVersion.version}</p>
            <h2 className="mt-1 text-xl font-bold text-brand-dark">{course.title}</h2>
            <p className="mt-2 text-sm text-text-secondary">{chapter ? `Hoofdstuk ${chapter.position} · ` : ''}{statusLabel(progress?.status ?? 'NOT_STARTED')} · {progress?.progressPercentage ?? 0}% hoofdstukvoortgang</p>
            {enrollment.status === 'COMPLETED' && <p className="mt-2 text-sm text-text-secondary">Deze cursusversie is afgerond.</p>}
            {examOverview?.enrollment?.id === enrollment.id && <section className="mt-4 rounded-card border border-brand-primary/20 bg-brand-primary/5 p-4" aria-label="Eindtoetsstatus">
              <p className="font-semibold text-brand-dark">Eindtoets — RI&E in de praktijk</p>
              {!examOverview.eligible && <p className="mt-1 text-sm text-text-secondary">Beschikbaar na afronding van alle tien hoofdstukken ({examOverview.completedChapters}/10 afgerond).</p>}
              {examOverview.eligible && !examOverview.attempts.some((attempt) => attempt.passed) && <p className="mt-1 text-sm text-text-secondary">Een certificaat van afronding is beschikbaar na het behalen van de eindtoets.</p>}
              {examOverview.eligible && examOverview.attempts.some((attempt) => attempt.passed) && <p className="mt-1 text-sm text-text-secondary">Behaald — beste geslaagde score {Math.max(...examOverview.attempts.filter((attempt) => attempt.passed).map((attempt) => attempt.percentage ?? 0))}%.</p>}
              {certificate && <div className="mt-3 space-y-3 rounded-card border border-border p-4">
                <div>
                  <p className="font-semibold text-brand-dark">Certificaat van afronding</p>
                  <p className="text-sm text-text-secondary">RI&E in de praktijk · behaald op {new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'Europe/Amsterdam' }).format(certificate.issuedAt)}</p>
                  <p className="mt-1 text-sm text-text-secondary">Certificaatnummer <span className="font-mono">{certificate.certificateNumber}</span></p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <a className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-4 font-semibold text-text-on-dark" href={`/api/learning/certificates/${certificate.id}/pdf`}>Certificaat downloaden</a>
                  <Link className="inline-flex min-h-11 items-center font-semibold text-brand-primary hover:underline" href={`/certificaat/${encodeURIComponent(certificate.certificateNumber)}`}>Certificaat verifiëren</Link>
                </div>
              </div>}
              {retentionOverview.eligible && <div className="mt-4 rounded-card border border-border p-4">
                <p className="font-semibold text-brand-dark">Kennisbehoud</p>
                <p className="mt-1 text-sm text-text-secondary">{retentionOverview.participation ? retentionOverview.participation.status === 'STOPPED' ? 'Gestopt' : retentionOverview.participation.status === 'COMPLETED' ? 'Afgerond' : 'Actief' : retentionOverview.programAvailable ? 'Vrijwillige deelname beschikbaar' : 'Vrijwillig 12-weeks programma — nog niet beschikbaar'}</p>
                <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand-primary underline" href={`/e-learnings/${course.slug}/kennisbehoud`}>{retentionOverview.participation ? 'Kennisbehoud bekijken' : 'Kennisbehoud'}</Link>
              </div>}
              {examOverview.eligible && !examOverview.attempts.some((attempt) => attempt.passed) && examOverview.attempts.at(-1) && <p className="mt-1 text-sm text-text-secondary">Laatste poging {examOverview.attempts.at(-1)?.percentage}% — herkansing mogelijk.</p>}
              {examOverview.eligible && <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-primary hover:underline" href={examOverview.activeAttempt ? `/e-learnings/${course.slug}/eindtoets/${examOverview.activeAttempt.id}` : `/e-learnings/${course.slug}/eindtoets`}>{examOverview.activeAttempt ? 'Hervat eindtoets' : examOverview.attempts.length ? 'Eindtoets opnieuw proberen of resultaat bekijken' : 'Start eindtoets'}</Link>}
            </section>}
            {chapters.length > 1 && <nav aria-label={`Hoofdstukken van ${course.title}`} className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">{chapters.map((item) => {
              const itemProgress = item.progress[0]
              return <Link key={item.id} className="font-semibold text-brand-primary hover:underline" href={`/e-learnings/${course.slug}/leren/${item.slug}?${versionQuery}${itemProgress?.status === 'COMPLETED' ? '&opnieuw=1' : ''}`}>Hoofdstuk {item.position}: {item.title}{itemProgress?.status === 'COMPLETED' ? ' — Afgerond' : ''}</Link>
            })}</nav>}
          </div>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark" href={resumeHref}>{progress?.status === 'COMPLETED' ? 'Hoofdstuk opnieuw bekijken' : 'Verder waar u gebleven was'}</Link>
        </Card>
      })}
      {enrollments.length === 0 && <Card className="space-y-4"><h2 className="text-xl font-bold text-brand-dark">U bent nog niet gestart</h2><p>Bekijk het opleidingsaanbod en kies een e-learning om te beginnen.</p><Link className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark" href="/e-learnings/aanbod">Bekijk opleidingsaanbod</Link></Card>}
    </div>
  </Container>
}
