import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { creditTransactionTypeLabels } from '@/lib/marketplace/marketplace-presentation'

describe('creditmutaties in de klantomgeving', () => {
  it('gebruikt de bestaande Nederlandse labels, zonder financiële regels te wijzigen', () => {
    const page = readFileSync('src/app/credits/page.tsx', 'utf8')
    expect(page).toContain("creditTransactionTypeLabels[transaction.type] ?? 'Status niet beschikbaar'")
    expect(page).not.toContain('{transaction.type}</p>')
    expect(creditTransactionTypeLabels.PARTICIPATION_PAYMENT).toBe('Deelnameplaats betaald')
    expect(creditTransactionTypeLabels.ADMIN_GRANT).toBe('Toegekend door beheer')
  })
})
