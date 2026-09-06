import { createHash } from 'node:crypto'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Button } from '@/components/ui/button'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPrisma } from '@/lib/prisma'
import { isRetiredLegacyJorttSync, legacyJorttTestInvoices, operationalJorttFilter } from '@/lib/finance/jortt-retirement-policy'
import { retireLegacyJorttTestSync } from '@/lib/finance/jortt-retirement-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const path = '/platformbeheer/financien/jortt-retirement-once'
const ids = Object.keys(legacyJorttTestInvoices)
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

async function authorize() {
  if (process.env.VERCEL_ENV !== 'production') notFound()
  return requirePlatformAdministrator(path)
}

async function inspect() {
  const db = getPrisma()
  const rows = await db.financialInvoice.findMany({
    where: { id: { in: ids } }, orderBy: { id: 'asc' },
    include: { lines: { orderBy: { id: 'asc' } }, vatSummaries: { orderBy: { id: 'asc' } }, jorttSync: { include: { attempts: { orderBy: { id: 'asc' } } } } },
  })
  const events = await db.financialEvent.findMany({ where: { invoiceId: { in: ids } }, orderBy: { id: 'asc' } })
  return { rows, events }
}

async function retire() {
  'use server'
  const actor = await authorize()
  const { rows } = await inspect()
  if (rows.length !== 3 || rows.some(row => row.invoiceNumber !== legacyJorttTestInvoices[row.id as keyof typeof legacyJorttTestInvoices]
    || row.snapshotVersion !== 1 || row.documentType !== 'INVOICE' || !row.jorttSync
    || (!isRetiredLegacyJorttSync(row.jorttSync) && (row.jorttSync.status !== 'RETRY_REQUIRED' || row.jorttSync.lastErrorCode !== 'JORTT_PROVIDER_REJECTED')))) {
    throw new Error('JORTT_RETIREMENT_CONTEXT_MISMATCH')
  }
  for (const id of ids) await retireLegacyJorttTestSync(id, actor.id)
  revalidatePath(path)
  revalidatePath('/platformbeheer/financien/facturen')
  redirect(path)
}

export default async function Page() {
  await authorize()
  const { rows, events } = await inspect()
  const completed = rows.length === 3 && rows.every(row => row.jorttSync && isRetiredLegacyJorttSync(row.jorttSync))
  const backlog = await getPrisma().financialJorttSync.count({ where: { AND: [operationalJorttFilter, { status: { in: ['RETRY_REQUIRED', 'FAILED'] } }] } })
  const report = rows.map(({ jorttSync, ...snapshot }) => {
    const history = events.filter(event => event.invoiceId === snapshot.id && event.eventType !== 'JORTT_SYNC_RETIRED')
    return {
      invoiceNumber: snapshot.invoiceNumber, invoiceId: snapshot.id,
      status: jorttSync?.status, reason: jorttSync?.lastErrorCode, nextAttemptAt: jorttSync?.nextAttemptAt,
      attemptCount: jorttSync?.attemptCount, attempts: jorttSync?.attempts.length,
      snapshotHash: hash(snapshot), attemptsHash: hash(jorttSync?.attempts),
      historyCount: history.length, historyHash: hash(history),
      retirementAudit: events.filter(event => event.invoiceId === snapshot.id && event.eventType === 'JORTT_SYNC_RETIRED').map(event => ({
        id: event.id, createdAt: event.createdAt, actorRecorded: Boolean(event.actorUserId), reason: event.reason, result: event.result,
      })),
    }
  })
  return <section className="space-y-6">
    <h1 className="text-2xl font-semibold">Historische Jortt-testgegevens afronden</h1>
    <p>Alleen WM-26085001, WM-26085002 en WM-26085003 worden uitgesloten van verdere synchronisatie. Facturen en bestaande auditgeschiedenis blijven behouden. Er wordt geen Jortt-aanroep uitgevoerd.</p>
    <p>{completed ? 'De drie testrecords zijn afgerond.' : 'De testrecords zijn nog niet alle drie afgerond.'}</p>
    {!completed && <form action={retire}><Button type="submit">Markeer uitsluitend deze drie testfacturen</Button></form>}
    <h2 className="text-lg font-semibold">Technische auditcontrole</h2>
    <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify({ operationalBacklog: backlog, report }, null, 2)}</pre>
  </section>
}
