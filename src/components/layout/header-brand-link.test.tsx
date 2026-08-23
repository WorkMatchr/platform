import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HeaderBrandLink } from './header-brand-link'

const mocks = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({ usePathname: () => mocks.pathname }))

describe('HeaderBrandLink', () => {
  beforeEach(() => {
    mocks.pathname = '/'
  })

  it('gebruikt op de homepage de centrale grotere UI-logobreedte', () => {
    const html = renderToStaticMarkup(<HeaderBrandLink />)

    expect(html).toContain('w-[10.8rem]')
    expect(html).toContain('sm:w-[14.4rem]')
    expect(html).toContain('(min-width: 640px) 230.4px, 172.8px')
  })

  it('gebruikt op andere routes dezelfde centrale UI-logobreedte', () => {
    mocks.pathname = '/kenniscentrum'

    const html = renderToStaticMarkup(<HeaderBrandLink />)

    expect(html).toContain('w-[10.8rem] sm:w-[14.4rem]')
  })
})
