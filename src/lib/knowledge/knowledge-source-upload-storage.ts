import { randomUUID } from 'node:crypto'

export type StoredKnowledgeSourceUpload = {
  storageKey: string
  locator: string
}

export interface KnowledgeSourceUploadStorage {
  save(bytes: Uint8Array, metadata: { checksum: string; mediaType: 'application/pdf' }): Promise<StoredKnowledgeSourceUpload>
  read(storageKey: string): Promise<{ bytes: Uint8Array; locator: string; checksum: string; mediaType: 'application/pdf' } | null>
  delete(storageKey: string): Promise<void>
}

export class KnowledgeSourceUploadStorageUnavailableError extends Error {
  constructor() {
    super('Duurzame bronbestandopslag is nog niet geconfigureerd.')
    this.name = 'KnowledgeSourceUploadStorageUnavailableError'
  }
}

export class InMemoryKnowledgeSourceUploadStorage implements KnowledgeSourceUploadStorage {
  private readonly uploads = new Map<string, { bytes: Uint8Array; locator: string; checksum: string; mediaType: 'application/pdf' }>()

  async save(bytes: Uint8Array, metadata: { checksum: string; mediaType: 'application/pdf' }) {
    const storageKey = randomUUID()
    const locator = `memory://knowledge-source-upload/${metadata.checksum}/${storageKey}`
    this.uploads.set(storageKey, { bytes: Uint8Array.from(bytes), locator, ...metadata })
    return { storageKey, locator }
  }

  async read(storageKey: string) {
    const stored = this.uploads.get(storageKey)
    return stored ? { ...stored, bytes: Uint8Array.from(stored.bytes) } : null
  }

  async delete(storageKey: string) {
    this.uploads.delete(storageKey)
  }
}

class UnavailableKnowledgeSourceUploadStorage implements KnowledgeSourceUploadStorage {
  async save(): Promise<never> { throw new KnowledgeSourceUploadStorageUnavailableError() }
  async read(): Promise<never> { throw new KnowledgeSourceUploadStorageUnavailableError() }
  async delete(): Promise<never> { throw new KnowledgeSourceUploadStorageUnavailableError() }
}

/**
 * Production blijft bewust fail-closed totdat een private, duurzame
 * object-storageadapter expliciet is gekozen en aangesloten.
 */
export function getKnowledgeSourceUploadStorage(): KnowledgeSourceUploadStorage {
  return new UnavailableKnowledgeSourceUploadStorage()
}

export function isKnowledgeSourceUploadStorageConfigured() {
  return false
}
