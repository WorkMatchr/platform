import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getPublishedLearningCourses } from '@/lib/learning/learning-query-service'

export default async function LearningHomePage() {
  const user = await requireLearningUser('/e-learnings')
  const courses = await getPublishedLearningCourses(user.id)
  return (
    <Container className="py-10 sm:py-14">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-primary">E-learnings</p>
      <h1 className="text-3xl font-bold text-brand-dark sm:text-4xl">Leren over arbo en veiligheid</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-text-secondary">Korte, praktische opleidingen die u helpen risico’s te herkennen en er planmatig mee aan de slag te gaan.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark" href="/e-learnings/aanbod">Bekijk opleidingsaanbod</Link><Link className="inline-flex min-h-11 items-center rounded-control border border-border px-5 font-semibold text-brand-dark" href="/e-learnings/mijn">Mijn e-learnings</Link></div>
      <section className="mt-12" aria-labelledby="featured-title"><h2 id="featured-title" className="mb-5 text-2xl font-bold text-brand-dark">Beschikbaar opleidingsaanbod</h2><div className="grid gap-5 md:grid-cols-2">{courses.map((course) => {
        const version = course.versions[0]
        const enrollment = version?.enrollments[0]
        const chapter = version?.chapters[0]
        const progress = chapter?.progress[0]
        return <Card key={course.id} className="flex flex-col gap-4"><p className="text-sm font-semibold text-brand-primary">{course.code} · Prototype</p><h3 className="text-xl font-bold text-brand-dark">{course.title}</h3><p className="leading-7 text-text-secondary">{course.description}</p><div className="mt-auto flex items-center justify-between gap-3 pt-2 text-sm"><span>{chapter?.estimatedMinutes ?? 10} minuten · {version?.chapters.length ?? 1} hoofdstuk beschikbaar</span><Link className="font-semibold text-brand-primary hover:underline" href={`/e-learnings/${course.slug}`}>{enrollment?.status === 'IN_PROGRESS' && progress?.status === 'IN_PROGRESS' ? 'Verder leren' : 'Bekijk opleiding'}</Link></div></Card>
      })}</div>{courses.length === 0 && <p className="rounded-card border border-border bg-surface p-5">Er zijn nog geen e-learnings beschikbaar.</p>}</section>
    </Container>
  )
}
