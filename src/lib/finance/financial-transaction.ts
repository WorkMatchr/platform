import 'server-only'

import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'

const MAX_SERIALIZABLE_ATTEMPTS = 12

function isRetryableTransactionConflict(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String(error.code) : ''
  const message = 'message' in error ? String(error.message) : ''
  return code === 'P2034' || message.includes('40001') || message.includes('40P01')
}

export async function runSerializableFinancialTransaction<T>(
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await getPrisma().$transaction(operation, { isolationLevel: 'Serializable' })
    } catch (error) {
      if (!isRetryableTransactionConflict(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS) throw error
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, attempt * 25 + Math.floor(Math.random() * 25)))
    }
  }
  throw lastError
}
