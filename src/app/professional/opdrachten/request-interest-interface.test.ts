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
      'Na een succesvolle claim worden de contactgegevens',
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

  it('toont claimstatus, volle plaatsen en geen credit- of offerteformulier', () => {
    expect(detailSource).toContain('Offerteplaats claimen')
    expect(detailSource).toContain(
      'Alle offerteplaatsen zijn momenteel bezet',
    )
    expect(detailSource).toContain(
      'Offerteplaats succesvol geclaimd',
    )
    expect(detailSource).not.toContain('Offertebedrag')
    expect(detailSource).not.toContain('Credits afschrijven')
  })
})
