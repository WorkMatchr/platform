import Link from 'next/link'
import { readAcademyCourseResults } from '@/lib/learning/academy-course-results'

export default async function CourseVersionPage({ params, searchParams }: {
  params: Promise<{ versionId: string }>, searchParams: Promise<{ pagina?: string }>
}) {
  const { versionId } = await params
  const page = Number((await searchParams).pagina ?? 1)
  const version = await readAcademyCourseResults(versionId, page)
  const base = `/platformbeheer/academy/cursussen/${versionId}`
  return <section className="min-w-0 space-y-5">
    <Link href="/platformbeheer/academy/cursussen" className="underline">Alle cursussen</Link>
    <h1 className="text-2xl font-bold">{version.course.title} · {version.version}</h1>
    <h2 className="text-xl font-semibold">Deelnemers en resultaten ({version._count.enrollments})</h2>
    {!version.enrollments.length && <p>Geen inschrijvingen op deze pagina.</p>}
    {version.enrollments.map(enrollment => <article key={enrollment.id} className="space-y-2 rounded-card border border-border p-4">
      <h3 className="font-semibold">{enrollment.user.displayName || 'Deelnemer zonder weergavenaam'}</h3>
      <details><summary>Voortgang per hoofdstuk</summary><ul>{version.chapters.map(chapter => <li key={chapter.id}>
        {chapter.title} · {enrollment.progress.find(progress => progress.chapterId === chapter.id)?.progressPercentage ?? 0}%
      </li>)}</ul></details>
      {enrollment.examAttempts.length === 0 && <p>Nog geen ingeleverde eindtoets.</p>}
      {enrollment.examAttempts.map(attempt => <p key={attempt.attemptNumber}>Poging {attempt.attemptNumber} · {attempt.score}/{attempt.maxScore} · {attempt.passed ? 'Geslaagd' : 'Niet geslaagd'}</p>)}
      {enrollment.certificates.map(cert => <p key={cert.certificateNumber} className="break-words">
        {cert.firstName} {cert.lastName} · {cert.status === 'ACTIVE' ? 'Geldig' : 'Ingetrokken'} · <Link prefetch={false} className="underline" href={`/certificaat/${cert.certificateNumber}`}>Controleer certificaat {cert.certificateNumber}</Link>
      </p>)}
    </article>)}
    <nav aria-label="Deelnemerspagina’s" className="flex gap-4">
      {page > 1 && <Link className="underline" href={`${base}?pagina=${page - 1}`}>Vorige deelnemers</Link>}
      {page * 25 < version._count.enrollments && <Link className="underline" href={`${base}?pagina=${page + 1}`}>Volgende deelnemers</Link>}
    </nav>
  </section>
}
