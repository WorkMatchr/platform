import { requireUser } from '@/lib/authorization'
import { getPrisma } from '@/lib/prisma'

export default async function AcademyPurchases() {
  const user = await requireUser('/account/academy-aankopen')
  const purchases = await getPrisma().financialPurchase.findMany({ where: {
    kind: 'ACADEMY_COURSE', createdByUserId: user.id, organizationId: null, paidAt: { not: null },
  }, orderBy: { paidAt: 'desc' }, select: { id: true, paidAt: true, packageLabel: true, billingOrganizationName: true,
    events: { where: { eventType: 'ACADEMY_WITHDRAWAL_RECEIVED' }, select: { id: true } },
    refunds: { select: { status: true, creditNote: { select: { id: true, invoiceNumber: true } } } },
  } })
  return <main className="mx-auto max-w-3xl space-y-5 p-6">
    <h1>Mijn particuliere Academy-aankopen</h1>
    {!purchases.length && <p>U heeft geen betaalde particuliere Academy-aankopen.</p>}
    {purchases.map(p => {
      const receipt = '/account/academy-aankopen/' + p.id + '/herroeping'
      return <section className="space-y-3 rounded border p-4" key={p.id}>
        <h2>{p.packageLabel}</h2>
        <p>Betaald op {p.paidAt?.toLocaleDateString('nl-NL', {timeZone:'Europe/Amsterdam'})}</p>
        {p.events.length ? <>
          <p role="status">Uw herroeping is ontvangen.</p>
          <a href={receipt} download>Ontvangstbewijs downloaden</a>
          <p>{p.refunds.some(r => r.status === 'REFUNDED') ? 'De terugbetaling is bevestigd.' : 'De terugbetaling wordt behandeld.'}</p>
          {p.refunds.map(r => r.creditNote && <a key={r.creditNote.id} href={'/e-learnings/pilot/facturen/' + r.creditNote.id}>Creditnota {r.creditNote.invoiceNumber} downloaden</a>)}
        </> : <details>
          <summary>Overeenkomst herroepen</summary>
          <form action={receipt} method="post" className="space-y-3">
            <p>Ik, {p.billingOrganizationName}, herroep de aankoop van {p.packageLabel}. Bij bevestiging ontvangt u het ontvangstbewijs direct als tekstbestand. Een kopie blijft in dit account beschikbaar.</p>
            <p>Bij tijdige herroeping van de pilot krijgt u €1,49 terug, ook als u al begonnen of geslaagd bent.</p>
            <button type="submit">Herroeping bevestigen</button>
          </form>
        </details>}
      </section>
    })}
  </main>
}
