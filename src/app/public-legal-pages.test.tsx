import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PrivacyPage, { metadata as privacyMetadata } from './privacy/page'
import CookiesPage, { metadata as cookieMetadata } from './cookies/page'
import { legalIdentityDraft } from '@/config/legal-identity'
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
    expect(html).toContain(`mailto:${legalIdentityDraft.proposedPrivacyEmail}`)
    expect(renderToStaticMarkup(<CookiesPage />)).toContain(`mailto:${legalIdentityDraft.proposedPrivacyEmail}`)
  })
  it('maakt retentie-onzekerheid, A06-status en privacyrechten expliciet', () => {
    const html = renderToStaticMarkup(<PrivacyPage />)
    for (const text of ['nog niet geactiveerd', 'twaalf maanden na afhandeling', 'nog niet aantoonbaar ingevoerd', 'dertig dagen', 'back-upretentie staat nog open', 'bezwaar', 'inzage', 'één maand', 'Verenigde Staten', 'geen juridische certificering']) expect(html).toContain(text)
    expect(html).toContain('href="/cookies"')
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
