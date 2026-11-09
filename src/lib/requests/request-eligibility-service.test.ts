import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@/generated/prisma/client'
import { requireNoHistoricalParticipation } from './historical-participation'
import { selectedExpertiseMatchPresentation } from './request-interest-contract'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { RequestMatchExplanation } from '@/components/requests/request-match-explanation'

describe('historische deelname en canonieke selectie', () => {
  it.each([
    [null, null, true],
    [{ id: 'old-slot' }, null, false],
    [null, { id: 'old-payment' }, false],
    [{ id: 'old-slot' }, { id: 'old-payment' }, false],
  ] as const)('controleert offerteplaats %j en boeking %j voor nieuwe deelname', async (slot, payment, allowed) => {
    const tx = {
      requestOfferSlot: { findFirst: vi.fn().mockResolvedValue(slot) },
      creditTransaction: { findFirst: vi.fn().mockResolvedValue(payment) },
    }
    const result = requireNoHistoricalParticipation(tx as unknown as Prisma.TransactionClient, 'original-request')
    if (allowed) await expect(result).resolves.toBeUndefined()
    else await expect(result).rejects.toMatchObject({ code: 'INVALID_STATE' })
    for (const repository of Object.values(tx)) expect(repository.findFirst).toHaveBeenCalledWith({
      where: { requestId: 'original-request' }, select: { id: true },
    })
  })
 it('presenteert primary precedence en aanvullende uitleg zonder rangorde-oordeel',()=>{
  const basis={expertiseSelectionSource:'USER_SELECTED'}
  expect(selectedExpertiseMatchPresentation('HVK',['ADDITIONAL:MVK','PRIMARY:HVK'],basis)?.title).toBe('Primaire match')
  const html=renderToStaticMarkup(createElement(RequestMatchExplanation,{primary:'HVK',matches:['ADDITIONAL:MVK'],basis}))
  expect(html).toContain('Aanvullende match');expect(html).toContain('primair HVK geselecteerd en daarnaast MVK');expect(html).not.toMatch(/reserve|tweede keus|minder geschikt/i)
  expect(selectedExpertiseMatchPresentation('HVK',['PRIMARY:HVK'],{})).toBeNull()
 })
})
