import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

import { ApplicationChrome, usesAuthenticatedWorkspace } from './application-chrome'
import type { HeaderViewModel } from './header-model'

const anonymousModel: HeaderViewModel = {
  authenticated: false,
  isPlatformAdministrator: false,
  displayName: '',
  activeOrganization: null,
  navigationGroups: [],
}

function renderChrome() {
  return renderToStaticMarkup(
    <ApplicationChrome
      header={<div>Publieke header met Stel uw vraag</div>}
      banner={<div>Testmodusbanner</div>}
      compactFooter={<div>Compacte workspacefooter</div>}
      footer={<div>Publieke footer</div>}
      headerModel={anonymousModel}
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

  it('beperkt de accountzijbalk tot de ingelogde werkruimte', () => {
    expect(usesAuthenticatedWorkspace('/dashboard')).toBe(true)
    expect(usesAuthenticatedWorkspace('/mijn-arbo-wijzers/run-1')).toBe(true)
    expect(usesAuthenticatedWorkspace('/kenniscentrum')).toBe(false)
    expect(usesAuthenticatedWorkspace('/wijzers/bhv')).toBe(false)
  })

  it('gebruikt voor een ingelogde werkroute een desktopgrid met vaste zijbalk', () => {
    mocks.pathname = '/opdrachten/assignment-1'
    const html = renderToStaticMarkup(
      <ApplicationChrome
        header={<div>Ingelogde header</div>}
        banner={<div>Testmodusbanner</div>}
        compactFooter={<div>Compacte workspacefooter</div>}
        footer={<div>Publieke footer</div>}
        headerModel={{
          authenticated: true,
          isPlatformAdministrator: false,
          displayName: 'Opdrachtgever',
          activeOrganization: { id: 'org-1', name: 'Organisatie BV', role: 'OWNER' },
          navigationGroups: [{ key: 'work', label: 'Werk', links: [{ href: '/opdrachten', label: 'Opdrachten' }] }],
        }}
      >
        <div>Opdrachtdetail</div>
      </ApplicationChrome>,
    )

    expect(html).toContain('lg:grid-cols-[15rem_minmax(0,1fr)]')
    expect(html).toContain('Opdrachtgever')
    expect(html).toContain('Organisatie BV')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('lg:overflow-y-auto')
    expect(html).toContain('Compacte workspacefooter')
    expect(html).not.toContain('Publieke footer')
  })
})
