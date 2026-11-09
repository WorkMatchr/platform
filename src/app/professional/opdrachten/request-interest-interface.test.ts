import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const listSource = readFileSync(
  new URL('./page.tsx', import.meta.url),
  'utf8',
)
const detailSource = readFileSync(
  new URL('./[requestId]/page.tsx', import.meta.url),
  'utf8',
)
const actionSource = readFileSync(
  new URL('./actions.ts', import.meta.url),
  'utf8',
)
const serviceSource = readFileSync(
  new URL(
    '../../../lib/requests/request-interest-service.ts',
    import.meta.url,
  ),
  'utf8',
)

describe('M7D.2 providerinterface', () => {
  it('toont uitsluitend de geanonimiseerde aanvraagvelden en uitleg', () => {
    for (const label of [
      'requestNumber',
      'Regio',
      'Sector',
      'Planning',
      'Gevraagde deskundigheid',
      'Eerdere aanvragen',
    ]) {
      expect(`${listSource}\n${detailSource}`.toLowerCase()).toContain(
        label.toLowerCase(),
      )
    }
    expect(detailSource).not.toContain('AdviceDossier')
    expect(serviceSource).toContain('hasClaimedOfferSlot')
    expect(serviceSource).toContain(
      'requesterDetails: requesterDetails',
    )
    expect(detailSource).toContain('detail.requesterDetails ?')
    expect(detailSource).toContain('Contactgegevens opdrachtgever')
  })

  it('gebruikt serveractions en geen directe databasecall vanuit de UI', () => {
    expect(actionSource).toContain("'use server'")
    expect(actionSource).toContain('registerRequestInterest')
    expect(actionSource).toContain('withdrawRequestInterest')
    expect(actionSource).toContain('claimRequestOfferSlot')
    expect(`${listSource}\n${detailSource}`).not.toContain('getPrisma')
  })

  it('toont historische kosten en verwijst voor nieuwe deelname naar uitnodigingen', () => {
    expect(detailSource).toContain('Oorspronkelijke kosten')
    expect(listSource).toContain('href="/uitnodigingen"')
    expect(detailSource).not.toContain('claimRequestOfferSlotAction')
    expect(detailSource).not.toContain('registerRequestInterestAction')
    expect(detailSource).toContain('withdrawRequestInterestAction')
  })
})
