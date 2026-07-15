import { describe, expect, it } from 'vitest'
import { canonicalizeProviderJson, hashProviderJson } from './provider-canonical-json'

describe('canonical provider JSON', () => {
  it('sorteert objectsleutels deterministisch en bewaart arrayvolgorde', () => {
    expect(canonicalizeProviderJson({ z: [2, 1], a: { d: true, c: null } })).toBe('{"a":{"c":null,"d":true},"z":[2,1]}')
  })

  it('levert de vastgelegde SHA-256 golden vector', () => {
    expect(hashProviderJson({ b: 2, a: 1 })).toEqual({
      canonicalJson: '{"a":1,"b":2}',
      sha256: '43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777',
    })
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 1.5])('weigert niet-deterministische numerieke waarde %s', (value) => {
    expect(() => canonicalizeProviderJson({ value })).toThrow(TypeError)
  })
})
