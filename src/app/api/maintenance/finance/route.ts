import { NextResponse } from 'next/server'
import { isFinancialMaintenanceAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { runFinancialMaintenance } from '@/lib/finance/financial-maintenance-service'

export async function POST(request: Request) {
  if (!process.env.FINANCIAL_MAINTENANCE_SECRET) {
    return NextResponse.json({ error: 'Onderhoudsroute is niet geconfigureerd.' }, { status: 503 })
  }
  if (!isFinancialMaintenanceAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 })
  }
  const result = await runFinancialMaintenance()
  return NextResponse.json(result)
}
