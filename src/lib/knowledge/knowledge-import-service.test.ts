import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import ai01 from '../../../data/knowledge/poc/AI-01.v1.json'
import { fingerprintKnowledgeImportPackage } from './knowledge-import-fingerprint'
import { validateKnowledgeImport } from './knowledge-import-validation'

const mocks = vi.hoisted(() => ({ getPrisma: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: mocks.getPrisma }))

import { importKnowledgePackage } from './knowledge-import-service'

let rootPath = ''
let manifestPath = ''
let packagePath = ''
let changedPackagePath = ''
let packageFingerprint = ''

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), 'workmatchr-knowledge-import-'))
  manifestPath = path.join(rootPath, 'manifest.json')
  packagePath = path.join(rootPath, 'package.json')
  changedPackagePath = path.join(rootPath, 'changed-package.json')
  const pdf = Buffer.from('%PDF-1.4\n%%EOF\n')
  const checksum = createHash('sha256').update(pdf).digest('hex')
  await mkdir(path.join(rootPath, 'ai-bladen'))
  await writeFile(path.join(rootPath, 'ai-bladen', 'source.pdf'), pdf)
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: '2.0', sources: [{ code: 'AI-01', sourceKind: 'AI_SHEET', sourceType: 'AI_SHEET', format: 'PDF', logicalPath: 'ai-bladen/source.pdf', sha256: checksum }] }))
  const input = structuredClone(ai01) as Record<string, unknown>
  ;(input.sourceVersion as Record<string, unknown>).checksum = checksum
  const validation = validateKnowledgeImport(input)
  if (!validation.package) throw new Error('Ongeldige importfixture.')
  packageFingerprint = fingerprintKnowledgeImportPackage(validation.package)
  await writeFile(packagePath, JSON.stringify(input))
  const changedInput = structuredClone(input) as Record<string, unknown>
  ;((changedInput.claims as Array<Record<string, unknown>>)[0]).statement = 'Inhoudelijk gewijzigde claim met gelijke recordaantallen.'
  await writeFile(changedPackagePath, JSON.stringify(changedInput))
})

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true })
})

beforeEach(() => {
  vi.clearAllMocks()
  process.env.KNOWLEDGE_SOURCE_ROOT = rootPath
  process.env.KNOWLEDGE_SOURCE_MANIFEST = manifestPath
  process.env.DATABASE_URL = 'postgresql://workmatchr@localhost:5432/workmatchr_test'
})

function previewDatabase(overrides: Record<string, unknown> = {}) {
  return {
    knowledgeSource: { findUnique: vi.fn().mockResolvedValue(null) },
    knowledgeSourceVersion: { findFirst: vi.fn().mockResolvedValue(null) },
    knowledgeClaim: { count: vi.fn().mockResolvedValue(0) },
    knowledgeFragment: { count: vi.fn().mockResolvedValue(0) },
    knowledgeTopic: { findMany: vi.fn().mockResolvedValue([]) },
    ...overrides,
  }
}

describe('generieke kennisimportservice', () => {
  it('hergebruikt een identieke import idempotent zonder tweede transactie', async () => {
    const transaction = vi.fn()
    mocks.getPrisma.mockReturnValue(previewDatabase({
      knowledgeSource: { findUnique: vi.fn().mockResolvedValue({ id: 'source-id', sourceType: 'AI_SHEET', sourceFormat: 'PDF', title: 'Arbo- en verzuimbeleid' }) },
      knowledgeSourceVersion: { findFirst: vi.fn().mockResolvedValue({ id: 'version-id', sourceId: 'source-id', checksum: createHash('sha256').update(Buffer.from('%PDF-1.4\n%%EOF\n')).digest('hex'), importRevision: 1, contentFingerprint: packageFingerprint }) },
      knowledgeClaim: { count: vi.fn().mockResolvedValue(ai01.claims.length) },
      knowledgeFragment: { count: vi.fn().mockResolvedValue(ai01.fragments.length) },
      $transaction: transaction,
    }))

    await expect(importKnowledgePackage(packagePath, { confirm: true })).resolves.toMatchObject({ sourceId: 'source-id', sourceVersionId: 'version-id', reused: true })
    expect(transaction).not.toHaveBeenCalled()
  })

  it('weigert dezelfde checksum en aantallen bij inhoudelijk gewijzigde claimtekst', async () => {
    const transaction = vi.fn()
    mocks.getPrisma.mockReturnValue(previewDatabase({
      knowledgeSource: { findUnique: vi.fn().mockResolvedValue({ id: 'source-id', sourceType: 'AI_SHEET', sourceFormat: 'PDF', title: 'Arbo- en verzuimbeleid' }) },
      knowledgeSourceVersion: { findFirst: vi.fn().mockResolvedValue({ id: 'version-id', sourceId: 'source-id', checksum: createHash('sha256').update(Buffer.from('%PDF-1.4\n%%EOF\n')).digest('hex'), importRevision: 1, contentFingerprint: packageFingerprint }) },
      knowledgeClaim: { count: vi.fn().mockResolvedValue(ai01.claims.length) },
      knowledgeFragment: { count: vi.fn().mockResolvedValue(ai01.fragments.length) },
      $transaction: transaction,
    }))

    await expect(importKnowledgePackage(changedPackagePath, { confirm: true })).rejects.toMatchObject({ code: 'CONTENT_MISMATCH' })
    expect(transaction).not.toHaveBeenCalled()
  })

  it('weigert een onbevoegde actor voordat gegevens worden geschreven', async () => {
    const tx = { user: { findFirst: vi.fn().mockResolvedValue(null) }, knowledgeSource: { create: vi.fn() } }
    const database = previewDatabase({ $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)) })
    mocks.getPrisma.mockReturnValue(database)

    await expect(importKnowledgePackage(packagePath, { confirm: true, actorUserId: '00000000-0000-0000-0000-000000000001' })).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' })
    expect(tx.knowledgeSource.create).not.toHaveBeenCalled()
  })

  it('weigert lokale CLI-import op een externe database fail-closed', async () => {
    process.env.DATABASE_URL = 'postgresql://workmatchr@database.example.invalid:5432/workmatchr'
    const tx = { user: { findFirst: vi.fn() }, knowledgeSource: { create: vi.fn() } }
    mocks.getPrisma.mockReturnValue(previewDatabase({ $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)) }))

    await expect(importKnowledgePackage(packagePath, { confirm: true })).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' })
    expect(tx.knowledgeSource.create).not.toHaveBeenCalled()
  })
})
