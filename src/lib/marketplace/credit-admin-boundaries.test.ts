import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  user: { findFirst: vi.fn() },
  organization: { findFirst: vi.fn() },
  creditTransaction: { findUnique: vi.fn(), aggregate: vi.fn(), create: vi.fn() },
  creditAccount: { findUnique: vi.fn() },
  marketplaceAuditEvent: { findUnique: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ ...db, $transaction: (fn: (value: typeof db) => unknown) => fn(db) }) }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ getPlatformAdministratorContext: vi.fn() }))
import { correctMarketplaceCredits, grantMarketplaceCredits } from './credit-service'
import { getPlatformProviderCreditOverview, mutateMarketplaceCredits } from './marketplace-credit-admin-service'

const actorUserId = '11111111-1111-4111-8111-111111111111'
const providerOrganizationId = '22222222-2222-4222-8222-222222222222'
const input = { actorUserId, providerOrganizationId, amount: 25, reason: 'Synthetische correctie', idempotencyKey: 'wp08-existing-credit' }
const values = { providerOrganizationId, amount: 25, reasonCode: 'TECHNICAL_COMPENSATION', explanation: input.reason, idempotencyKey: input.idempotencyKey, confirmed: true }
const cases = [
  { name: 'grant', type: 'ADMIN_GRANT', call: (change = {}) => grantMarketplaceCredits({ ...input, ...change }) },
  { name: 'correct', type: 'ADMIN_CORRECTION', call: (change = {}) => correctMarketplaceCredits({ ...input, ...change }) },
  { name: 'manual', type: 'MANUAL_COMPENSATION', call: (change = {}) => mutateMarketplaceCredits({ actorUserId, values: { ...values, ...change } }) },
]

beforeEach(() => {
  vi.resetAllMocks()
  db.user.findFirst.mockResolvedValue({ id: actorUserId })
  db.creditAccount.findUnique.mockResolvedValue({ id: 'wallet' })
  db.organization.findFirst.mockResolvedValue({ id: providerOrganizationId })
  db.marketplaceAuditEvent.findUnique.mockResolvedValue({ metadata: { reference: null } })
})

describe.each(cases)('$name replay', ({ name, type, call }) => {
  beforeEach(() => db.creditTransaction.findUnique.mockResolvedValue({ id: 'existing', creditAccountId: 'wallet', createdByUserId: actorUserId, type, amount: 25, totalDelta: 25, reservedDelta: 0, reason: name === 'manual' ? values.reasonCode : input.reason, description: input.reason, reversalOfTransactionId: null }))
  it('weigert een niet langer bevoegde actor, ook bij bestaande sleutel', async () => {
    db.user.findFirst.mockResolvedValue(null)
    await expect(call()).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
    expect(db.creditTransaction.create).not.toHaveBeenCalled()
  })
  it('behoudt dezelfde bevoegde replay zonder nieuwe boeking', async () => {
    await expect(call()).resolves.toMatchObject({ id: 'existing' })
    expect(db.creditTransaction.create).not.toHaveBeenCalled()
  })
  it('weigert een andere wallet onder dezelfde sleutel', async () => {
    db.creditAccount.findUnique.mockResolvedValue({ id: 'other-wallet' })
    await expect(call()).rejects.toMatchObject({ code: 'CONFLICT' })
  })
  it('weigert een gewijzigd bedrag onder dezelfde sleutel', async () => {
    await expect(call({ amount: 26 })).rejects.toMatchObject({ code: 'CONFLICT' })
  })
  it('weigert een replay van een andere actor', async () => {
    db.creditTransaction.findUnique.mockResolvedValue({ creditAccountId: 'wallet', createdByUserId: 'other', type, amount: 25 })
    await expect(call()).rejects.toMatchObject({ code: 'CONFLICT' })
  })
})

it('berekent beheersaldo uit alle mutaties en behoudt slechts vijftig zichtbare regels', async () => {
  const transactions = Array.from({ length: 50 }, () => ({ totalDelta: 1, reservedDelta: 0 }))
  db.organization.findFirst.mockResolvedValue({ creditAccount: { id: 'wallet', transactions } })
  db.creditTransaction.aggregate.mockResolvedValue({ _sum: { totalDelta: 1050, reservedDelta: 20 } })
  const result = await getPlatformProviderCreditOverview({ actorUserId, providerOrganizationId })
  expect(result?.creditAccount).toMatchObject({ totalBalance: 1050, reservedBalance: 20, availableBalance: 1030, transactions })
  expect(db.creditTransaction.aggregate).toHaveBeenCalledWith({ where: { creditAccountId: 'wallet' }, _sum: { totalDelta: true, reservedDelta: true } })
})
