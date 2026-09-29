// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FinancialRefundReasonSelect } from './financial-refund-reason-select'
import { FINANCIAL_REFUND_REASON_LABELS, SYSTEM_TEST_REFUND_WARNING } from '@/lib/finance/refund-reasons'

afterEach(cleanup)

it('toont alle gecodeerde refundredenen en laat de bestaande reden verplicht', () => {
  render(<FinancialRefundReasonSelect labels={FINANCIAL_REFUND_REASON_LABELS} />)
  const select = screen.getByRole('combobox', { name: 'Reden terugbetaling' }) as HTMLSelectElement

  expect(select.required).toBe(true)
  expect(select.options).toHaveLength(10)
  for (const label of Object.values(FINANCIAL_REFUND_REASON_LABELS)) {
    expect(screen.getByRole('option', { name: label })).toBeTruthy()
  }
})

it('toont alleen bij SYSTEM_TEST de expliciete waarschuwing over de echte financiële keten', () => {
  render(<FinancialRefundReasonSelect labels={FINANCIAL_REFUND_REASON_LABELS} />)
  const select = screen.getByRole('combobox', { name: 'Reden terugbetaling' })

  expect(screen.queryByRole('note')).toBeNull()
  fireEvent.change(select, { target: { value: 'SYSTEM_TEST' } })
  expect(screen.getByRole('note').textContent).toBe(SYSTEM_TEST_REFUND_WARNING)
  expect(select.getAttribute('aria-describedby')).toBe('system-test-refund-warning')
  fireEvent.change(select, { target: { value: 'SYSTEM_FAILURE_JORTT' } })
  expect(screen.queryByRole('note')).toBeNull()
})
