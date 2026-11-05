import type { Metadata } from 'next'
import Link from 'next/link'
import { randomUUID } from 'node:crypto'
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import { listAcademyReviews } from '@/lib/learning/academy-review-service'
import { academyReviewKinds, academyReviewActions, isAcademyReviewClosed } from '@/lib/learning/academy-review-presentation'
import { AcademyReviewDecisionForm } from '@/components/learning/academy-review-decision-form'
import { AdminPageHeader, EmptyState } from '@/components/platform-admin/platform-admin-ui'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Academy — Beoordelingsverzoeken | WorkMatchr', robots: { index: false, follow: false } }
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const operator = await requirePlatformOperator('/platformbeheer/academy/beoordelingen')
  const params = await searchParams
  const kind = typeof params.kind === 'string' && Object.hasOwn(academyReviewKinds, params.kind) ? params.kind : ''
  const status = params.status === 'open' || params.status === 'closed' ? params.status : ''
  let events: Awaited<ReturnType<typeof listAcademyReviews>>
  try { events = await listAcademyReviews(operator.userId, true) }
  catch { return <EmptyState>Beoordelingsverzoeken konden niet worden geladen. Er zijn geen gegevens gewijzigd. <Link href="/platformbeheer/academy/beoordelingen" className="underline">Probeer opnieuw</Link>. Neem contact op met de beheerder van de testomgeving als dit blijft gebeuren.</EmptyState> }
  const requests = events.filter(e => e.action === 'REQUESTED').reverse().filter(e => {
    const closed = events.some(x => x.caseId === e.caseId && isAcademyReviewClosed(x.action))
    return (!kind || e.kind === kind) && (!status || (status === 'closed') === closed)
  })
  return <div className="min-w-0 max-w-4xl space-y-5">
    <AdminPageHeader eyebrow="Academy" title="Beoordelingsverzoeken" description="Beoordeel ieder verzoek persoonlijk en motiveer uw besluit."/>
    <p>Een geaccepteerd examenbezwaar wijzigt geen historische score. Een herstelmaatregel vereist afzonderlijke inhoudelijke beoordeling. Intrekking is uitsluitend mogelijk bij fraude of een certificaatfout.</p>
    <form className="flex flex-wrap items-end gap-3">
      <label>Soort verzoek<select name="kind" defaultValue={kind} className="block min-h-11 max-w-full rounded-control border border-border p-2"><option value="">Alle soorten</option>{Object.entries(academyReviewKinds).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Status<select name="status" defaultValue={status} className="block min-h-11 rounded-control border border-border p-2"><option value="">Alle statussen</option><option value="open">Open</option><option value="closed">Afgehandeld</option></select></label>
      <button className="min-h-11 rounded-control border border-border px-4" type="submit">Verzoeken filteren</button>
    </form>
    <p>De filters gelden voor de 100 meest recente verzoeken. De volledige besluitgeschiedenis van die verzoeken blijft zichtbaar.</p>
    {!requests.length && <EmptyState>Er zijn geen beoordelingsverzoeken gevonden voor deze selectie.</EmptyState>}
    {requests.map(e => {
      const history = events.filter(x => x.caseId === e.caseId && x.action !== 'REQUESTED')
      const closed = history.some(x => isAcademyReviewClosed(x.action))
      return <details key={e.id} className="min-w-0 space-y-3 rounded-card border border-border bg-surface p-4 [overflow-wrap:anywhere]">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">{academyReviewKinds[e.kind] ?? 'Verzoek'} — {e.createdAt.toLocaleDateString('nl-NL')} — {closed ? 'Afgehandeld' : 'Open'}</summary>
        <h2 className="font-bold">Verzoekdetails</h2><p className="whitespace-pre-wrap">{e.reason}</p>
        <h3 className="font-semibold">Besluitgeschiedenis</h3>
        {history.length ? <ol className="space-y-2">{history.map(x => <li key={x.id}><time dateTime={x.createdAt.toISOString()}>{x.createdAt.toLocaleString('nl-NL')}</time> — {academyReviewActions[x.action] ?? 'Status niet beschikbaar'}<p className="whitespace-pre-wrap">{x.reason}</p></li>)}</ol> : <p>Er is nog geen beoordeling vastgelegd.</p>}
        {!closed && <AcademyReviewDecisionForm requestKey={randomUUID()} caseId={e.caseId} nameCorrection={e.kind === 'CERTIFICATE_NAME'} revocable={['FRAUD','CERTIFICATE_ERROR'].includes(e.kind)}/>}
      </details>
    })}
  </div>
}
