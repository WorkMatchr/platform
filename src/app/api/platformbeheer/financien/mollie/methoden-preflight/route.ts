import { NextResponse } from 'next/server'
import { getSafeMollieErrorDetails } from '@/lib/finance/credit-payment-diagnostics'
import { createMollieGateway, getMollieApiMode } from '@/lib/finance/mollie-gateway'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const runtime = 'nodejs'

export async function GET() {
  await requirePlatformAdministrator('/platformbeheer/financien')
  const urlChecks = {
    redirectBaseUrlMatchesProduction: process.env.MOLLIE_REDIRECT_BASE_URL === 'https://www.workmatchr.nl',
    webhookBaseUrlMatchesProduction: process.env.MOLLIE_WEBHOOK_BASE_URL === 'https://www.workmatchr.nl',
  }
  const mode = getMollieApiMode()
  if (mode === 'unknown') {
    return NextResponse.json(
      { ok: false, mode, ...urlChecks, methods: [], error: { mollieErrorDetail: 'Mollie-configuratie niet herkenbaar.' } },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
  try {
    const methods = await createMollieGateway().listOneoffPaymentMethods('30.25')
    return NextResponse.json(
      { ok: true, mode, ...urlChecks, amount: { value: '30.25', currency: 'EUR' }, sequenceType: 'oneoff', methods },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, mode, ...urlChecks, methods: [], error: getSafeMollieErrorDetails(error) },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
