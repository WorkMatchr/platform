import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { availableAcademyCourses } from '@/lib/learning/academy-catalog-service'
export default async function LearningCatalogPage() {
 const user=await requireLearningUser('/e-learnings/aanbod')
 const courses=await availableAcademyCourses(user.id)
 return <Container className="py-10 sm:py-14"><p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-primary">E-learnings</p><h1 className="text-3xl font-bold text-brand-dark sm:text-4xl">Opleidingsaanbod</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-text-secondary">Praktische opleidingen voor een veilige en gezonde werkplek.</p><div className="mt-8 grid gap-5 md:grid-cols-2">{courses.map(course=><Card key={course.id} className="flex flex-col gap-4">{course.details?.image&&<Image src={course.details.image} alt="" width={1200} height={800} className="h-auto w-full rounded-control" unoptimized/>}<p className="text-sm font-semibold text-brand-primary">{course.code} · {course.details?`${course.details.category} · ${course.details.level}`:'Prototypecontent'}</p><h2 className="text-xl font-bold text-brand-dark">{course.title}</h2><p className="leading-7 text-text-secondary">{course.description}</p><p>{course.minutes} minuten lesinhoud · {course.chapters} {course.chapters===1?'hoofdstuk':'hoofdstukken'} · versie {course.version}</p><p className="font-semibold">{course.priceCents===0?'Gratis':new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(course.priceCents/100)}</p><Link className="mt-auto inline-flex min-h-11 items-center self-start rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark" href={course.enrolled?`/e-learnings/${course.slug}`:'/e-learnings/aankopen/nieuw'}>{course.enrolled?'Open uw opleiding':'Inschrijven'}</Link></Card>)}</div>{!courses.length&&<p className="mt-8">Er zijn nog geen e-learnings beschikbaar.</p>}</Container>
}
