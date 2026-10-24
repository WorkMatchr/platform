import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getPrisma } from '@/lib/prisma'
import { saveCertificateNameAction } from '../actions'
import { ensureCertificateForPassedExam } from '@/lib/learning/learning-certificate-service'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Naam voor uw certificaat | WorkMatchr', robots: { index: false, follow: false } }

export default async function CertificateNamePage({ searchParams }: { searchParams: Promise<{ melding?: string }> }) {
  const user = await requireLearningUser('/e-learnings/certificaat/gegevens')
  const certificateState = await ensureCertificateForPassedExam(user.id)
  if (!certificateState.needsName) redirect('/e-learnings/mijn')
  const [profile, query] = await Promise.all([
    getPrisma().learningProfile.findUnique({ where: { userId: user.id }, select: { firstName: true, lastName: true } }),
    searchParams,
  ])
  return <Container className="py-10 sm:py-14">
    <Card className="mx-auto max-w-xl space-y-5">
      <div><p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">WorkMatchr Learning</p><h1 className="mt-2 text-3xl font-bold text-brand-dark">Naam voor uw certificaat</h1></div>
      <p className="leading-7 text-text-secondary">Vul de naam in zoals u die op uw certificaat wilt terugzien. Deze naam wordt bij uitgifte vastgelegd.</p>
      {query.melding && <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm">Vul zowel uw voornaam als achternaam in; beide mogen maximaal 100 tekens bevatten.</p>}
      <form action={saveCertificateNameAction} className="space-y-4">
        <div className="space-y-1"><label htmlFor="firstName" className="font-medium">Voornaam</label><input id="firstName" name="firstName" autoComplete="given-name" required maxLength={100} defaultValue={profile?.firstName ?? ''} className="min-h-11 w-full rounded-control border border-border px-3" /></div>
        <div className="space-y-1"><label htmlFor="lastName" className="font-medium">Achternaam</label><input id="lastName" name="lastName" autoComplete="family-name" required maxLength={100} defaultValue={profile?.lastName ?? ''} className="min-h-11 w-full rounded-control border border-border px-3" /></div>
        <div className="flex flex-wrap gap-3"><button className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark" type="submit">Naam opslaan</button><Link className="inline-flex min-h-11 items-center font-semibold text-brand-primary hover:underline" href="/e-learnings/mijn">Terug naar Mijn e-learnings</Link></div>
      </form>
    </Card>
  </Container>
}
