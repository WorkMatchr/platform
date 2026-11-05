import { describe, expect, it, vi } from 'vitest'
import { createMeasurement, measure, conversionNames, landingPaths } from './measurement'

describe('closed, minimized measurement contract', () => {
  it('is closed in the actual application', () => {
    for (const name of conversionNames) expect(measure(name)).toBe(false)
    expect(measure('landing_view', '/')).toBe(false)
  })
  it('requires both release and affirmative consent; never replays denied events', () => {
    const receive = vi.fn(); let consent = false
    const track = createMeasurement({ enabled: true, consent: () => consent, receive })
    expect(track('advice_start')).toBe(false)
    consent = true
    expect(receive).not.toHaveBeenCalled()
    expect(track('advice_start')).toBe(true)
    consent = false
    expect(track('advice_complete')).toBe(false)
    expect(receive).toHaveBeenCalledExactlyOnceWith({ version: 1, name: 'advice_start' })
    expect(createMeasurement({ enabled: false, consent: () => true, receive })('advice_start')).toBe(false)
  })
  it('only emits fixed vocabulary: no query, fragment, ID, text, email or unknown event', () => {
    const receive = vi.fn(); const track = createMeasurement({ enabled: true, consent: () => true, receive })
    for (const path of ['/contact?email=test@example.invalid', '/#private', '/account', '/aanvragen/test-id', 'https://www.workmatchr.nl/']) expect(track('landing_view', path)).toBe(false)
    expect(track('test@example.invalid')).toBe(false)
    expect(track('client_registered')).toBe(false) // request acceptance is not a verified registration
    expect(track('advice_start', 'private answer')).toBe(false)
    expect(receive).not.toHaveBeenCalled()
    for (const path of landingPaths) expect(track('landing_view', path)).toBe(true)
    for (const name of conversionNames) expect(track(name)).toBe(true)
    expect(receive.mock.calls.every(([event]) => Object.keys(event).every(key => ['name', 'path', 'version'].includes(key)))).toBe(true)
  })
  it('isolates adapter and consent failures from user actions', () => {
    const fail = () => { throw Error('offline') }
    expect(createMeasurement({ enabled: true, consent: fail, receive: vi.fn() })('advice_start')).toBe(false)
    expect(createMeasurement({ enabled: true, consent: () => true, receive: fail })('advice_start')).toBe(false)
  })
})
