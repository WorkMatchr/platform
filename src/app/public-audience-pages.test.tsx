import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ClientsPage, { metadata as clientMetadata } from './voor-opdrachtgevers/page'
import ProfessionalsPage, { metadata as professionalMetadata } from './voor-professionals/page'
import { publicRoutes } from '@/content/public-routes'
import sitemap from './sitemap'

vi.mock('@/lib/auth', () => { throw new Error('Publieke uitleg mag geen sessie vereisen') })
vi.mock('@/lib/prisma', () => { throw new Error('Publieke uitleg mag geen database raadplegen') })

describe('publieke doelgroeppagina’s', () => {
  it('legt de opdrachtgeverflow uit met bestaande informatieve vervolgroutes', () => {
    const html = renderToStaticMarkup(<ClientsPage />)
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('Van hulpvraag naar passende professional')
    expect(html).toMatch(/href="\/advieswijzer"[^>]*>Start de Advieswijzer<\/a>/)
    expect(html).toMatch(/href="\/diensten"[^>]*>Bekijk diensten<\/a>/)
    expect(html).toContain('De definitieve aanpak, prijs en planning spreekt u af met de professional.')
    expect(html).not.toContain('<form')
  })

  it('beschrijft het professionalprofiel en verwijst naar de bestaande registratie', () => {
    const html = renderToStaticMarkup(<ProfessionalsPage />)
    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('dienstverlenersprofiel')
    expect(html).toContain('gecontroleerde deskundigheid')
    expect(html).toContain('Aanmelden geeft geen garantie op opdrachten.')
    expect(html).toMatch(/href="\/registreren\?accountType=PROFESSIONAL"[^>]*>Meld je aan als professional<\/a>/)
    expect(html).not.toContain('<form')
  })

  it.each([[clientMetadata, publicRoutes.clients], [professionalMetadata, publicRoutes.professionals]] as const)('registreert metadata, canonical en sitemap voor %s', (metadata, href) => {
    expect(metadata.title).toContain('WorkMatchr')
    expect(metadata.description).toBeTruthy()
    expect(metadata.alternates).toEqual({ canonical: href })
    expect(metadata.openGraph).toMatchObject({ url: href })
    expect(sitemap().some(entry => new URL(entry.url).pathname === href)).toBe(true)
  })
})