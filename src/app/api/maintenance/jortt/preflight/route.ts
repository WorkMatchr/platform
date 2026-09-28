import { NextResponse } from 'next/server'
import { JorttApiGateway } from '@/lib/finance/jortt-api-gateway'
import { isFinancialMaintenanceAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const runtime = 'nodejs'

const safeHeaders = { 'Cache-Control': 'private, no-store' }

/** Temporary Production-only read-only Jortt connectivity preflight. */
export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.json({ ok: false, auth: 'FAIL', organizationRead: 'NOT_RUN', providerCode: null, httpStatus: 404 }, { status: 404, headers: safeHeaders })
  }

  // Require the regular Better Auth platform-admin session as well as the maintenance bearer secret.
  await requirePlatformAdministrator('/platformbeheer/financien')

  const maintenanceSecret = process.env.FINANCIAL_MAINTENANCE_SECRET
  if (!maintenanceSecret || maintenanceSecret.length < 32) {
    return NextResponse.json({ ok: false, auth: 'FAIL', organizationRead: 'NOT_RUN', providerCode: null, httpStatus: 503 }, { status: 503, headers: safeHeaders })
  }
  if (!isFinancialMaintenanceAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ ok: false, auth: 'FAIL', organizationRead: 'NOT_RUN', providerCode: null, httpStatus: 401 }, { status: 401, headers: safeHeaders })
  }

  const result = await new JorttApiGateway().preflightOrganizationRead()
  const status = result.ok ? 200 : result.httpStatus === 503 ? 503 : 502
  return NextResponse.json(result, { status, headers: safeHeaders })
}
