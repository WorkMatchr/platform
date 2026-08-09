import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const transactionMock = vi.fn()
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: transactionMock }) }))

describe('financiële serializable transacties', () => {
  beforeEach(() => transactionMock.mockReset())

  it('herhaalt uitsluitend een serialization conflict en geeft daarna het resultaat terug', async () => {
    transactionMock
      .mockRejectedValueOnce(Object.assign(new Error('SQLSTATE 40001'), { code: 'P2034' }))
      .mockResolvedValueOnce('geslaagd')
    const { runSerializableFinancialTransaction } = await import('./financial-transaction')
    await expect(runSerializableFinancialTransaction(async () => 'niet gebruikt')).resolves.toBe('geslaagd')
    expect(transactionMock).toHaveBeenCalledTimes(2)
  })

  it('laat een niet-retrybare fout direct fail-closed', async () => {
    transactionMock.mockRejectedValueOnce(new Error('VALIDATION_ERROR'))
    const { runSerializableFinancialTransaction } = await import('./financial-transaction')
    await expect(runSerializableFinancialTransaction(async () => 'niet gebruikt')).rejects.toThrow('VALIDATION_ERROR')
    expect(transactionMock).toHaveBeenCalledTimes(1)
  })
})
