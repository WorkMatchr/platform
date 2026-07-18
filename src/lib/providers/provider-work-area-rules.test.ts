import { describe, expect, it, vi } from 'vitest'
import { hasConflictingActiveWorkArea } from './provider-work-area-rules'

function transaction(codes: string[]) {
  return {
    providerWorkArea: {
      findMany: vi.fn().mockResolvedValue(codes.map((code) => ({
        revisions: [{ regionTerm: { code } }],
      }))),
    },
  }
}

describe('provider werkgebiedregels', () => {
  it('staat REMOTE onafhankelijk van provincies en landelijk toe', async () => {
    const prisma = transaction(['NATIONWIDE'])
    await expect(hasConflictingActiveWorkArea(prisma as never, 'provider', 'REMOTE')).resolves.toBe(false)
    expect(prisma.providerWorkArea.findMany).not.toHaveBeenCalled()
  })

  it('weigert NATIONWIDE naast een actuele provincie', async () => {
    await expect(hasConflictingActiveWorkArea(transaction(['UTRECHT']) as never, 'provider', 'NATIONWIDE')).resolves.toBe(true)
  })

  it('weigert een provincie naast een actueel landelijk werkgebied', async () => {
    await expect(hasConflictingActiveWorkArea(transaction(['NATIONWIDE', 'REMOTE']) as never, 'provider', 'UTRECHT')).resolves.toBe(true)
  })

  it('baseert de regel alleen op de door de query geladen laatste revisie', async () => {
    await expect(hasConflictingActiveWorkArea(transaction(['UTRECHT', 'REMOTE']) as never, 'provider', 'GRONINGEN')).resolves.toBe(false)
  })
})
