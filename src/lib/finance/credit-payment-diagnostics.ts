export type CreditPaymentDiagnosticCategory =
  | 'MOLLIE_CREDIT_REDIRECT_URL_INVALID'
  | 'MOLLIE_CREDIT_WEBHOOK_URL_INVALID'
  | 'MOLLIE_CREDIT_PAYMENT_CREATE_FAILED'
  | 'MOLLIE_CREDIT_PAYMENT_REJECTED'
  | 'MOLLIE_CREDIT_CHECKOUT_MISSING'
  | 'MOLLIE_CREDIT_CONFIGURATION_ERROR'

type SafeMollieError = Readonly<{
  httpStatus?: number
  mollieErrorCode?: string
  mollieErrorType?: string
}>

type MollieUrlConfigurationFailure = Readonly<{
  name?: string
  field?: 'webhook' | 'redirect'
}>

function safeErrorValue(value: unknown) {
  return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(value)
    ? value
    : undefined
}

function safeMollieError(error: unknown): SafeMollieError {
  if (!error || typeof error !== 'object') return {}
  const candidate = error as Record<string, unknown>
  return {
    httpStatus: typeof candidate.statusCode === 'number'
      ? candidate.statusCode
      : typeof candidate.status === 'number'
        ? candidate.status
        : undefined,
    mollieErrorCode: safeErrorValue(candidate.code),
    mollieErrorType: safeErrorValue(candidate.type) ?? safeErrorValue(candidate.title),
  }
}

function safeUrlLocation(value: string) {
  const url = new URL(value)
  return Object.freeze({ host: url.host, path: url.pathname })
}

export function classifyCreditPaymentFailure(step: 'url_configuration' | 'payment_create' | 'payment_checkout_url', error?: unknown): CreditPaymentDiagnosticCategory {
  if (step === 'payment_checkout_url') return 'MOLLIE_CREDIT_CHECKOUT_MISSING'
  const configurationFailure = error as MollieUrlConfigurationFailure | undefined
  if (configurationFailure?.name === 'MollieUrlConfigurationError') {
    return configurationFailure.field === 'redirect'
      ? 'MOLLIE_CREDIT_REDIRECT_URL_INVALID'
      : 'MOLLIE_CREDIT_WEBHOOK_URL_INVALID'
  }
  if (error instanceof Error && error.message === 'MOLLIE_CONFIGURATION_MISSING') {
    return 'MOLLIE_CREDIT_CONFIGURATION_ERROR'
  }
  const { httpStatus } = safeMollieError(error)
  return step === 'payment_create' && httpStatus !== undefined && httpStatus >= 400 && httpStatus < 500
    ? 'MOLLIE_CREDIT_PAYMENT_REJECTED'
    : 'MOLLIE_CREDIT_PAYMENT_CREATE_FAILED'
}

export function logCreditPaymentFailure(input: Readonly<{
  category: CreditPaymentDiagnosticCategory
  step: 'url_configuration' | 'payment_create' | 'payment_checkout_url'
  purchaseId: string
  redirectUrl?: string
  webhookUrl?: string
  error?: unknown
}>) {
  const details = safeMollieError(input.error)
  console.error('credit_payment_failure', {
    category: input.category,
    step: input.step,
    purchaseId: input.purchaseId,
    ...details,
    ...(input.redirectUrl ? { redirectUrl: safeUrlLocation(input.redirectUrl) } : {}),
    ...(input.webhookUrl ? { webhookUrl: safeUrlLocation(input.webhookUrl) } : {}),
  })
}
