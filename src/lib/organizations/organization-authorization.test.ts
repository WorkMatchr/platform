import { describe, expect, it } from 'vitest'
import { selectActiveMembership } from './organization-policy'

const memberships = [{ organization: { id: 'own-a' } }, { organization: { id: 'own-b' } }]

describe('actieve organisatiekeuze', () => {
  it('accepteert uitsluitend een organisatie uit de gevalideerde memberships', () => {
    expect(selectActiveMembership(memberships, 'own-b')?.organization.id).toBe('own-b')
    expect(selectActiveMembership(memberships, 'foreign-id')?.organization.id).toBe('own-a')
  })

  it('selecteert de enige membership automatisch en geeft null zonder memberships', () => {
    expect(selectActiveMembership([memberships[0]])?.organization.id).toBe('own-a')
    expect(selectActiveMembership([], 'foreign-id')).toBeNull()
  })
})
