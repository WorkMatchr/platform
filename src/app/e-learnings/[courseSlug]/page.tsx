import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { startLearningCourseAction } from '@/app/e-learnings/actions'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getPublishedLearningCourse } from '@/lib/learning/learning-query-service'
import { getFinalExamOverview } from '@/lib/learning/learning-final-exam-service'

export default async function LearningCoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params
  const user = await requireLearningUser(`/e-learnings/${courseSlug}`)
  const [course, examOverview] = await Promise.all([
    getPublishedLearningCourse(courseSlug, user.id),
    getFinalExamOverview(user.id, courseSlug),
  ])
  if (!course) notFound()
  const version = course.versions[0]
  const enrollment = version?.enrollments[0]
  const chapters = version?.chapters ?? []
  const continueChapter = chapters.find((chapter) => chapter.progress[0]?.status === 'IN_PROGRESS')
    ?? chapters.find((chapter) => chapter.progress[0]?.status !== 'COMPLETED')
    ?? chapters.at(-1)
  const progress = continueChapter?.progress[0]
  const isStarted = Boolean(enrollment && enrollment.status !== 'NOT_STARTED')

  return <Container className="py-10 sm:py-14">
    <Link className="text-sm font-semibold text-brand-primary hover:underline" href="/e-learnings/aanbod">← Opleidingsaanbod</Link>
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <article className="max-w-3xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-primary">{course.code} · Prototypecontent</p>
        <h1 className="text-3xl font-bold text-brand-dark sm:text-4xl">{course.title}</h1>
        <p className="mt-4 text-lg leading-8 text-text-secondary">{course.description}</p>
        <section className="mt-8" aria-labelledby="available-chapters">
          <h2 id="available-chapters" className="mb-3 text-xl font-bold text-brand-dark">Beschikbare hoofdstukken</h2>
          <ul className="space-y-3">
            {chapters.map((chapter) => {
              const chapterProgress = chapter.progress[0]
              const firstBlockData = chapter.contentBlocks[0]?.data
              const durationLabel = firstBlockData && typeof firstBlockData === 'object' && !Array.isArray(firstBlockData)
                && 'estimatedDurationLabel' in firstBlockData && typeof firstBlockData.estimatedDurationLabel === 'string'
                ? firstBlockData.estimatedDurationLabel
                : `Circa ${chapter.estimatedMinutes} minuten`
              const href = `/e-learnings/${course.slug}/leren/${chapter.slug}?version=${encodeURIComponent(version.version)}${chapterProgress?.status === 'COMPLETED' ? '&opnieuw=1' : ''}`
              return <li key={chapter.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
                <div><p className="font-semibold text-brand-dark">Hoofdstuk {chapter.position} · {chapter.title}</p><p className="mt-1 text-sm text-text-secondary">{durationLabel}</p></div>
                {isStarted
                  ? <Link className="inline-flex min-h-11 items-center rounded-control border border-border px-4 font-semibold text-brand-primary" href={href}>{chapterProgress?.status === 'COMPLETED' ? 'Opnieuw bekijken' : chapterProgress?.status === 'IN_PROGRESS' ? 'Verdergaan' : 'Open hoofdstuk'}</Link>
                  : <form action={startLearningCourseAction}><input type="hidden" name="courseSlug" value={course.slug} /><input type="hidden" name="chapterSlug" value={chapter.slug} /><button type="submit" className="inline-flex min-h-11 items-center rounded-control border border-border px-4 font-semibold text-brand-primary">Start hoofdstuk {chapter.position}</button></form>}
              </li>
            })}
          </ul>
          {chapters.some((chapter) => chapter.position === 3) && !chapters.some((chapter) => chapter.position === 2)
            && <p className="mt-3 text-sm leading-6 text-text-secondary">Hoofdstuk 2 is nog in ontwikkeling. Hoofdstuk 3 blijft hoofdstuk 3 in de cursusvolgorde.</p>}
        </section>
        <p className="mt-8 rounded-card border border-warning/30 bg-warning/10 p-4 text-sm leading-6">Deze cursus bevat prototypecontent die nog inhoudelijk en juridisch wordt beoordeeld. De cursus is geen certificering of professionele kwalificatie.</p>
      </article>
      <aside><Card className="space-y-4">
        <p className="text-sm font-semibold text-brand-primary">{course.code} · {version?.version ?? 'Prototype'}</p>
        <h2 className="text-xl font-bold text-brand-dark">Uw voortgang</h2>
        {isStarted && continueChapter && <p className="text-sm leading-6">Hoofdstuk {continueChapter.position} · {progress?.status === 'COMPLETED' ? 'afgerond' : `${progress?.progressPercentage ?? 0}% doorlopen`}</p>}
        {isStarted && continueChapter
          ? <Link className="flex min-h-11 items-center justify-center rounded-control bg-brand-primary px-4 text-center font-semibold text-text-on-dark" href={`/e-learnings/${course.slug}/leren/${continueChapter.slug}?version=${encodeURIComponent(version?.version ?? '')}${progress?.status === 'COMPLETED' ? '&opnieuw=1' : ''}`}>{progress?.status === 'COMPLETED' ? 'Hoofdstuk opnieuw bekijken' : 'Verder waar u gebleven was'}</Link>
          : <form action={startLearningCourseAction}><input type="hidden" name="courseSlug" value={course.slug} /><button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-brand-primary px-4 font-semibold text-text-on-dark">Start deze e-learning</button></form>}
        {examOverview?.eligible && <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-brand-primary px-4 text-center font-semibold text-brand-primary" href={examOverview.activeAttempt ? `/e-learnings/${course.slug}/eindtoets/${examOverview.activeAttempt.id}` : `/e-learnings/${course.slug}/eindtoets`}>{examOverview.activeAttempt ? 'Hervat eindtoets' : examOverview.attempts.some((attempt) => attempt.passed) ? 'Bekijk uw eindtoets' : 'Start eindtoets'}</Link>}
        <Link className="block text-center text-sm font-semibold text-brand-primary hover:underline" href="/e-learnings/mijn">Mijn e-learnings</Link>
      </Card></aside>
    </div>
  </Container>
}
