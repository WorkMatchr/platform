import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { escapeHtml, type AuthEmail, type AuthEmailDeliveryResult } from '@/lib/email'
import { getPublicAppBaseUrl } from '@/lib/public-app-url'
import { assertAcademyCommerceSandbox } from './academy-commerce-environment'

const templates = ['ACADEMY_PUBLIC_WITHDRAWAL','ACADEMY_ORDER_CONFIRMED','ACADEMY_SEAT_INVITED','ACADEMY_WITHDRAWAL_RECEIVED']
// Explicit sender injection: no default/live provider and no production scheduling hook.
export async function deliverAcademyCommerceEmails(input: { send: (email: AuthEmail) => Promise<AuthEmailDeliveryResult>; now?: () => Date; limit?: number }) {
  assertAcademyCommerceSandbox()
  const db = getPrisma(), now = input.now ?? (() => new Date()), tick = now()
  const jobs = await db.notificationOutbox.findMany({ where: { templateKey: { in: templates }, OR: [{ status: 'PENDING', availableAt: { lte: tick } }, { status: 'PROCESSING', OR: [{ leaseUntil: { lte: tick } }, { leaseUntil: null }] }] }, orderBy: { createdAt: 'asc' }, take: Math.min(input.limit ?? 10,50) })
  const result = { sent: 0, failed: 0, retry: 0 }
  for (const job of jobs) {
    const leaseToken = randomUUID()
    const claim = await db.notificationOutbox.updateMany({ where: { id: job.id, OR: [{ status: 'PENDING', availableAt: { lte: tick } }, { status: 'PROCESSING', OR: [{ leaseUntil: { lte: tick } }, { leaseUntil: null }] }] }, data: { status: 'PROCESSING', leaseToken, leaseUntil: new Date(tick.getTime()+300000), firstAttemptAt: job.firstAttemptAt ?? tick, attemptCount: { increment: 1 } } })
    if (!claim.count) continue
    async function finish(status: 'SENT'|'FAILED'|'PENDING', code: string | null, messageId?: string) {
      const changed = await db.notificationOutbox.updateMany({ where: { id: job.id, status: 'PROCESSING', leaseToken }, data: { status, lastErrorCode: code, providerMessageId: messageId, leaseToken: null, leaseUntil: null, processedAt: status === 'PENDING' ? null : now(), ...(status === 'PENDING' ? { availableAt: new Date(tick.getTime()+[60000,300000,900000,3600000][Math.min(job.attemptCount,3)]) } : {}) } })
      if (changed.count) result[status === 'SENT' ? 'sent' : status === 'FAILED' ? 'failed' : 'retry']++
    }
    if (job.attemptCount >= 5 || tick.getTime()-(job.firstAttemptAt?.getTime() ?? tick.getTime()) > 23*3600000) { await finish('FAILED','DELIVERY_RECONCILIATION_REQUIRED'); continue }
    const payload = job.payload as { withdrawalId?: string; seatId?: string; email?: string; orderId?: string; receivedAt?: string }
    let to = '', subject = '', text = '', target = ''
    let attachments: AuthEmail['attachments']
    if (job.templateKey === 'ACADEMY_PUBLIC_WITHDRAWAL') {
      const receipt = payload.withdrawalId ? await db.academyWithdrawalRequest.findUnique({ where: { id: payload.withdrawalId } }) : null
      if (!receipt) { await finish('FAILED','WITHDRAWAL_NOT_DELIVERABLE'); continue }
      to = receipt.email; subject = 'Ontvangstbevestiging van uw herroepingsverklaring'; target = '/academy/herroepen'
      text = `Uw verklaring is ontvangen op ${receipt.receivedAt.toISOString()}. Referentie: ${receipt.id}. Dit bevestigt uitsluitend ontvangst. Aankoopidentificatie, beoordeling en eventuele terugbetaling volgen afzonderlijk. Bewaar dit bericht.`
    } else if (job.templateKey === 'ACADEMY_SEAT_INVITED') {
      const seat = typeof payload.seatId === 'string' ? await db.learningAcademySeat.findFirst({ where: { id: payload.seatId, status: 'INVITED', invitedEmail: payload.email, inviteExpiresAt: { gt: tick }, order: { purchase: { status: 'PAID' } } }, include: { order: { include: { courseVersion: { include: { course: true } } } } } }) : null
      if (!seat?.invitedEmail || seat.invitedEmail !== payload.email) { await finish('FAILED','INVITATION_NOT_DELIVERABLE'); continue }
      to = seat.invitedEmail; subject = 'Uw WorkMatchr Academy-uitnodiging'
      text = `Er staat een opleidingsplaats voor ${seat.order.courseVersion.course.title} voor u klaar. Meld uzelf aan met dit e-mailadres en aanvaard de plaats. De uitnodiging maakt geen account aan en schrijft u niet in voor kennisbehoud.`
      target = `/e-learnings/uitnodiging/${seat.id}`
    } else {
      const order = typeof payload.orderId === 'string' ? await db.learningAcademyOrder.findUnique({ where: { id: payload.orderId }, include: { purchase: true, buyer: { select: { email: true, status: true, emailVerified: true } }, courseVersion: { include: { course: true } } } }) : null
      if (!order || order.buyer.status !== 'ACTIVE' || !order.buyer.emailVerified || order.buyerUserId !== job.recipientUserId || (job.templateKey === 'ACADEMY_ORDER_CONFIRMED' && order.purchase.status !== 'PAID')) { await finish('FAILED','ORDER_NOT_DELIVERABLE'); continue }
      to = order.buyer.email; target = `/e-learnings/aankopen/${order.id}`
      if (job.templateKey === 'ACADEMY_ORDER_CONFIRMED') {
        subject = 'Uw WorkMatchr Academy-testbestelling'
        text = `Uw testbestelling voor ${order.courseVersion.course.title} (${order.quantity} plaats(en)) is bevestigd. Dit is uitsluitend een sandboxtest. De fiscale behandeling is TAX REVIEW REQUIRED. Kennisbehoud en jaarherinnering zijn afzonderlijke vrijwillige keuzes.`
        attachments = [{ filename: 'Academy-testovereenkomst.txt', contentType: 'text/plain; charset=utf-8', content: JSON.stringify({ agreedAt: order.agreedAt, legalAgreement: order.legalAgreement, amountInclVatCents: order.purchase.amountInclVatCents }, null,2) }]
      } else {
        subject = 'Ontvangstbevestiging: koop ongedaan maken'
        text = `Uw herroeping/annulering van aankoop ${order.id} is ontvangen op ${payload.receivedAt}. Een reden is niet nodig. Deze ontvangstbevestiging is geen claim dat een providerterugbetaling al is voltooid.`
      }
    }
    if (!to.endsWith('@example.invalid')) { await finish('FAILED','SANDBOX_RECIPIENT_REQUIRED'); continue }
    const url = new URL(target, getPublicAppBaseUrl()).toString()
    const message: AuthEmail = { kind: job.templateKey === 'ACADEMY_SEAT_INVITED' ? 'INVITATION' : 'FINANCIAL_INVOICE', to, subject, text: `${text}\n\n${url}`, html: `<p>${escapeHtml(text)}</p><p><a href="${escapeHtml(url)}">${job.templateKey === 'ACADEMY_SEAT_INVITED' ? 'Bekijk uw uitnodiging' : job.templateKey === 'ACADEMY_PUBLIC_WITHDRAWAL' ? 'Online herroepen' : 'Bekijk uw aankoop'}</a></p>`, idempotencyKey: job.idempotencyKey, attachments }
    const fingerprint = createHash('sha256').update(JSON.stringify(message)).digest('hex')
    if (job.deliveryFingerprint && job.deliveryFingerprint !== fingerprint) { await finish('FAILED','DELIVERY_PAYLOAD_CHANGED'); continue }
    const ready = await db.notificationOutbox.updateMany({ where: { id: job.id, status: 'PROCESSING', leaseToken, leaseUntil: { gt: now() } }, data: { deliveryFingerprint: fingerprint } })
    if (!ready.count) continue
    try {
      const sent = await input.send(message)
      if (!sent.accepted || sent.status !== 'ACCEPTED') { await finish('FAILED','DEVELOPMENT_ONLY'); continue }
      await finish('SENT',null,sent.messageId)
    } catch { await finish(job.attemptCount+1 >= 5 ? 'FAILED' : 'PENDING','ACADEMY_DELIVERY_RETRY_REQUIRED') }
  }
  return result
}
