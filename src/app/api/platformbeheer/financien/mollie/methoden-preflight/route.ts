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
    const gateway = createMollieGateway()
    const methods = await gateway.listOneoffPaymentMethods('30.25')
    const proFirstPaymentMethods = await gateway.listFirstPaymentMethods('59.29')
    return NextResponse.json(
      {
        ok: true,
        mode,
        ...urlChecks,
        amount: { value: '30.25', currency: 'EUR' },
        sequenceType: 'oneoff',
        methods,
        proFirstPayment: {
          mode,
          amount: '59.29',
          currency: 'EUR',
          sequenceType: 'first',
          methods: proFirstPaymentMethods,
          hasSuitableMethod: proFirstPaymentMethods.length > 0,
        },
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, mode, ...urlChecks, methods: [], error: getSafeMollieErrorDetails(error) },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
