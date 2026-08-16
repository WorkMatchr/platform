import { randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import type { FullSourceExtraction } from './knowledge-extractor'
import { normalizeKnowledgeSourceText } from './knowledge-extractor'

type DatabaseClient = ReturnType<typeof getPrisma>
type TransactionClient = Prisma.TransactionClient

export type StoreFullSourceResult = {
  extractionRunId: string
  created: boolean
  linkedFragmentCount: number
}

async function linkExistingFragments(
  tx: Prisma.TransactionClient,
  sourceVersionId: string,
  extractionRunId: string,
) {
  const [fragments, blocks] = await Promise.all([
    tx.knowledgeFragment.findMany({
      where: { sourceVersionId, internalExcerpt: { not: null } },
      select: { id: true, pageFrom: true, pageTo: true, sectionPath: true, internalExcerpt: true },
    }),
    tx.knowledgeSourceBlock.findMany({
      where: { extractionRunId },
      select: { id: true, globalSequence: true, sectionPath: true, exactText: true, sourcePage: { select: { pageNumber: true } } },
      orderBy: { globalSequence: 'asc' },
    }),
  ])

  let linkedFragmentCount = 0
  for (const fragment of fragments) {
    const excerpt = normalizeKnowledgeSourceText(fragment.internalExcerpt ?? '')
    const pageFrom = fragment.pageFrom ?? 1
    const pageTo = fragment.pageTo ?? fragment.pageFrom ?? Number.MAX_SAFE_INTEGER
    const candidates = blocks.filter((block) => block.sourcePage.pageNumber >= pageFrom && block.sourcePage.pageNumber <= pageTo)
    const directMatches = excerpt ? candidates.filter((block) => {
      const blockText = normalizeKnowledgeSourceText(block.exactText)
      return blockText.includes(excerpt) || excerpt.includes(blockText)
    }) : []
    const section = normalizeKnowledgeSourceText(fragment.sectionPath ?? '')
    const sectionMatches = !excerpt && section
      ? candidates.filter((block) => normalizeKnowledgeSourceText(block.sectionPath ?? '') === section)
      : []
    const matches = directMatches.length > 0
      ? directMatches
      : sectionMatches.length > 0
        ? sectionMatches
        : excerpt ? candidates.filter((block, index) => {
          const window = candidates.slice(index, index + 4).map((entry) => normalizeKnowledgeSourceText(entry.exactText)).join(' ')
          return window.includes(excerpt)
        }) : []
    if (matches.length === 0) continue
    await tx.knowledgeFragmentBlock.createMany({
      data: matches.map((block, index) => ({ fragmentId: fragment.id, blockId: block.id, sequence: index + 1 })),
      skipDuplicates: true,
    })
    linkedFragmentCount += 1
  }
  return linkedFragmentCount
}

export async function storeKnowledgeFullSourceInTransaction(
  sourceVersionId: string,
  extraction: FullSourceExtraction,
  tx: TransactionClient,
): Promise<StoreFullSourceResult> {
  const existing = await tx.knowledgeExtractionRun.findUnique({
    where: { sourceVersionId_extractionFingerprint: { sourceVersionId, extractionFingerprint: extraction.extractionFingerprint } },
    select: { id: true },
  })
  if (existing) return { extractionRunId: existing.id, created: false, linkedFragmentCount: 0 }

  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "KnowledgeSourceVersion" WHERE "id" = ${sourceVersionId}::uuid FOR UPDATE`)
      const duplicate = await tx.knowledgeExtractionRun.findUnique({
        where: { sourceVersionId_extractionFingerprint: { sourceVersionId, extractionFingerprint: extraction.extractionFingerprint } },
        select: { id: true },
      })
      if (duplicate) return { extractionRunId: duplicate.id, created: false, linkedFragmentCount: 0 }

      const previousRun = await tx.knowledgeExtractionRun.findFirst({
        where: { sourceVersionId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { id: true },
      })
      const extractionRunId = randomUUID()
      const startedAt = new Date()
      await tx.knowledgeExtractionRun.create({
        data: {
          id: extractionRunId,
          sourceVersionId,
          previousRunId: previousRun?.id,
          extractorName: extraction.extractorName,
          extractorVersion: extraction.extractorVersion,
          configurationVersion: extraction.configurationVersion,
          status: 'COMPLETED',
          pageCount: extraction.pageCount,
          extractionFingerprint: extraction.extractionFingerprint,
          warningSummary: extraction.warningSummary,
          startedAt,
          completedAt: new Date(),
          pages: {
            create: extraction.pages.map((page) => ({
              id: randomUUID(),
              pageNumber: page.pageNumber,
              status: page.status,
              textHash: page.textHash,
              ocrUsed: page.ocrUsed,
              confidence: page.confidence,
              blocks: {
                create: page.blocks.map((block) => ({
                  globalSequence: block.globalSequence,
                  pageSequence: block.pageSequence,
                  sectionPath: block.sectionPath,
                  blockType: block.blockType,
                  exactText: block.exactText,
                  normalizedSearchText: block.normalizedSearchText,
                  textHash: block.textHash,
                  extractionMethod: block.extractionMethod,
                  confidence: block.confidence,
                  requiresReview: block.requiresReview,
                })),
              },
            })),
          },
        },
      })
      const linkedFragmentCount = await linkExistingFragments(tx, sourceVersionId, extractionRunId)
  return { extractionRunId, created: true, linkedFragmentCount }
}

export async function storeKnowledgeFullSource(
  sourceVersionId: string,
  extraction: FullSourceExtraction,
  database: DatabaseClient = getPrisma(),
): Promise<StoreFullSourceResult> {
  try {
    return await database.$transaction((tx) => storeKnowledgeFullSourceInTransaction(sourceVersionId, extraction, tx), { isolationLevel: 'Serializable' })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      const concurrent = await database.knowledgeExtractionRun.findUniqueOrThrow({
        where: { sourceVersionId_extractionFingerprint: { sourceVersionId, extractionFingerprint: extraction.extractionFingerprint } },
        select: { id: true },
      })
      return { extractionRunId: concurrent.id, created: false, linkedFragmentCount: 0 }
    }
    throw error
  }
}
