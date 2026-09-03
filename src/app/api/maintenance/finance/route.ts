import { NextResponse } from 'next/server'
import { isFinancialMaintenanceAuthorized, isFinancialMaintenanceCronAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { runFinancialMaintenance } from '@/lib/finance/financial-maintenance-service'

export async function POST(request: Request) {
  if (!process.env.FINANCIAL_MAINTENANCE_SECRET) {
    return NextResponse.json({ error: 'Onderhoudsroute is niet geconfigureerd.' }, { status: 503 })
  }
  if (!isFinancialMaintenanceAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 })
  }
  const result = await runFinancialMaintenance(new Date(), undefined, 'MANUAL_API')
  return NextResponse.json(result, { status: result.status === 'PARTIAL_FAILURE' ? 500 : 200 })
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ error: 'Niet beschikbaar.' }, { status: 404 })
  }
  if (!isFinancialMaintenanceCronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 })
  }
  const result = await runFinancialMaintenance(new Date(), undefined, 'SCHEDULER')
  return NextResponse.json(result, { status: result.status === 'PARTIAL_FAILURE' ? 500 : 200 })
}
