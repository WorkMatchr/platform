import { findAcademyCourseByAttempt } from '@/lib/learning/academy-course-service'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getFinalExamResult } from '@/lib/learning/learning-final-exam-service'
import { ensureCertificateForPassedExam, getMyLearningCertificate } from '@/lib/learning/learning-certificate-service'

export default async function FinalExamResultPage({ params }: { params: Promise<{ courseSlug: string; attemptId: string }> }) {
  const { courseSlug, attemptId } = await params
  const user = await requireLearningUser(`/e-learnings/${courseSlug}/eindtoets/resultaat/${attemptId}`)
  const course = await findAcademyCourseByAttempt(user.id, attemptId)
  if (!course || course.slug !== courseSlug) notFound()
  const result = await getFinalExamResult(user.id, attemptId)
  if (!result) notFound()
  if (result.passed) await ensureCertificateForPassedExam(user.id, course.code, course.courseVersionId)
  const certificate = result.passed ? await getMyLearningCertificate(user.id, course.code, course.courseVersionId) : null

  return <Container className="py-10 sm:py-14">
    <Card className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">Poging {result.attemptNumber}</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-dark">{result.passed ? 'Eindtoets behaald' : 'Eindtoets nog niet behaald'}</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <p><span className="block text-sm text-text-secondary">Score</span><strong className="text-2xl">{result.score} van {result.maxScore}</strong></p>
        <p><span className="block text-sm text-text-secondary">Resultaat</span><strong className="text-2xl">{result.percentage}%</strong></p>
        <p><span className="block text-sm text-text-secondary">Status</span><strong>{result.passed ? 'Geslaagd' : 'Niet geslaagd'}</strong></p>
      </div>
      {!result.passed && result.knowledgeAreas.length > 0 && <section aria-labelledby="review-areas-title">
        <h2 id="review-areas-title" className="text-lg font-bold text-brand-dark">Onderwerpen om opnieuw te bekijken</h2>
        <ul className="mt-3 space-y-2">{result.knowledgeAreas.map((area) => <li key={area.knowledgeArea} className="rounded-card border border-border p-3">
          <p className="font-semibold">{area.knowledgeArea}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">{area.chapters.map((chapterNumber) => <Link key={chapterNumber} className="font-medium text-brand-primary hover:underline" href={`/e-learnings/${courseSlug}#hoofdstuk-${chapterNumber}`}>Hoofdstuk {chapterNumber}</Link>)}</div>
        </li>)}</ul>
        <p className="mt-3 text-sm leading-6 text-text-secondary">De toets toont geen antwoorden per vraag. Gebruik deze onderwerpen als richting voor herhaling.</p>
      </section>}
      {result.passed && <div className="space-y-3 rounded-card border border-success/30 bg-success/10 p-4 leading-6"><p>U heeft de eindtoets behaald. Dit resultaat is geen beroepskwalificatie of certificering als arbokerndeskundige.</p>{certificate ? <Link className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-4 font-semibold text-text-on-dark" href={`/api/learning/certificates/${certificate.id}/pdf`}>Certificaat downloaden</Link> : <p>Vul uw voor- en achternaam in om uw certificaat uit te geven. <Link className="font-semibold text-brand-primary underline" href={`/e-learnings/certificaat/gegevens?course=${encodeURIComponent(course.code)}&version=${course.courseVersionId}`}>Naam invullen</Link></p>}</div>}
      {!result.passed && <p className="text-sm text-text-secondary">Uw eerdere poging blijft in uw poginghistorie staan. Op de eindtoetspagina ziet u of een nieuwe poging beschikbaar is.</p>}
      <div className="flex flex-wrap gap-3">
        <Link href={`/e-learnings/${courseSlug}/eindtoets`} className="inline-flex min-h-11 items-center rounded-control border border-border px-4 font-semibold text-brand-primary">Terug naar eindtoets</Link>
        <Link href="/e-learnings/mijn" className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-4 font-semibold text-text-on-dark">Mijn e-learnings</Link>
      </div>
    </Card>
  </Container>
}
