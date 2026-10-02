import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Section } from '@/components/layout/section'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'
import { findRoadmapLearningCourse, publicLearningHref, roadmapLearningCourses } from '@/content/public-learning-catalog'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false
export function generateStaticParams() {
  return roadmapLearningCourses.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = findRoadmapLearningCourse((await params).slug)
  if (!course) notFound()
  const title = `${course.title} — in ontwikkeling | WorkMatchr`
  const description = `${course.description} Online opleiding voor ${course.audience.toLowerCase()}. In ontwikkeling.`
  const canonical = publicLearningHref(course)
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical } }
}

export default async function RoadmapLearningPage({ params }: Props) {
  const course = findRoadmapLearningCourse((await params).slug)
  if (!course) notFound()
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'E-learning', href: '/e-learning#aanbod' }, { label: course.title }]} eyebrow={course.status} title={course.title} description={course.description} heroActions={<div className="space-y-4">
      <dl className="space-y-2 text-text-secondary" aria-label="Opleidingsgegevens">
        <div><dt className="inline font-semibold">Doelgroep: </dt><dd className="inline">{course.audience}</dd></div>
        <div><dt className="inline font-semibold">Indicatieve duur: </dt><dd className="inline">{course.duration}</dd></div>
        <div><dt className="sr-only">Reguliere prijzen</dt><dd>{course.individualPrice} per deelnemer · {course.teamPrice} voor 5 deelnemers</dd></div>
      </dl>
      <Text size="sm" className="text-text-secondary">De opleiding is nog niet beschikbaar voor inschrijving.</Text>
      <LinkButton href="#opzet">Bekijk de opleidingsopzet</LinkButton>
    </div>}>
    <Section spacing="compact" containerClassName="grid gap-6 md:grid-cols-2">
      <Card><Heading as="h2" size="h2">Voor wie?</Heading><Text className="mt-4 text-text-secondary">{course.audience}</Text></Card>
      <Card variant="subtle"><Heading as="h2" size="h2">Online, in uw eigen tempo</Heading><Text className="mt-4 text-text-secondary">Indicatieve duur: {course.duration.toLowerCase()}. De opleiding wordt ontwikkeld om zelfstandig online te volgen.</Text></Card>
    </Section>
    <Section id="opzet" spacing="compact" className="bg-surface" aria-labelledby="topics-title">
      <Heading as="h2" size="h2" id="topics-title">Voorlopige opleidingsopzet</Heading>
      <Text className="mt-4 max-w-3xl text-text-secondary">Deze onderwerpen zijn voorzien. De definitieve inhoud wordt vastgesteld tijdens de ontwikkeling.</Text>
      <ul className="mt-6 grid list-disc gap-x-10 gap-y-3 pl-5 text-text-secondary md:grid-cols-2">{course.topics.map(topic => <li key={topic}>{topic}</li>)}</ul>
    </Section>
    <Section spacing="compact" aria-labelledby="outcomes-title">
      <Heading as="h2" size="h2" id="outcomes-title">Wat leert u?</Heading>
      <Text className="mt-4 max-w-3xl text-text-secondary">Dit zijn de beoogde leeruitkomsten. Deze kunnen tijdens de ontwikkeling nog worden aangescherpt.</Text>
      <ul className="mt-4 max-w-3xl list-disc space-y-3 pl-5 text-text-secondary">{course.outcomes.map(outcome => <li key={outcome}>{outcome}</li>)}</ul>
      {course.disclaimer && <Card variant="subtle" className="mt-6 max-w-3xl"><Heading as="h3" size="h3">Wat biedt deze opleiding?</Heading><Text className="mt-3 text-text-secondary">{course.disclaimer}</Text></Card>}
    </Section>
    <Section spacing="compact" className="bg-surface" aria-labelledby="development-title">
      <Heading as="h2" size="h2" id="development-title">In ontwikkeling</Heading>
      <Text className="mt-4 max-w-3xl text-text-secondary">Deze WorkMatchr-opleiding is in ontwikkeling. De inhoud en opbouw kunnen tijdens de ontwikkeling nog worden aangescherpt. De definitieve toets- en certificaatvorm wordt tijdens de ontwikkeling vastgesteld.</Text>
      <Text className="mt-4 max-w-3xl text-text-secondary">De onderstaande reguliere prijzen zijn aangekondigd. Deelname is nog niet mogelijk.</Text>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card><Heading as="h3" size="h3">Individueel</Heading><Text className="mt-3 text-2xl font-bold">{course.individualPrice}</Text><Text className="mt-3">Per deelnemer.</Text></Card>
        <Card><Heading as="h3" size="h3">Samen leren</Heading><Text className="mt-3 text-2xl font-bold">{course.teamPrice}</Text><Text className="mt-3">Voor 5 deelnemers.</Text></Card>
      </div>
      <LinkButton href="/e-learning#aanbod" variant="outline" className="mt-6">Terug naar alle opleidingen</LinkButton>
    </Section>
  </PublicPageLayout>
}
