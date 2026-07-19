import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ContactPage from './contact/page'
import CookiesPage from './cookies/page'
import AboutPage from './over-workmatchr/page'

const routes = [
  ['Contact', ContactPage],
  ['Cookies', CookiesPage],
  ['Over WorkMatchr', AboutPage],
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
