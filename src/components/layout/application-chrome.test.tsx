import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

import { ApplicationChrome } from './application-chrome'

function renderChrome() {
  return renderToStaticMarkup(
    <ApplicationChrome
      header={<div>Publieke header met Stel uw vraag</div>}
      banner={<div>Testmodusbanner</div>}
      footer={<div>Publieke footer</div>}
    >
      <div>Pagina-inhoud</div>
    </ApplicationChrome>,
  )
}

describe('routebewuste applicatiechrome', () => {
  beforeEach(() => {
    mocks.pathname = '/'
  })

  it('behoudt de publieke header en footer buiten platformbeheer', () => {
    const html = renderChrome()

    expect(html).toContain('Stel uw vraag')
    expect(html).toContain('Publieke footer')
    expect(html).toContain('Testmodusbanner')
  })

  it('verbergt publieke chrome op alle platformbeheerroutes', () => {
    mocks.pathname = '/platformbeheer/gebruikers'
    const html = renderChrome()

    expect(html).not.toContain('Stel uw vraag')
    expect(html).not.toContain('Publieke footer')
    expect(html).toContain('Pagina-inhoud')
    expect(html).toContain('Testmodusbanner')
    expect(html).toContain('lg:h-dvh')
    expect(html).toContain('lg:overflow-hidden')
    expect(html).toContain('lg:min-h-0')
  })

  it('behoudt buiten platformbeheer normale documenthoogte en document-scroll', () => {
    const html = renderChrome()

    expect(html).not.toContain('lg:h-dvh')
    expect(html).not.toContain('lg:overflow-hidden')
  })
})
