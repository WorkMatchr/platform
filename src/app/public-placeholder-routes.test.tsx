import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AdviceGuidePage from './advieswijzer/page'
import ContactPage from './contact/page'
import CookiesPage from './cookies/page'
import ServicesPage from './diensten/page'
import KnowledgeCenterPage from './kenniscentrum/page'
import AboutPage from './over-workmatchr/page'
import SectorsPage from './sectoren/page'
import LegalObligationsPage from './wettelijke-verplichtingen/page'

const routes = [
  ['Advieswijzer', AdviceGuidePage],
  ['Contact', ContactPage],
  ['Cookies', CookiesPage],
  ['Diensten', ServicesPage],
  ['Kenniscentrum', KnowledgeCenterPage],
  ['Over WorkMatchr', AboutPage],
  ['Sectoren', SectorsPage],
  ['Wettelijke verplichtingen', LegalObligationsPage],
] as const

describe('publieke tussenroutes', () => {
  for (const [name, Page] of routes) {
    it(`rendert ${name} als eerlijke tussenpagina`, () => {
      const html = renderToStaticMarkup(<Page />)
      expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
      expect(html).toContain('In ontwikkeling')
      expect(html).not.toContain('href="#"')
    })
  }
})
