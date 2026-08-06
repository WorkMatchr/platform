import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) =>
  readFileSync(join(process.cwd(), path), 'utf8')

describe('Aanvraagpublicatie-interface', () => {
  it('bevat de vijf controleblokken en de veilige uitleg', () => {
    const form = read(
      'src/components/requests/request-publication-form.tsx',
    )
    expect(form).toContain('Aanbevolen deskundigheid')
    expect(form).toContain('Controleer uw opdracht')
    expect(form).toContain('Omschrijving opdracht')
    expect(form).toContain('Planning')
    expect(form).toContain('Extra opmerkingen')
    expect(form).toContain('volledige Adviesdossier')
    expect(form).toContain('niet automatisch gedeeld')
    expect(form).toContain('Publiceer opdracht')
  })

  it('beveiligt formulier, overzicht en succesroute server-side', () => {
    const formPage = read('src/app/aanvragen/nieuw/page.tsx')
    const overview = read('src/app/aanvragen/page.tsx')
    const success = read(
      'src/app/aanvragen/[requestId]/gepubliceerd/page.tsx',
    )
    expect(formPage).toContain('requireClientAdviceDossierViewer')
    expect(formPage).toContain('getRequestPublicationPreview')
    expect(overview).toContain('requireClientAdviceDossierViewer')
    expect(overview).toContain('listOwnRequests')
    expect(success).toContain('requireClientAdviceDossierViewer')
    expect(success).toContain('getOwnRequest')
  })

  it('activeert geen downstream marketplacefunctionaliteit', () => {
    const source = [
      read('src/app/aanvragen/actions.ts'),
      read('src/app/aanvragen/nieuw/page.tsx'),
      read('src/app/aanvragen/page.tsx'),
      read(
        'src/components/requests/request-publication-form.tsx',
      ),
    ].join('\n')
    expect(source).not.toContain('runMatching')
    expect(source).not.toContain('ProviderInvitation')
    expect(source).not.toContain('CreditReservation')
    expect(source).not.toContain('createQuote')
  })

  it('toont uitsluitend geaggregeerde claimtellers aan de opdrachtgever', () => {
    const overview = read('src/app/aanvragen/page.tsx')
    const success = read(
      'src/app/aanvragen/[requestId]/gepubliceerd/page.tsx',
    )
    expect(`${overview}\n${success}`).toContain(
      'Offerteplaatsen bezet',
    )
    expect(`${overview}\n${success}`).toContain(
      'request._count.offerSlots',
    )
    expect(`${overview}\n${success}`).not.toContain(
      'providerOrganization',
    )
  })
})
