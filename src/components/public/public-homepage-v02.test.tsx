import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PublicHomepageV02 } from './public-homepage-v02'
import { publicRoutes } from '@/content/public-routes'

describe('homepage hero actions', () => {
  it('preserves both destinations and gives the secondary action an outline', () => {
    const html = renderToStaticMarkup(<PublicHomepageV02 />)
    const links = [...html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/g)]
    const primary = links.find(link => link[2] === 'Start uw opdracht')
    const secondary = links.find(link => link[2] === 'Ontdek eerst wat u nodig heeft')
    expect(primary?.[1]).toContain(`href="${publicRoutes.adviceGuide}"`)
    expect(primary?.[1]).toContain('bg-brand-primary text-text-on-dark')
    expect(secondary?.[1]).toContain('href="#advieswijzer"')
    expect(secondary?.[1]).toContain('border border-border bg-surface text-brand-dark')
    expect(secondary?.[1]).toContain('hover:border-brand-primary hover:bg-brand-primary-subtle')
    expect(secondary?.[1]).toContain('min-h-11')
    expect(secondary?.[1]).not.toContain('bg-transparent')
    expect(html).toContain('id="advieswijzer"')
  })
})
