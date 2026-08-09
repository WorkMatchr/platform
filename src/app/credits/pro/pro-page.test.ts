import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(process.cwd(), 'src/app/credits/pro/page.tsx'), 'utf8')

describe('WorkMatchr Pro-interface', () => {
  it('toont prijs, status en de bestaande Mollie-startactie', () => {
    expect(source).toContain("formatEuro(WORKMATCHR_PRO_PLAN.amountExclVatCents).replace(/\\s/g, '')")
    expect(source).toContain('excl. btw per maand')
    expect(source).toContain('Start Pro via Mollie')
    expect(source).toContain('getProSubscriptionStatusLabel(subscription)')
  })

  it('toont de opzegknop altijd en koppelt disabled aan het centrale beleid', () => {
    expect(source).toContain('>Pro opzeggen</Button>')
    expect(source).toContain('disabled={!cancellationAvailable}')
    expect(source).toContain('aria-describedby="pro-cancellation-explanation"')
    expect(source).toContain('id="pro-cancellation-explanation"')
  })

  it('toont na een succesvolle opzegging de berekende einddatum', () => {
    expect(source).toContain("opgezegd && subscription?.cancellationEffectiveAt")
    expect(source).toContain('role="status"')
  })
})
