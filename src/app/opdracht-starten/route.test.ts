import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../advieswijzer/route'
import sitemap from '../sitemap'
import { getSafeReturnUrl } from '@/lib/safe-redirect'
import { publicRoutes } from '@/content/public-routes'

describe('canonieke opdrachtstart', () => {
  it.each(['', '?start=deskundigheid', '?start=onderwerp', '?start=onbekend&context=RIE&draftId=synthetic&tag=a&tag=b&returnTo=%2Fopdrachten'])('behoudt parameters bij één 301: %s', async query => {
    const response = GET(new NextRequest(`https://www.workmatchr.nl/advieswijzer${query}`))
    expect(response.status).toBe(301)
    const target = new URL(response.headers.get('location')!, 'https://www.workmatchr.nl')
    expect(target.pathname).toBe(publicRoutes.adviceGuide)
    expect([...target.searchParams]).toEqual([...new URLSearchParams(query)])
  })
  it('behoudt een bestaande login-returnTo met parameters en wijst externe doelen af', () => {
    const returnTo = getSafeReturnUrl('/advieswijzer?start=onderwerp&context=RIE')
    const response = GET(new NextRequest(new URL(returnTo, 'https://www.workmatchr.nl')))
    expect(response.headers.get('location')).toBe('/opdracht-starten?start=onderwerp&context=RIE')
    expect(getSafeReturnUrl('//external.invalid')).toBe('/account')
  })
  it('behoudt ook de lokale oorsprong zonder localhost-normalisatie', () => {
    const response = GET(new NextRequest('http://127.0.0.1:3036/advieswijzer?start=onderwerp'))
    expect(response.headers.get('location')).toBe('/opdracht-starten?start=onderwerp')
  })
  it('indexeert uitsluitend de canonieke route, precies eenmaal', () => {
    const paths = sitemap().map(entry => new URL(entry.url).pathname)
    expect(paths.filter(path => path === '/opdracht-starten')).toHaveLength(1)
    expect(paths).not.toContain('/advieswijzer')
  })
})
