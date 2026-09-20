import { NextResponse } from 'next/server'
import { isFinancialMaintenanceCronAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { deliverAssignmentEmails } from '@/lib/marketplace/assignment-email-worker'

export const maxDuration = 60
export async function POST(request: Request) {
  if (!isFinancialMaintenanceCronAuthorized(request.headers.get('authorization'))) return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 })
  return NextResponse.json(await deliverAssignmentEmails({ limit: 10 }))
}
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.json({ error: 'Niet beschikbaar.' }, { status: 404 })
  return POST(request)
}
