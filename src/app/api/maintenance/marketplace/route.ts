import { NextResponse } from 'next/server'
import { deliverContactEmails } from '@/lib/contact/contact-email-worker'
import { isFinancialMaintenanceCronAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { deliverAssignmentEmails } from '@/lib/marketplace/assignment-email-worker'

export const maxDuration = 60
export async function POST(request: Request) {
  if (!isFinancialMaintenanceCronAuthorized(request.headers.get('authorization'))) return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 })
  if (process.env.CONTACT_OUTBOX_ENABLED !== 'true') return NextResponse.json(await deliverAssignmentEmails({ limit: 10 }))
  // Independent consumers: one template failure must not starve the other queue.
  const [assignment, contact] = await Promise.allSettled([deliverAssignmentEmails({ limit: 10 }), deliverContactEmails({ limit: 5 })])
  if (assignment.status === 'rejected' || contact.status === 'rejected') {
    return NextResponse.json({ error: 'NOTIFICATION_DISPATCH_INCOMPLETE' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json({ ...assignment.value, contact: contact.value }, { headers: { 'Cache-Control': 'no-store' } })
}
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.json({ error: 'Niet beschikbaar.' }, { status: 404 })
  return POST(request)
}
