import { NextResponse } from 'next/server'
import { isFinancialMaintenanceAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { runMollieRuntimeDiagnostic } from '@/lib/finance/mollie-gateway'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Tijdelijke incidentdiagnostiek. Verwijder deze route en de bijbehorende
 * `runMollieRuntimeDiagnostic`-export na afronding van de Mollie-analyse.
 */
export async function GET(request: Request) {
  if (!process.env.FINANCIAL_MAINTENANCE_SECRET) {
    return NextResponse.json({ error: 'Onderhoudsroute is niet geconfigureerd.' }, { status: 503 })
  }
  if (!isFinancialMaintenanceAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 })
  }

  return NextResponse.json(await runMollieRuntimeDiagnostic())
}
