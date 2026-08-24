import { createHash } from 'node:crypto'
import { BlobNotFoundError, get, head, put } from '@vercel/blob'

export type StoredKnowledgeSourceUpload = {
  storageKey: string
  locator: string
}

export interface KnowledgeSourceUploadStorage {
  save(bytes: Uint8Array, metadata: { checksum: string; mediaType: 'application/pdf' }): Promise<StoredKnowledgeSourceUpload>
  read(storageKey: string): Promise<{ bytes: Uint8Array; locator: string; checksum: string; mediaType: 'application/pdf' } | null>
  exists(storageKey: string): Promise<boolean>
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
    const storageKey = objectKey(metadata.checksum)
    const existing = this.uploads.get(storageKey)
    if (existing) {
      if (sha256(existing.bytes) !== metadata.checksum) throw new KnowledgeSourceUploadStorageUnavailableError()
      return { storageKey, locator: existing.locator }
    }
    const locator = `memory://knowledge-source-upload/${metadata.checksum}/${storageKey}`
    this.uploads.set(storageKey, { bytes: Uint8Array.from(bytes), locator, ...metadata })
    return { storageKey, locator }
  }

  async read(storageKey: string) {
    const stored = this.uploads.get(storageKey)
    return stored ? { ...stored, bytes: Uint8Array.from(stored.bytes) } : null
  }

  async exists(storageKey: string) { return this.uploads.has(storageKey) }
}

class UnavailableKnowledgeSourceUploadStorage implements KnowledgeSourceUploadStorage {
  async save(): Promise<never> { throw new KnowledgeSourceUploadStorageUnavailableError() }
  async read(): Promise<never> { throw new KnowledgeSourceUploadStorageUnavailableError() }
  async exists(): Promise<never> { throw new KnowledgeSourceUploadStorageUnavailableError() }
}

type BlobOperations = {
  put: typeof put
  get: typeof get
  head: typeof head
}

type VercelBlobStorageOptions = {
  storeId: string
  environment: 'preview' | 'production'
  runtimeEnvironment: string | undefined
}

const blobOperations: BlobOperations = { put, get, head }
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const objectKey = (checksum: string) => `knowledge-source-uploads/v1/sha256/${checksum.slice(0, 2)}/${checksum}.pdf`

function assertStorageKey(storageKey: string) {
  if (!/^knowledge-source-uploads\/v1\/sha256\/[0-9a-f]{2}\/[0-9a-f]{64}\.pdf$/u.test(storageKey)) throw new KnowledgeSourceUploadStorageUnavailableError()
}

function assertBlobConfiguration(options: VercelBlobStorageOptions) {
  if (!/^[A-Za-z0-9_-]{8,128}$/u.test(options.storeId)
    || options.runtimeEnvironment !== options.environment) throw new KnowledgeSourceUploadStorageUnavailableError()
}

export class VercelBlobKnowledgeSourceUploadStorage implements KnowledgeSourceUploadStorage {
  constructor(
    private readonly options: VercelBlobStorageOptions,
    private readonly blobs: BlobOperations = blobOperations,
  ) { assertBlobConfiguration(options) }

  private locator(storageKey: string) {
    return `vercel-private-blob:${this.options.environment}:${this.options.storeId}:${storageKey}`
  }

  async exists(storageKey: string) {
    assertStorageKey(storageKey)
    try {
      await this.blobs.head(storageKey, { storeId: this.options.storeId })
      return true
    } catch (error) {
      if (error instanceof BlobNotFoundError || (error instanceof Error && error.name === 'BlobNotFoundError')) return false
      throw error
    }
  }

  async read(storageKey: string) {
    assertStorageKey(storageKey)
    const result = await this.blobs.get(storageKey, { access: 'private', useCache: false, storeId: this.options.storeId })
    if (!result || result.statusCode !== 200) return null
    if (result.blob.contentType !== 'application/pdf') throw new KnowledgeSourceUploadStorageUnavailableError()
    const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer())
    const checksum = storageKey.slice(storageKey.lastIndexOf('/') + 1, -4)
    if (sha256(bytes) !== checksum || result.blob.size !== bytes.length) throw new KnowledgeSourceUploadStorageUnavailableError()
    return { bytes, locator: this.locator(storageKey), checksum, mediaType: 'application/pdf' as const }
  }

  async save(bytes: Uint8Array, metadata: { checksum: string; mediaType: 'application/pdf' }) {
    if (sha256(bytes) !== metadata.checksum) throw new KnowledgeSourceUploadStorageUnavailableError()
    const storageKey = objectKey(metadata.checksum)
    const existing = await this.read(storageKey)
    if (existing) return { storageKey, locator: existing.locator }
    try {
      await this.blobs.put(storageKey, Buffer.from(bytes), {
        access: 'private', addRandomSuffix: false, allowOverwrite: false,
        contentType: metadata.mediaType, maximumSizeInBytes: 10 * 1024 * 1024,
        storeId: this.options.storeId,
      })
    } catch (error) {
      // Een gelijktijdige identieke upload mag winnen; een afwijkende fout blijft fail-closed.
      const concurrent = await this.read(storageKey)
      if (!concurrent) throw error
      return { storageKey, locator: concurrent.locator }
    }
    const stored = await this.read(storageKey)
    if (!stored) throw new KnowledgeSourceUploadStorageUnavailableError()
    return { storageKey, locator: stored.locator }
  }
}

/**
 * Production blijft bewust fail-closed totdat een private, duurzame
 * object-storageadapter expliciet is gekozen en aangesloten.
 */
export function getKnowledgeSourceUploadStorage(): KnowledgeSourceUploadStorage {
  const environment = process.env.KNOWLEDGE_UPLOAD_BLOB_ENVIRONMENT
  const storeId = process.env.KNOWLEDGE_UPLOAD_BLOB_STORE_ID
  if ((environment === 'preview' || environment === 'production') && storeId) {
    return new VercelBlobKnowledgeSourceUploadStorage({
      environment,
      storeId,
      runtimeEnvironment: process.env.VERCEL_ENV,
    })
  }
  return new UnavailableKnowledgeSourceUploadStorage()
}

export function isKnowledgeSourceUploadStorageConfigured() {
  try { getKnowledgeSourceUploadStorage(); return Boolean(process.env.KNOWLEDGE_UPLOAD_BLOB_STORE_ID) } catch { return false }
}

export function knowledgeSourceUploadStorageKeyFromLocator(locator: string) {
  const environment = process.env.KNOWLEDGE_UPLOAD_BLOB_ENVIRONMENT
  const storeId = process.env.KNOWLEDGE_UPLOAD_BLOB_STORE_ID
  if (!environment || !storeId) throw new KnowledgeSourceUploadStorageUnavailableError()
  const prefix = `vercel-private-blob:${environment}:${storeId}:`
  if (!locator.startsWith(prefix)) throw new KnowledgeSourceUploadStorageUnavailableError()
  const storageKey = locator.slice(prefix.length)
  assertStorageKey(storageKey)
  return storageKey
}
