import { z } from 'zod'
import { notFound, redirect } from 'next/navigation'
import { getPrisma } from '@/lib/prisma'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { allowsAssignedPilot, isLocalPilot } from '@/lib/learning/learning-exam-runtime-version'
import { redeemPilot } from '@/lib/learning/academy-pilot-service'

export default async function PilotPage({ searchParams }: { searchParams: Promise<{ melding?: string }> }) {
  const path = '/e-learnings/pilot'
  if (!isLocalPilot()) notFound()
  const user = await requireLearningUser(path)
  const assignments = await getPrisma().learningPilotAssignment.findMany({
    where: { userId: user.id },
    include: { enrollment: true, courseVersion: { include: { course: true } } },
  })
  const visible = assignments.filter(({ courseVersion: v }) => allowsAssignedPilot(v.course.code, v.version))
  async function withdraw(data: FormData) {
    'use server'
    const current = await requireLearningUser('/e-learnings/pilot')
    if (!isLocalPilot() || data.get('confirm') !== 'ja') return
    const id = String(data.get('grant'))
    if (!z.uuid().safeParse(id).success) return
    const grant = await getPrisma().learningPilotAssignment.findFirst({
      where: { id, userId: current.id },
      include: { courseVersion: { include: { course: true } } },
    })
    if (
      grant?.enrollmentId &&
      allowsAssignedPilot(grant.courseVersion.course.code, grant.courseVersion.version)
    ) {
      await getPrisma().learningEnrollment.updateMany({
        where: {
          id: grant.enrollmentId,
          userId: current.id,
          status: { not: 'COMPLETED' },
          accessRevokedAt: null,
        },
        data: { accessRevokedAt: new Date() },
      })
    }
    redirect('/e-learnings/pilot?melding=gestopt')
  }
  async function redeem(data: FormData) {
    'use server'
    const student = await requireLearningUser('/e-learnings/pilot')
    const ok = await redeemPilot(
      student.id,
      String(data.get('versie')),
      String(data.get('code')).trim().toUpperCase(),
    )
    redirect(ok ? '/e-learnings/mijn' : '/e-learnings/pilot?melding=ongeldig')
  }
  const { melding } = await searchParams
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1>Mijn pilotuitnodigingen</h1>
      {melding === 'ongeldig' && (
        <p role="alert">De code is ongeldig of niet meer beschikbaar voor deze opleiding.</p>
      )}
      {melding === 'gestopt' && <p role="status">Uw afmelding is verwerkt.</p>}
      {!visible.some((g) => !g.enrollmentId) && <p>Er staan geen pilotuitnodigingen open.</p>}
      {visible
        .filter((g) => g.enrollment && !g.enrollment.accessRevokedAt && g.enrollment.status !== 'COMPLETED')
        .map((g) => (
          <details key={g.id}>
            <summary>Stoppen met {g.courseVersion.course.title}</summary>
            <form action={withdraw}>
              <input type="hidden" name="grant" value={g.id} />
              <label>
                <input type="checkbox" value="ja" name="confirm" required /> Ik wil mijn pilotdeelname en
                toegang tot deze opleiding beëindigen.
              </label>
              <button>Afmelding bevestigen</button>
            </form>
          </details>
        ))}
      {visible
        .filter((g) => !g.enrollmentId)
        .map(({ id, courseVersion: v }) => (
          <form action={redeem} key={id} className="space-y-3 rounded border p-4">
            <h2>
              {v.course.title} · {v.version}
            </h2>
            <p>100% pilotkorting. Te betalen €0,00.</p>
            <p>
              Voor deze pilot registreert Academy activiteit per les, oefenvraag en toetspoging. De begeleider
              ziet de geschatte studieduur en eventuele meetonderbrekingen. Tijdens de opleiding kunt u de
              meting pauzeren.
            </p>
            <input type="hidden" name="versie" value={v.id} />
            <label>
              Persoonlijke pilotcode <input name="code" required maxLength={26} />
            </label>
            <button type="submit">Kosteloos inschrijven</button>
          </form>
        ))}
    </main>
  )
}
