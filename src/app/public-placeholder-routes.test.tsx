import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ContactPage from './contact/page'
import CookiesPage from './cookies/page'
import AboutPage from './over-workmatchr/page'

const placeholderRoutes = [
  ['Cookies', CookiesPage],
  ['Over WorkMatchr', AboutPage],
] as const

describe('publieke tussenroutes', () => {
  it('rendert Contact als volwaardige contactpagina', () => {
    const html = renderToStaticMarkup(<ContactPage />)

    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
    expect(html).toContain('Waar kunnen wij u mee helpen?')
    expect(html).toContain('Privacy en klachten')
    expect(html).not.toContain('In ontwikkeling')
    expect(html).not.toContain('href="#"')
  })

  for (const [name, Page] of placeholderRoutes) {
    it(`rendert ${name} als eerlijke tussenpagina`, () => {
      const html = renderToStaticMarkup(<Page />)
      expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1)
      expect(html).toContain('In ontwikkeling')
      expect(html).not.toContain('href="#"')
    })
  }
})
