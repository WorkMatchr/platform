import { createHash } from 'node:crypto'

export type CanonicalValue = null | boolean | number | string | CanonicalValue[] | { [key: string]: CanonicalValue }

function serialize(value: CanonicalValue): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isSafeInteger(value)) {
      throw new TypeError('Canonical JSON accepteert uitsluitend eindige veilige gehele getallen.')
    }
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(serialize).join(',')}]`
  const keys = Object.keys(value).sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
  return `{${keys.map((key) => `${JSON.stringify(key)}:${serialize(value[key]!)}`).join(',')}}`
}

export function canonicalizeProviderJson(value: CanonicalValue): string {
  return serialize(value)
}

export function hashProviderJson(value: CanonicalValue): { canonicalJson: string; sha256: string } {
  const canonicalJson = canonicalizeProviderJson(value)
  return {
    canonicalJson,
    sha256: createHash('sha256').update(canonicalJson, 'utf8').digest('hex'),
  }
}
