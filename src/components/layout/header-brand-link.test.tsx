import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeaderBrandLink } from './header-brand-link'

const mocks = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }))

describe('HeaderBrandLink', () => {
  beforeEach(() => {
    mocks.pathname = '/'
  })

  it('renders the homepage logo at exactly 110% of the default header width', () => {
    const html = renderToStaticMarkup(<HeaderBrandLink />)

    expect(html).toContain('w-[9.9rem]')
    expect(html).toContain('sm:w-[13.2rem]')
    expect(html).toContain('(min-width: 640px) 211.2px, 158.4px')
  })

  it('keeps the default logo size on other routes', () => {
    mocks.pathname = '/kenniscentrum'

    const html = renderToStaticMarkup(<HeaderBrandLink />)

    expect(html).toContain('w-36 sm:w-48')
    expect(html).not.toContain('w-[9.9rem]')
  })
})
