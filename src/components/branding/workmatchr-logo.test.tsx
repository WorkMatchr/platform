import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorkMatchrLogo } from './workmatchr-logo'

describe('WorkMatchrLogo', () => {
  it('gebruikt de centrale transparante asset met vaste bronverhouding', () => {
    const html = renderToStaticMarkup(<WorkMatchrLogo />)

    expect(html).toContain('%2Fbranding%2Fworkmatchr-logo.png')
    expect(html).toContain('width="1321"')
    expect(html).toContain('height="372"')
    expect(html).toContain('alt="WorkMatchr — Slim verbonden. De beste match voor uw vraag."')
    expect(html).toContain('h-auto')
  })

  it('ondersteunt een compacte responsieve variant zonder de verhouding te forceren', () => {
    const html = renderToStaticMarkup(<WorkMatchrLogo size="compact" />)

    expect(html).toContain('w-32 sm:w-40')
    expect(html).toContain('h-auto')
  })
})
