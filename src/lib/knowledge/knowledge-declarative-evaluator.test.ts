import { describe, expect, it } from 'vitest'
import { evaluateSafeExpression, scoreChecklist } from './knowledge-declarative-evaluator'

describe('veilige declaratieve kennislogica', () => {
  it('evalueert alleen bekende operatoren deterministisch', () => {
    const expression = { all: [{ gte: [{ field: 'hours' }, { value: 0 }] }, { lte: [{ field: 'hours' }, { value: 24 }] }] }
    expect(evaluateSafeExpression(expression, { hours: 8 })).toBe(true)
    expect(() => evaluateSafeExpression({ execute: 'code' }, {})).toThrow('Niet-ondersteunde')
  })

  it('weigert ontbrekende checklistantwoorden en scoort volledige antwoorden', () => {
    const items = [{ order: 1, required: true, scoreRules: { true: 0, false: 1 } }]
    expect(scoreChecklist(items, {})).toEqual({ complete: false, missing: [1], score: null })
    expect(scoreChecklist(items, { 1: false })).toEqual({ complete: true, missing: [], score: 1 })
  })
})
