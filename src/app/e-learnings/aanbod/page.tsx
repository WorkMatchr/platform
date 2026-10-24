import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getPublishedLearningCourses } from '@/lib/learning/learning-query-service'

export default async function LearningCatalogPage() {
  const user = await requireLearningUser('/e-learnings/aanbod')
  const courses = await getPublishedLearningCourses(user.id)
  return <Container className="py-10 sm:py-14"><p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-primary">E-learnings</p><h1 className="text-3xl font-bold text-brand-dark sm:text-4xl">Opleidingsaanbod</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-text-secondary">Ontdek praktische kennis voor een veilige en gezonde werkplek.</p><div className="mt-8 grid gap-5 md:grid-cols-2">{courses.map((course) => { const version = course.versions[0]; const minutes = version?.chapters.reduce((total, chapter) => total + chapter.estimatedMinutes, 0) ?? 0; const enrollment = version?.enrollments[0]; return <Card key={course.id} className="flex flex-col gap-4"><p className="text-sm font-semibold text-brand-primary">{course.code} · Prototypecontent</p><h2 className="text-xl font-bold text-brand-dark">{course.title}</h2><p className="leading-7 text-text-secondary">{course.description}</p><ul className="space-y-1 text-sm"><li>{minutes} minuten indicatief voor de beschikbare hoofdstukken</li><li>{version?.chapters.length ?? 0} {version?.chapters.length === 1 ? 'hoofdstuk' : 'hoofdstukken'} beschikbaar</li><li>Oefenvragen met directe uitleg</li></ul><Link className="mt-auto inline-flex min-h-11 items-center self-start rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark" href={`/e-learnings/${course.slug}`}>{enrollment?.status === 'IN_PROGRESS' ? 'Verder waar u gebleven was' : 'Bekijk opleiding'}</Link></Card>})}</div>{courses.length === 0 && <p className="mt-8 rounded-card border border-border bg-surface p-5">Er zijn nog geen e-learnings beschikbaar.</p>}</Container>
}
