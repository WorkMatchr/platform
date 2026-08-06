import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RegisterForm } from './register-form'

describe('registratie per accounttype', () => {
  it('laat de gebruiker kiezen tussen Bedrijf en Professional', () => {
    const html = renderToStaticMarkup(<RegisterForm />)

    expect(html).toContain('Hoe wilt u WorkMatchr gebruiken?')
    expect(html).toContain('value="CLIENT"')
    expect(html).toContain('value="PROFESSIONAL"')
    expect(html).toContain('Bedrijf')
    expect(html).toContain('Professional')
  })
})
