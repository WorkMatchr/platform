import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AnnualRetentionPlayer } from '@/components/learning/annual-retention-player'
import { Card } from '@/components/ui/card'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getMyAnnualRetentionCheck } from '@/lib/learning/learning-retention-annual-service'

export default async function AnnualRetentionCheckPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params
  if (courseSlug !== 'rie-in-de-praktijk') notFound()
  const user = await requireLearningUser(`/e-learnings/${courseSlug}/kennisbehoud/jaarlijks`)
  const check = await getMyAnnualRetentionCheck(user.id)
  if (!check) return <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-10 sm:px-6">
    <h1 className="text-3xl font-bold text-brand-dark">Jaarlijkse kennischeck</h1>
    <Card className="space-y-4"><p>Er staat nu geen jaarlijkse kennischeck voor u klaar.</p><Link className="inline-flex min-h-11 items-center font-semibold text-brand-primary hover:underline" href="/e-learnings/mijn">Terug naar Mijn e-learnings</Link></Card>
  </main>

  if (check.completedAt && check.result) return <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-10 sm:px-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">RI&E in de praktijk</p>
    <h1 className="text-3xl font-bold text-brand-dark">Jaarlijkse kennischeck afgerond</h1>
    <Card className="space-y-5">
      <p className="text-lg font-semibold text-brand-dark">{check.score} van 10 goed</p>
      <p className="text-text-secondary">{check.result.interpretation}</p>
      {check.result.strongAreas.length > 0 && <section aria-labelledby="annual-strong-title" className="space-y-2">
        <h2 id="annual-strong-title" className="font-semibold text-brand-dark">Sterke kennisgebieden</h2>
        <ul className="list-inside list-disc text-sm leading-6 text-text-secondary">{check.result.strongAreas.map((area) => <li key={area}>{area}</li>)}</ul>
      </section>}
      {check.result.attentionAreas.length > 0 && <section aria-labelledby="annual-review-title" className="space-y-2">
        <h2 id="annual-review-title" className="font-semibold text-brand-dark">Opnieuw bekijken</h2>
        <ul className="space-y-2">{check.result.chapterLinks.map((item) => <li key={`${item.knowledgeArea}-${item.href}`}><Link className="font-semibold text-brand-primary underline underline-offset-2" href={item.href}>{item.knowledgeArea} — {item.chapterTitle} opnieuw bekijken</Link></li>)}</ul>
      </section>}
      <p className="text-sm leading-6 text-text-secondary">Deze korte kennischeck is bedoeld om kennis op te frissen en is geen beoordeling van professionele bevoegdheid.</p>
      <Link className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark" href="/e-learnings/mijn">Terug naar Mijn e-learnings</Link>
    </Card>
  </main>

  return <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-10 sm:px-6">
    <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">RI&E in de praktijk</p>
    <h1 className="text-3xl font-bold text-brand-dark">Jaarlijkse kennischeck</h1>
    <p className="text-text-secondary">Tien korte vragen om uw kennis op te frissen. Dit is geen examen.</p>
    <AnnualRetentionPlayer check={check} />
    <Link className="inline-flex min-h-11 items-center font-semibold text-brand-primary hover:underline" href="/e-learnings/mijn">Kennischeck verlaten</Link>
  </main>
}
