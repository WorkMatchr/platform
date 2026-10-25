import { createHash } from 'node:crypto'

export const testSourceExcerpt = 'Uitsluitend synthetische broninhoud voor de PostgreSQL-regressietest.'
export const testSourceExcerptHash = createHash('sha256').update(testSourceExcerpt).digest('hex')
export const testFragmentId = (citationId: string) => `7${citationId.slice(1)}`
