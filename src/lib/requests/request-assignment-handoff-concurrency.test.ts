import { describe, expect, it, vi } from 'vitest'
import { createHandoffAssignmentSpecialisms, resolveHandoffSpecialismReferences } from './request-assignment-handoff'

describe('request assignment handoff transaction discipline', () => {
  function referenceTransaction(findFirst: ReturnType<typeof vi.fn>) {
    return {
      specialism: { findFirst },
      providerSpecialismTaxonomyMap: { findUnique: vi.fn(async ({ where }: { where: { specialismId: string } }) => ({ termId: where.specialismId.replace('specialism:', 'term:') })) },
      providerTaxonomyTerm: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id, code: `capability:${where.id.slice(5)}`, versionId: 'taxonomy-v3', isActive: true })) },
      providerTaxonomyVersion: { findUnique: vi.fn().mockResolvedValue({ status: 'PUBLISHED' }) },
    } as never
  }

  it('performs no reference query for Route B/UNKNOWN', async () => {
    const findFirst = vi.fn()
    await expect(resolveHandoffSpecialismReferences({ specialism: { findFirst } } as never, [])).resolves.toEqual([])
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('resolves a Route A primary with one awaited query', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'specialism:hvk' })
    const references = await resolveHandoffSpecialismReferences(referenceTransaction(findFirst), ['HVK'])
    expect(findFirst).toHaveBeenCalledOnce()
    expect(references).toHaveLength(1)
  })

  it('resolves primary and additional specialisms sequentially on one transaction client', async () => {
    let active = false
    let maximumConcurrent = 0
    let currentConcurrent = 0
    const findFirst = vi.fn(async ({ where }: { where: { slug: string } }) => {
      if (active) throw new Error('OVERLAPPING_TRANSACTION_QUERY')
      active = true
      currentConcurrent += 1
      maximumConcurrent = Math.max(maximumConcurrent, currentConcurrent)
      await new Promise(resolve => setTimeout(resolve, 1))
      currentConcurrent -= 1
      active = false
      return { id: `specialism:${where.slug}` }
    })
    const transaction = referenceTransaction(findFirst)

    const references = await resolveHandoffSpecialismReferences(transaction, ['HVK', 'ARBEIDSHYGIENIST'])

    expect(maximumConcurrent).toBe(1)
    expect(findFirst).toHaveBeenCalledTimes(2)
    expect(references.map(reference => reference.tier)).toEqual(['PRIMARY', 'ADDITIONAL'])
  })
})

it('maakt primary en additional specialisms sequentieel op dezelfde transaction client', async () => {
  let active = 0
  let maximum = 0
  const create = vi.fn(async () => {
    active += 1
    maximum = Math.max(maximum, active)
    await Promise.resolve()
    active -= 1
    return {}
  })
  await createHandoffAssignmentSpecialisms(
    { assignmentSpecialism: { create } } as never,
    '11111111-1111-4111-8111-111111111111',
    [
      { expertiseId: 'HVK', specialismId: '22222222-2222-4222-8222-222222222222', capabilityCode: 'hogere-veiligheidskundige', termId: '33333333-3333-4333-8333-333333333333', taxonomyVersionId: '44444444-4444-4444-8444-444444444444', tier: 'PRIMARY' },
      { expertiseId: 'ARBEIDSHYGIENIST', specialismId: '55555555-5555-4555-8555-555555555555', capabilityCode: 'arbeidshygienist', termId: '66666666-6666-4666-8666-666666666666', taxonomyVersionId: '77777777-7777-4777-8777-777777777777', tier: 'ADDITIONAL' },
    ],
  )
  expect(create).toHaveBeenCalledTimes(2)
  expect(maximum).toBe(1)
})
