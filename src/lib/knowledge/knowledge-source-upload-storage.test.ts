import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import {
  InMemoryKnowledgeSourceUploadStorage,
  KnowledgeSourceUploadStorageUnavailableError,
  VercelBlobKnowledgeSourceUploadStorage,
} from './knowledge-source-upload-storage'

const bytes = new TextEncoder().encode('%PDF-1.7\nprivate fixture')
const checksum = createHash('sha256').update(bytes).digest('hex')
const key = `knowledge-source-uploads/v1/sha256/${checksum.slice(0, 2)}/${checksum}.pdf`

function privateBlobClient() {
  const objects = new Map<string, Uint8Array>()
  const put = vi.fn(async (pathname: string, body: Uint8Array, options: { access: string; allowOverwrite: boolean; storeId: string }) => {
    expect(options).toMatchObject({ access: 'private', allowOverwrite: false, storeId: 'preview-store-123' })
    if (objects.has(pathname)) throw new Error('BLOB_ALREADY_EXISTS')
    objects.set(pathname, Uint8Array.from(body))
    return { pathname, url: `https://secret.private.blob.vercel-storage.com/${pathname}` }
  })
  const get = vi.fn(async (pathname: string) => {
    const body = objects.get(pathname)
    if (!body) return null
    return {
      statusCode: 200 as const,
      stream: new Blob([body.slice().buffer as ArrayBuffer], { type: 'application/pdf' }).stream(),
      blob: { contentType: 'application/pdf', size: body.length },
    }
  })
  const head = vi.fn(async (pathname: string) => {
    if (!objects.has(pathname)) throw Object.assign(new Error('missing'), { name: 'BlobNotFoundError' })
    return { pathname }
  })
  return { operations: { put, get, head }, objects }
}

const options = { storeId: 'preview-store-123', environment: 'preview' as const, runtimeEnvironment: 'preview' }

describe('private Knowledge Source Upload-opslag', () => {
  it('schrijft en leest uitsluitend private, checksumgebonden blobs zonder URL bloot te stellen', async () => {
    const client = privateBlobClient()
    const storage = new VercelBlobKnowledgeSourceUploadStorage(options, client.operations as never)
    const stored = await storage.save(bytes, { checksum, mediaType: 'application/pdf' })
    expect(stored.storageKey).toBe(key)
    expect(stored.locator).toBe(`vercel-private-blob:preview:preview-store-123:${key}`)
    expect(stored.locator).not.toContain('blob.vercel-storage.com')
    expect(await storage.exists(key)).toBe(true)
    expect(await storage.read(key)).toMatchObject({ checksum, mediaType: 'application/pdf' })
  })

  it('hergebruikt een identieke checksum en overschrijft nooit', async () => {
    const client = privateBlobClient()
    const storage = new VercelBlobKnowledgeSourceUploadStorage(options, client.operations as never)
    const first = await storage.save(bytes, { checksum, mediaType: 'application/pdf' })
    const replay = await storage.save(bytes, { checksum, mediaType: 'application/pdf' })
    expect(replay).toEqual(first)
    expect(client.operations.put).toHaveBeenCalledTimes(1)
    expect(client.objects).toHaveLength(1)
  })

  it('geeft null voor een ontbrekend object en faalt gesloten bij een storagefout', async () => {
    const client = privateBlobClient()
    const storage = new VercelBlobKnowledgeSourceUploadStorage(options, client.operations as never)
    expect(await storage.read(key)).toBeNull()
    client.operations.get.mockRejectedValueOnce(new Error('STORAGE_UNAVAILABLE'))
    await expect(storage.read(key)).rejects.toThrow('STORAGE_UNAVAILABLE')
  })

  it('laat OIDC-validatie aan de Blob SDK en weigert iedere Preview/Production-mismatch', () => {
    expect(() => new VercelBlobKnowledgeSourceUploadStorage({ ...options, runtimeEnvironment: 'production' })).toThrow(KnowledgeSourceUploadStorageUnavailableError)
  })

  it('houdt Preview en Production aantoonbaar op verschillende store-identiteiten', async () => {
    const preview = new VercelBlobKnowledgeSourceUploadStorage(options, privateBlobClient().operations as never)
    const productionClient = privateBlobClient()
    const production = new VercelBlobKnowledgeSourceUploadStorage({ storeId: 'production-store-987', environment: 'production', runtimeEnvironment: 'production' }, productionClient.operations as never)
    const previewStored = await preview.save(bytes, { checksum, mediaType: 'application/pdf' })
    // De testclient verwacht de Preview-store; pas voor Production alleen de verwachte storecheck aan.
    productionClient.operations.put.mockImplementationOnce(async (pathname, body) => {
      productionClient.objects.set(pathname, Uint8Array.from(body as Uint8Array)); return { pathname } as never
    })
    const productionStored = await production.save(bytes, { checksum, mediaType: 'application/pdf' })
    expect(previewStored.locator).toContain(':preview:preview-store-123:')
    expect(productionStored.locator).toContain(':production:production-store-987:')
    expect(productionStored.locator).not.toBe(previewStored.locator)
  })

  it('maakt ook de in-memory testadapter idempotent per checksum', async () => {
    const storage = new InMemoryKnowledgeSourceUploadStorage()
    expect(await storage.save(bytes, { checksum, mediaType: 'application/pdf' })).toEqual(await storage.save(bytes, { checksum, mediaType: 'application/pdf' }))
  })
})
