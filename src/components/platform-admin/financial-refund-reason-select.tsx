"use client"

import { useState } from 'react'
import {
  FINANCIAL_REFUND_REASON_CODES,
  SYSTEM_TEST_REFUND_WARNING,
  type FinancialRefundReasonCode,
} from '@/lib/finance/refund-reasons'

export function FinancialRefundReasonSelect({ labels }: { labels: Record<FinancialRefundReasonCode, string> }) {
  const [reasonCode, setReasonCode] = useState<FinancialRefundReasonCode | ''>('')
  const isSystemTest = reasonCode === 'SYSTEM_TEST'

  return <div className="grid gap-2">
    <label htmlFor="refund-reason-code" className="grid gap-1 text-sm font-semibold">
      Reden terugbetaling
      <select
        id="refund-reason-code"
        name="reasonCode"
        required
        value={reasonCode}
        onChange={(event) => setReasonCode(event.currentTarget.value as FinancialRefundReasonCode | '')}
        aria-describedby={isSystemTest ? 'system-test-refund-warning' : undefined}
        className="min-h-11 rounded-control border border-border bg-surface px-3 font-normal"
      >
        <option value="">Kies een reden</option>
        {FINANCIAL_REFUND_REASON_CODES.map((code) => <option key={code} value={code}>{labels[code]}</option>)}
      </select>
    </label>
    {isSystemTest ? <p id="system-test-refund-warning" role="note" aria-live="polite" className="rounded-control border border-warning-border bg-warning-subtle p-3 text-sm">
      {SYSTEM_TEST_REFUND_WARNING}
    </p> : null}
  </div>
}
