import { getPrisma } from '@/lib/prisma'
import { requireAuthor } from '@/lib/learning/academy-authoring-service'
import { pilotDistribution } from '@/lib/learning/academy-pilot-time'

const minutes = (ms: number) =>
  new Intl.NumberFormat('nl', { maximumFractionDigits: 1 }).format(ms / 60000) + ' min'
const date = (d: Date | null | undefined) =>
  d?.toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' }) ?? '—'
export async function PilotResults({ versionId, chapterCount }: { versionId: string; chapterCount: number }) {
  await requireAuthor()
  const grants = await getPrisma().learningPilotAssignment.findMany({
    where: { courseVersionId: versionId },
    include: {
      durations: true,
      user: { select: { displayName: true } },
      discountCode: {
        select: {
          id: true,
          percentageBps: true,
          purchases: {
            select: {
              id: true,
              status: true,
              invoice: { select: { invoiceNumber: true, jorttSync: { select: { status: true } } } },
            },
          },
        },
      },
      enrollment: {
        include: {
          examAttempts: { orderBy: { attemptNumber: 'asc' } },
          certificates: { select: { status: true } },
          progress: { where: { status: 'COMPLETED' }, select: { id: true } },
        },
      },
    },
  })
  const rows = grants.map((g) => {
    const e = g.enrollment
    const times = new Map(g.durations.map((d) => [d.context, d.activeMs]))
    const chapters = Array.from({ length: chapterCount }, (_, i) => ({
      nr: i + 1,
      lesson: times.get('les:' + (i + 1)) ?? 0,
      practice: times.get('oefening:' + (i + 1)) ?? 0,
    }))
    const lesson = chapters.reduce((s, c) => s + c.lesson, 0),
      practice = chapters.reduce((s, c) => s + c.practice, 0)
    const first = times.get('exam:1') ?? 0,
      total = lesson + practice + first
    const full = Boolean(
      e?.completedAt && first && !g.gaps && chapters.every((c) => c.lesson > 0 && c.practice > 0),
    )
    return { g, e, times, chapters, lesson, practice, first, total, full }
  })
  const complete = rows.filter(r => r.full && !r.g.measurementsPurgedAt)
  const stats = complete.length >= 3 ? pilotDistribution(complete.map(r => r.total)) : null
  return (
    <section className="space-y-3 rounded border p-4">
      <h2>Studieduurpilot</h2>
      <p>
        {rows.length} aangewezen voor deze versie · {rows.filter((r) => r.e?.startedAt).length} begonnen ·{' '}
        {rows.filter((r) => r.e?.completedAt).length} afgerond ·{' '}
        {rows.filter((r) => r.e?.accessRevokedAt && !r.e.completedAt).length} voortijdig beëindigd ·{' '}
        {rows.filter((r) => r.e?.startedAt && !r.full).length} onvolledige metingen.
      </p>
      <p>
        Actieve tijd is een schatting op basis van geobserveerde interacties. Het groepsoverzicht gebruikt
        afgeronde metingen met les- en oefentijd in elk hoofdstuk, tijd in de eerste toets en zonder
        geconstateerde meetonderbreking.
      </p>
      <p>
        {stats
          ? 'Gemiddeld ' +
            Math.round(stats.mean / 900000) * 15 + ' minuten (afgerond op een kwartier)'
          : 'Een groepsgemiddelde verschijnt vanaf drie volledige metingen.'}
      </p>
      {rows.map(({ g, e, times, chapters, lesson, practice, first, total, full }) => (
        g.measurementsPurgedAt ? <p key={g.id}>De individuele pilotmeting is verwijderd.</p> : <details key={g.id}>
          <summary>
            {g.user.displayName || 'Cursist'} · {e?.progress.length ?? 0}/{chapterCount} hoofdstukken
          </summary>
          <p>
            Korting {g.discountCode.percentageBps! / 100}% · Codereferentie {g.discountCode.id} ·{' '}
            {g.redeemedAt ? 'ingewisseld op ' + date(g.redeemedAt) : 'ongebruikt'}
          </p>
          {g.paidSlot && (
            <div>
              <p>
                Offline studieduur{' '}
                {g.offlineMinutes === null ? 'nog niet ingevuld' : g.offlineMinutes + ' min'}.
              </p>
              {g.feedback && typeof g.feedback === 'object' && (
                <ul>
                  {Object.entries(g.feedback).map(([topic, value]) => (
                    <li key={topic}>
                      {topic}: {String(value)}
                    </li>
                  ))}
                </ul>
              )}
              {g.discountCode.purchases.map((p) => (
                <p key={p.id}>
                  Betaling {p.status} · factuur {p.invoice?.invoiceNumber ?? 'nog niet beschikbaar'} · Jortt{' '}
                  {p.invoice?.jorttSync?.status ?? 'nog niet ontvangen'}
                </p>
              ))}
            </div>
          )}
          <p>
            Start {date(e?.startedAt)} · afronding {date(e?.completedAt)} · certificaat{' '}
            {e?.certificates.some((c) => c.status === 'ACTIVE') ? 'geldig' : 'geen geldig certificaat'}.
          </p>
          <p>
            Les {minutes(lesson)} · oefenen {minutes(practice)} · eerste toets {minutes(first)} · totaal
            inclusief eerste toets {minutes(total)} ({full ? 'schatting' : 'onvolledig'}).
          </p>
          <p>
            {g.pauses} afgesloten meetperioden · {g.gaps} meetonderbrekingen. Onderbreking tussen meetperioden
            circa{' '}
            {minutes(
              g.durations.filter((d) => d.context.startsWith('pauze:')).reduce((s, d) => s + d.activeMs, 0),
            )}
            , onverklaarde tussenruimte circa{' '}
            {minutes(
              g.durations
                .filter((d) => d.context.startsWith('onbekend:'))
                .reduce((s, d) => s + d.activeMs, 0),
            )}
            . Tijd na de eerste toets staat buiten het totaal.
          </p>
          <ul>
            {chapters.map((c) => (
              <li key={c.nr}>
                H{c.nr} · les {minutes(c.lesson)} · oefenen {minutes(c.practice)}
              </li>
            ))}
          </ul>
          <ul>
            {e?.examAttempts.map((a) => (
              <li key={a.id}>
                {a.attemptNumber === 1 ? 'Eerste toets' : 'Herkansing ' + (a.attemptNumber - 1)} ·{' '}
                {a.submittedAt ? a.score + '/' + a.maxScore : 'open'} ·{' '}
                {minutes(times.get('exam:' + a.attemptNumber) ?? 0)}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  )
}
