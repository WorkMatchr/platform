import { describe, expect, it } from 'vitest'
import { emptyKnowledgeActionState, normalizeKnowledgeActionState } from './knowledge-action-state'

describe('Knowledge action-state', () => {
  it('normaliseert ontbrekende actie-uitvoer zonder runtimefout', () => {
    expect(normalizeKnowledgeActionState(undefined)).toEqual(emptyKnowledgeActionState)
    expect(normalizeKnowledgeActionState(null)).toEqual(emptyKnowledgeActionState)
  })

  it('normaliseert veldfouten en verwijdert onveilige waarden', () => {
    expect(normalizeKnowledgeActionState({
      status: 'error',
      message: 'Controleer de invoer.',
      fieldErrors: { reason: ['Geef een reden.', 42], ignored: 'geen lijst' },
    })).toEqual({
      status: 'error',
      message: 'Controleer de invoer.',
      fieldErrors: { reason: ['Geef een reden.'], ignored: undefined },
    })
  })

  it('behoudt een geldige succesvolle toestand', () => {
    expect(normalizeKnowledgeActionState({ status: 'success', message: 'Opgeslagen.', fieldErrors: {} })).toEqual({
      status: 'success', message: 'Opgeslagen.', fieldErrors: {},
    })
  })
})
