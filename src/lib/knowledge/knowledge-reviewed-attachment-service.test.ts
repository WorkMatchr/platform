import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateKnowledgeImport } from './knowledge-import-validation'

const mocks = vi.hoisted(() => ({ getPrisma: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: mocks.getPrisma }))
import { attachReviewedKnowledgeToExistingSourceVersion } from './knowledge-reviewed-attachment-service'

const sourceVersionId = '00000000-0000-4000-8000-000000000001'
const sourceBlockId = '00000000-0000-4000-8000-000000000002'
const sourceId = '00000000-0000-4000-8000-000000000003'
const blockText = 'Een systematische risico-inventarisatie vormt de basis voor gerichte maatregelen.'
const blockTextHash = createHash('sha256').update(blockText).digest('hex')
let root = ''
let fileName = ''
let packageInput: Record<string, unknown>

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'reviewed-attachment-'))
  await mkdir(path.join(root, 'ai-bladen'))
  const pdf = Buffer.from('%PDF-1.4\n%%EOF\n')
  const checksum = createHash('sha256').update(pdf).digest('hex')
  await writeFile(path.join(root, 'ai-bladen', 'source.pdf'), pdf)
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify({ schemaVersion: '2.0', sources: [{ code: 'AI-03', sourceKind: 'AI_SHEET', sourceType: 'AI_SHEET', format: 'PDF', logicalPath: 'ai-bladen/source.pdf', sha256: checksum }] }))
  packageInput = {
    schemaVersion: '1.1',
    source: { code: 'AI-03', title: 'Asbest', publisher: 'Sdu', publicationDate: '2001-01-01', edition: 'Tweede druk', applicabilityScope: 'Historische vakinformatie', metadataStatus: 'COMPLETE', language: 'nl', jurisdiction: 'NL', sourceType: 'AI_SHEET', sourceFormat: 'PDF', copyrightClassification: 'RESTRICTED_REFERENCE_ONLY', authorityLevel: 'PROFESSIONAL_GUIDANCE', temporalStatus: 'HISTORICAL', sourceFamily: 'SZW-AI-BLADEN', independenceGroup: 'SZW-AI-BLADEN', isPrimarySource: false },
    sourceVersion: { externalKey: 'ai-03:v1', versionLabel: 'Tweede druk', publicationDate: '2001-01-01', checksum, extractionStatus: 'EXTRACTED', reviewStatus: 'REVIEW_REQUIRED' },
    topics: [{ externalKey: 'ai-03:topic', slug: 'historisch-asbest', title: 'Asbest', description: 'Historische asbestkennis.', domain: 'HAZARDOUS_SUBSTANCES' }],
    fragments: [{ externalKey: 'ai-03:f1', sourceVersionKey: 'ai-03:v1', pageFrom: 7, sectionPath: 'Risicobeoordeling', fragmentType: 'EXACT_PASSAGE', internalExcerpt: blockText, excerptHash: blockTextHash, extractionMethod: 'MANUAL_VERIFIED', requiresReview: true, sourceBlockEvidence: [{ sourceVersionId, sourceBlockId, evidenceRole: 'DIRECT_SUPPORT', blockTextHash }] }],
    claims: [{ externalKey: 'ai-03:c1', topicKey: 'ai-03:topic', claimType: 'RECOMMENDATION', statement: 'Een systematische risico-inventarisatie vormt de basis voor gerichte maatregelen.', applicability: 'Historische vakinformatie; actuele kruisvalidatie vereist.', jurisdiction: 'NL', temporalStatus: 'HISTORICAL', validationStatus: 'UNVALIDATED', publicationStatus: 'DRAFT', confidenceLevel: 'MEDIUM', accessTier: 'INTERNAL_REVIEWER', controlRisk: 'HIGH' }],
    citations: [{ claimKey: 'ai-03:c1', sourceVersionKey: 'ai-03:v1', fragmentKey: 'ai-03:f1', supportType: 'DIRECT_SUPPORT' }],
    relations: [], rules: [], calculations: [], checklists: [], procedures: [], roles: [], formTemplates: [],
    importMetadata: { createdAt: '2026-08-18T12:00:00.000Z', createdBy: 'WORKMATCHR_REVIEW', uncertainties: ['Actuele kruisvalidatie is nog vereist.'] },
  }
  fileName = path.join(root, 'attachment.json')
  await writeFile(fileName, JSON.stringify(packageInput))
})

afterAll(() => rm(root, { recursive: true, force: true }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NODE_ENV', 'test')
  process.env.DATABASE_URL = 'postgresql://workmatchr@localhost:5432/workmatchr_test'
  process.env.KNOWLEDGE_SOURCE_ROOT = root
  process.env.KNOWLEDGE_SOURCE_MANIFEST = path.join(root, 'manifest.json')
})

function transaction(overrides: Record<string, unknown> = {}) {
  const tx = {
    $queryRaw: vi.fn(),
    knowledgeSourceVersion: { findFirst: vi.fn().mockResolvedValue({ id: sourceVersionId, sourceId, checksum: (packageInput.sourceVersion as Record<string, unknown>).checksum, source: { title: 'Asbest', sourceType: 'AI_SHEET', sourceFormat: 'PDF' } }) },
    knowledgeSourceBlock: { findMany: vi.fn().mockResolvedValue([{ id: sourceBlockId, textHash: blockTextHash, exactText: blockText, sourcePage: { extractionRun: { sourceVersionId, status: 'COMPLETED' } } }]) },
    knowledgeFragment: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: 'fragment-id' }) },
    knowledgeFragmentBlock: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    knowledgeClaim: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: 'claim-id' }) },
    knowledgeTopic: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'topic-id' }) },
    knowledgeCitation: { create: vi.fn() },
    knowledgeAuditEvent: { create: vi.fn() },
    ...overrides,
  }
  return tx
}

describe('Reviewed Claims Attachment', () => {
  it('vereist expliciete block-evidence voor het attachmentprofiel', async () => {
    const withoutEvidence = structuredClone(packageInput)
    delete ((withoutEvidence.fragments as Array<Record<string, unknown>>)[0]).sourceBlockEvidence
    expect(validateKnowledgeImport(withoutEvidence).valid).toBe(true)
    await writeFile(fileName, JSON.stringify(withoutEvidence))
    mocks.getPrisma.mockReturnValue({})
    await expect(attachReviewedKnowledgeToExistingSourceVersion(fileName, { confirm: true })).rejects.toMatchObject({ code: 'ATTACHMENT_VALIDATION_FAILED' })
    await writeFile(fileName, JSON.stringify(packageInput))
  })

  it('schrijft claim, fragment, citatie en blocklink in één transactie zonder bronversie te maken', async () => {
    const tx = transaction()
    mocks.getPrisma.mockReturnValue({ $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)) })
    await expect(attachReviewedKnowledgeToExistingSourceVersion(fileName, { confirm: true })).resolves.toMatchObject({ sourceVersionId, reused: false })
    expect(tx.knowledgeFragment.create).toHaveBeenCalledOnce()
    expect(tx.knowledgeFragmentBlock.createMany).toHaveBeenCalledOnce()
    expect(tx.knowledgeClaim.create).toHaveBeenCalledOnce()
    expect(tx.knowledgeCitation.create).toHaveBeenCalledOnce()
    expect(tx.knowledgeSourceVersion.findFirst).toHaveBeenCalledOnce()
  })

  it('weigert een blok van een andere bronversie vóór enige inhoudswrite', async () => {
    const tx = transaction({ knowledgeSourceBlock: { findMany: vi.fn().mockResolvedValue([{ id: sourceBlockId, textHash: blockTextHash, exactText: blockText, sourcePage: { extractionRun: { sourceVersionId: '00000000-0000-4000-8000-000000000099', status: 'COMPLETED' } } }]) } })
    mocks.getPrisma.mockReturnValue({ $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)) })
    await expect(attachReviewedKnowledgeToExistingSourceVersion(fileName, { confirm: true })).rejects.toMatchObject({ code: 'SOURCE_BLOCK_VERSION_MISMATCH' })
    expect(tx.knowledgeFragment.create).not.toHaveBeenCalled()
  })

  it('hergebruikt een inhoudelijk en evidentiëel identieke attachment', async () => {
    const tx = transaction({
      knowledgeFragment: {
        findMany: vi.fn().mockResolvedValue([{ id: 'fragment-id', externalKey: 'ai-03:f1', sourceVersionId, pageFrom: 7, pageTo: null, sectionPath: 'Risicobeoordeling', fragmentType: 'EXACT_PASSAGE', internalExcerpt: blockText, excerptHash: blockTextHash, extractionMethod: 'MANUAL_VERIFIED', requiresReview: true, sourceBlocks: [{ blockId: sourceBlockId, sequence: 1 }] }]),
        create: vi.fn(),
      },
      knowledgeClaim: {
        findMany: vi.fn().mockResolvedValue([{ externalKey: 'ai-03:c1', topic: { slug: 'historisch-asbest' }, claimType: 'RECOMMENDATION', statement: 'Een systematische risico-inventarisatie vormt de basis voor gerichte maatregelen.', normalizedStatement: null, applicability: 'Historische vakinformatie; actuele kruisvalidatie vereist.', jurisdiction: 'NL', validFrom: null, validUntil: null, temporalStatus: 'HISTORICAL', validationStatus: 'UNVALIDATED', publicationStatus: 'DRAFT', confidenceLevel: 'MEDIUM', accessTier: 'INTERNAL_REVIEWER', controlRisk: 'HIGH', citations: [{ sourceVersionId, supportType: 'DIRECT_SUPPORT', citationNote: null, fragment: { externalKey: 'ai-03:f1' } }] }]),
        create: vi.fn(),
      },
    })
    mocks.getPrisma.mockReturnValue({ $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)) })
    await expect(attachReviewedKnowledgeToExistingSourceVersion(fileName, { confirm: true })).resolves.toMatchObject({ reused: true })
    expect(tx.knowledgeFragment.create).not.toHaveBeenCalled()
    expect(tx.knowledgeClaim.create).not.toHaveBeenCalled()
  })

  it('weigert afwijkende replay met dezelfde codes', async () => {
    const tx = transaction({
      knowledgeFragment: { findMany: vi.fn().mockResolvedValue([{ externalKey: 'ai-03:f1', sourceVersionId, pageFrom: 7, pageTo: null, sectionPath: 'Andere sectie', fragmentType: 'EXACT_PASSAGE', internalExcerpt: blockText, excerptHash: blockTextHash, extractionMethod: 'MANUAL_VERIFIED', requiresReview: true, sourceBlocks: [{ blockId: sourceBlockId, sequence: 1 }] }]), create: vi.fn() },
      knowledgeClaim: { findMany: vi.fn().mockResolvedValue([{ externalKey: 'ai-03:c1' }]), create: vi.fn() },
    })
    mocks.getPrisma.mockReturnValue({ $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)) })
    await expect(attachReviewedKnowledgeToExistingSourceVersion(fileName, { confirm: true })).rejects.toMatchObject({ code: 'ATTACHMENT_CONTENT_MISMATCH' })
    expect(tx.knowledgeFragment.create).not.toHaveBeenCalled()
  })

  it('laat een fout halverwege door de gedeelde transactie terugrollen', async () => {
    const tx = transaction({ knowledgeCitation: { create: vi.fn().mockRejectedValue(new Error('forced')) } })
    const transactionCall = vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx))
    mocks.getPrisma.mockReturnValue({ $transaction: transactionCall })
    await expect(attachReviewedKnowledgeToExistingSourceVersion(fileName, { confirm: true })).rejects.toThrow('forced')
    expect(transactionCall).toHaveBeenCalledOnce()
  })
})
