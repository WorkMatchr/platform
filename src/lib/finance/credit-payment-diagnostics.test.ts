import { describe, expect, it, vi } from 'vitest'
import { classifyCreditPaymentFailure, logCreditPaymentFailure } from './credit-payment-diagnostics'

describe('creditpaymentdiagnostiek', () => {
  it('classificeert ongeldige Mollie-URL-configuratie veilig', () => {
    expect(classifyCreditPaymentFailure('url_configuration', { name: 'MollieUrlConfigurationError', field: 'redirect' })).toBe('MOLLIE_CREDIT_REDIRECT_URL_INVALID')
    expect(classifyCreditPaymentFailure('url_configuration', { name: 'MollieUrlConfigurationError', field: 'webhook' })).toBe('MOLLIE_CREDIT_WEBHOOK_URL_INVALID')
    expect(classifyCreditPaymentFailure('url_configuration', new Error('MOLLIE_CONFIGURATION_MISSING'))).toBe('MOLLIE_CREDIT_CONFIGURATION_ERROR')
  })

  it('classificeert afgewezen en technische Mollie payment-aanmaak', () => {
    expect(classifyCreditPaymentFailure('payment_create', { statusCode: 422 })).toBe('MOLLIE_CREDIT_PAYMENT_REJECTED')
    expect(classifyCreditPaymentFailure('payment_create', { statusCode: 503 })).toBe('MOLLIE_CREDIT_PAYMENT_CREATE_FAILED')
    expect(classifyCreditPaymentFailure('payment_checkout_url')).toBe('MOLLIE_CREDIT_CHECKOUT_MISSING')
  })

  it('logt uitsluitend veilige technische context zonder secrets of factuurgegevens', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      logCreditPaymentFailure({
        category: 'MOLLIE_CREDIT_PAYMENT_REJECTED',
        step: 'payment_create',
        purchaseId: 'purchase-intern',
        redirectUrl: 'https://www.vkam-adviseur.nl/credits/betaling/purchase-intern?token=secret',
        webhookUrl: 'https://www.vkam-adviseur.nl/api/payments/mollie/webhook?signature=secret',
        error: {
          statusCode: 422,
          code: 'payment_rejected',
          type: 'request',
          field: 'amount.value',
          title: 'Unprocessable Entity',
          detail: 'The amount must be at least € 1.00.',
          apiKey: 'test_secret',
          email: 'persoon@example.invalid',
          address: 'Teststraat 1',
        },
      })
      expect(errorSpy).toHaveBeenCalledWith('credit_payment_failure', {
        category: 'MOLLIE_CREDIT_PAYMENT_REJECTED',
        step: 'payment_create',
        purchaseId: 'purchase-intern',
        httpStatus: 422,
        mollieErrorCode: 'payment_rejected',
        mollieErrorType: 'request',
        mollieErrorField: 'amount.value',
        mollieErrorTitle: 'Unprocessable Entity',
        mollieErrorDetail: 'The amount must be at least € 1.00.',
        redirectUrl: { host: 'www.vkam-adviseur.nl', path: '/credits/betaling/purchase-intern' },
        webhookUrl: { host: 'www.vkam-adviseur.nl', path: '/api/payments/mollie/webhook' },
      })
      const output = JSON.stringify(errorSpy.mock.calls)
      expect(output).not.toContain('test_secret')
      expect(output).not.toContain('persoon@example.invalid')
      expect(output).not.toContain('Teststraat')
      expect(output).not.toContain('token=secret')
      expect(output).not.toContain('signature=secret')
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('weigert potentieel gevoelige 422-detailtekst', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      logCreditPaymentFailure({
        category: 'MOLLIE_CREDIT_PAYMENT_REJECTED',
        step: 'payment_create',
        purchaseId: 'purchase-intern',
        error: {
          statusCode: 422,
          field: 'redirectUrl',
          title: 'Unprocessable Entity',
          detail: 'Use https://example.invalid?token=secret for customer@example.invalid',
        },
      })
      expect(errorSpy).toHaveBeenCalledWith('credit_payment_failure', expect.objectContaining({
        mollieErrorField: 'redirectUrl',
        mollieErrorTitle: 'Unprocessable Entity',
      }))
      const output = JSON.stringify(errorSpy.mock.calls)
      expect(output).not.toContain('mollieErrorDetail')
      expect(output).not.toContain('customer@example.invalid')
      expect(output).not.toContain('token=secret')
    } finally {
      errorSpy.mockRestore()
    }
  })
})
