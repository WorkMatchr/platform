// Explicitly approved legacy test identities; never infer this from a number or snapshot version.
export const legacyJorttTestInvoices = {
  '516a2763-7d62-47ce-aaad-8e2bc63d067e': 'WM-26085001',
  'cf9c9bac-56f9-45bb-994c-d6a1b596ff1e': 'WM-26085002',
  '63831bd7-277a-48a7-b328-a3d7ed7eb099': 'WM-26085003',
} as const

export function isRetiredLegacyJorttSync(sync: { invoiceId: string; status: string; lastErrorCode?: string | null }) {
  return Object.hasOwn(legacyJorttTestInvoices, sync.invoiceId)
    && sync.status === 'FAILED' && sync.lastErrorCode === 'LEGACY_TEST_DATA'
}

// Preserve ordinary FAILED records, including NULL error codes (SQL three-valued logic).
export const operationalJorttFilter = {
  OR: [
    { invoiceId: { notIn: Object.keys(legacyJorttTestInvoices) } },
    { status: { not: 'FAILED' as const } },
    { lastErrorCode: null },
    { lastErrorCode: { not: 'LEGACY_TEST_DATA' } },
  ],
}
