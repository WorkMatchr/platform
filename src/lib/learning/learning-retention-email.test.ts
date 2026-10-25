import { describe, expect, it, vi } from 'vitest'
import { createLearningRetentionEmail } from './learning-retention-email-worker'

vi.mock('server-only', () => ({}))

describe('Learning-kennisbehoudmail', () => {
  it('maakt een transactionele weekmail met betekenisvolle route en zonder score- of zwaktegegevens', () => {
    const message = createLearningRetentionEmail({
      to: 'student@example.invalid', firstName: '<Frank>', type: 'WEEK',
      destinationUrl: 'https://workmatchr.nl/e-learnings/rie-in-de-praktijk/kennisbehoud',
      idempotencyKey: 'EMAIL:user:LEARNING_RETENTION_WEEK_READY:week-1',
    })
    expect(message.subject).toBe('Je wekelijkse RI&E-kennischeck staat klaar')
    expect(message.text).toContain('omdat je zelf hebt gekozen')
    expect(message.text).toContain('zonder reclame of commerciële berichten')
    expect(message.text).toContain('op ieder moment stoppen')
    expect(message.html).toContain('href="https://workmatchr.nl/e-learnings/rie-in-de-praktijk/kennisbehoud"')
    expect(message.html).toContain('Start kennisbehoud')
    expect(message.html).toContain('&lt;Frank&gt;')
    expect(message.text).not.toMatch(/score|zwak|poging|werkgever|korting/i)
  })

  it('maakt een afzonderlijke jaarherinnering zonder verlengings- of certificaatclaim', () => {
    const message = createLearningRetentionEmail({
      to: 'student@example.invalid', firstName: 'Frank', type: 'ANNUAL',
      destinationUrl: 'https://workmatchr.nl/e-learnings/rie-in-de-praktijk/kennisbehoud/jaarlijks',
      idempotencyKey: 'EMAIL:user:LEARNING_RETENTION_ANNUAL_READY:reminder-1',
    })
    expect(message.subject).toBe('Een jaar geleden behaalde je RI&E in de praktijk')
    expect(message.text).toContain('10 vragen')
    expect(message.text).toContain('verlengt of vernieuwt je certificaat niet')
    expect(message.html).toContain('Start de jaarlijkse kennischeck')
    expect(message.text).not.toMatch(/reclame|korting|hercertificering|score/i)
  })
})
