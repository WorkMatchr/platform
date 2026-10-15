import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PrivacyPage, { metadata as privacyMetadata } from './privacy/page'
import CookiesPage, { metadata as cookieMetadata } from './cookies/page'
import { legalIdentityDraft, privacyMailbox } from '@/config/legal-identity'
import { browserStorageInventory } from '@/content/public-legal'
import { indexablePublicRoutes } from '@/content/public-routes'

const pages = [
  { Page: PrivacyPage, metadata: privacyMetadata, route: '/privacy' },
  { Page: CookiesPage, metadata: cookieMetadata, route: '/cookies' },
] as const

describe('A07 juridische conceptpagina’s', () => {
  for (const { Page, metadata, route } of pages) {
    it(`${route}: herkenbaar concept, één h1, geldige sectielabels en geen publicatieclaim`, () => {
      const html = renderToStaticMarkup(<Page />)
      expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
      expect(html).toContain('Concept — nog niet vastgesteld')
      expect(html).toContain('te bevestigen')
      expect(html).not.toContain('href="#"')
      const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1])
      expect(new Set(ids).size).toBe(ids.length)
      for (const [, id] of html.matchAll(/aria-labelledby="([^"]+)"/g)) expect(ids).toContain(id)
      expect(html).toContain('focus-visible:outline')
      expect(html).not.toMatch(/<iframe|<form|<script/)
    })
    it(`${route}: eigen canonical, noindex en buiten indexeerbare sitemap`, () => {
      expect(metadata.alternates?.canonical).toBe(route)
      expect(metadata.openGraph?.url).toBe(route)
      expect(metadata.robots).toEqual({ index: false, follow: true })
      expect(indexablePublicRoutes as readonly string[]).not.toContain(route)
    })
  }
  it('maakt de verplichte adreswijziging en voorlopige identiteit zichtbaar zonder facturatie te koppelen', () => {
    const html = renderToStaticMarkup(<PrivacyPage />)
    expect(legalIdentityDraft.status).toBe('TO_BE_CONFIRMED')
    expect(html).toContain(legalIdentityDraft.legalName)
    expect(html).toContain(legalIdentityDraft.chamberOfCommerceNumber)
    expect(html).toContain(legalIdentityDraft.correspondenceAddress)
    expect(html).toContain('postadres in Zwolle')
    expect(html).toContain('Vóór livegang')
    expect(html).toContain(`mailto:${legalIdentityDraft.privacyEmail}`)
    expect(renderToStaticMarkup(<CookiesPage />)).toContain(`mailto:${legalIdentityDraft.privacyEmail}`)
  })
  it('onderscheidt leveranciers van techniek en vereist bewijs van passende verwerkersafspraken', () => {
    const html = renderToStaticMarkup(<PrivacyPage />)
    const recipients = html.match(/<section aria-labelledby="recipients">([\s\S]*?)<\/section>/)?.[1] ?? ''
    expect(recipients).toContain('Met wie delen wij persoonsgegevens?')
    for (const provider of ['Vercel (hosting)', 'Neon (databaseopslag)', 'Resend (uitgaande applicatiemails)', 'Vimexx (e-mailforwarding en ontvangende mailbox)', 'Mollie (betalingen)', 'Jortt (boekhouding)']) expect(recipients).toContain(provider)
    expect(recipients).not.toContain('PostgreSQL')
    expect(recipients).toContain('Niet iedere dienstverlener ontvangt dezelfde gegevens.')
    expect(recipients).toContain('Mollie op als zelfstandige verwerkingsverantwoordelijke')
    expect(recipients).toContain('Vóór definitieve publicatie moet nog worden aangetoond')
    expect(recipients).toContain('ontbrekende afspraken moeten eerst worden ingevuld')
    expect(recipients).not.toContain('maken wij afspraken')
    expect(recipients).toContain('Have I Been Pwned')
    expect(recipients).toContain('Verwerking buiten de Europese Economische Ruimte')
  })
  it('onderscheidt bevestigd privacycontact en mailroute van onbewezen mailboxinstellingen', () => {
    expect(legalIdentityDraft.privacyEmail).toBe('contact@workmatchr.nl')
    expect(legalIdentityDraft.privacyContactStatus).toBe('PRODUCT_OWNER_CONFIRMED')
    expect(privacyMailbox.configurationEvidence).toBe('PRODUCT_OWNER_CONFIRMED')
    expect(privacyMailbox.technicalVerification).toBe('PENDING')
    expect(privacyMailbox.forwardingProvider).toBe('Vimexx')
    expect(privacyMailbox.mailboxProvider).toBe('Vimexx')
    expect(privacyMailbox.destination).toBe('info@workmatchr.nl')
    const html = renderToStaticMarkup(<PrivacyPage />)
    expect(html).toContain('Officieel e-mailadres voor privacyverzoeken:')
    expect(html).toContain('automatische forwarder van Vimexx')
    expect(html).toContain('info@workmatchr.nl, een mailbox bij Vimexx')
    expect(html).toContain('niet onafhankelijk technisch geverifieerd')
    expect(html).toContain('Of de forwarder aanvullende kopieën of logs bewaart')
    expect(html).toContain('nog niet aantoonbaar ingevoerd')
    expect(html).toContain('de uitvoering van dit toegangsbeleid en MFA moet nog worden gecontroleerd')
    for (const { Page } of pages) expect(renderToStaticMarkup(<Page />)).not.toMatch(/Voorgesteld privacycontact|Voorlopig privacycontact/)
  })
  it('maakt retentie-onzekerheid, A06-status en privacyrechten expliciet', () => {
    const html = renderToStaticMarkup(<PrivacyPage />)
    for (const text of ['nog niet geactiveerd', 'één jaar na de datum van ontvangst', 'nog niet aantoonbaar ingevoerd', 'prullenbak- en back-upretentie bij Vimexx staat nog open', 'bezwaar', 'inzage', 'één maand', 'Verenigde Staten', 'geen juridische certificering']) expect(html).toContain(text)
    expect(html).toContain('href="/cookies"')
  })
  it('rekent contactbewaring vanaf ontvangst en beperkt uitzonderingen zonder nieuwe jaartermijn na afronding', () => {
    const html = renderToStaticMarkup(<PrivacyPage />)
    const contact = html.match(/<section[^>]*aria-labelledby="contact-retention">([\s\S]*?)<\/section>/)?.[1] ?? ''
    for (const text of [
      'Hoe lang bewaren wij contactberichten?',
      'ontvangen algemene e-mailberichten maximaal één jaar na de datum van ontvangst',
      'lopende zaak, klacht, geschil of andere noodzakelijke behandeling',
      'zolang daarvoor een gerechtvaardigde reden bestaat',
      'Na afronding van de zaak wordt opnieuw beoordeeld of verdere bewaring noodzakelijk is.',
      'Berichten die niet langer nodig zijn, worden verwijderd.',
      'De eigenaar van WorkMatchr is verantwoordelijk voor de handmatige controle en verwijdering',
      'Dit beleid geldt voor zowel de inbox als het archief.',
      'De technische verwijdering uit de prullenbak en back-ups is afhankelijk',
      'De Product Owner heeft dit bewaarbeleid definitief vastgesteld op 15 oktober 2026.',
      'De privacyverklaring als geheel blijft concept',
      'de uitvoering is nog niet aantoonbaar ingevoerd',
    ]) expect(contact).toContain(text)
    expect(html).not.toMatch(/(?:twaalf maanden|één jaar) na afhandeling/)
    expect(contact).not.toMatch(/dertig dagen|30 dagen|in beginsel/)
  })
  it('toont ieder opslagitem uniek met doel, aanbieder, duur en toestemmingsbeoordeling', () => {
    const html = renderToStaticMarkup(<CookiesPage />)
    expect(new Set(browserStorageInventory.map(item => item.name)).size).toBe(browserStorageInventory.length)
    for (const item of browserStorageInventory) {
      for (const value of [item.name, item.provider, item.duration, item.consent, item.evidence]) expect(value.length).toBeGreaterThan(0)
      expect(html).toContain(item.provider)
      expect(html).toContain(item.duration)
    }
    expect(html).toContain('Geen vaste vervaldatum')
    expect(html).toContain('Vrijstelling nog niet definitief vastgesteld')
    expect(html).toContain('href="/privacy"')
  })
})
