import { describe, expect, it } from 'vitest'
import { getSafeReturnUrl } from '@/lib/safe-redirect'

describe('veilige return-URL', () => {
  it('accepteert een lokaal pad', () => { expect(getSafeReturnUrl('/account?tab=profiel')).toBe('/account?tab=profiel') })
  it.each(['https://evil.invalid', '//evil.invalid', '/\\evil.invalid'])('weigert externe of ambigue URL %s', (value) => { expect(getSafeReturnUrl(value)).toBe('/account') })
})
