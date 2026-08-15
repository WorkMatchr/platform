import { Prisma } from '@/generated/prisma/client'
import type { KnowledgeAccessTier, KnowledgeSourceBlockType, KnowledgeTemporalStatus } from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'

export type KnowledgeFullSourceSearchInput = {
  query: string
  accessTiers: KnowledgeAccessTier[]
  sourceCode?: string
  sourceVersionId?: string
  pageNumber?: number
  blockTypes?: KnowledgeSourceBlockType[]
  temporalStatus?: KnowledgeTemporalStatus
  limit?: number
}

export type KnowledgeFullSourceSearchResult = {
  blockId: string
  sourceCode: string
  sourceTitle: string
  sourceVersionId: string
  versionLabel: string
  temporalStatus: KnowledgeTemporalStatus
  pageNumber: number
  sectionPath: string | null
  blockType: KnowledgeSourceBlockType
  exactText: string
  rank: number
  accessTier: 'INTERNAL_REVIEWER'
}

function requireInternalKnowledgeAccess(accessTiers: KnowledgeAccessTier[]) {
  if (!accessTiers.includes('INTERNAL_REVIEWER') && !accessTiers.includes('PLATFORM_ADMIN')) {
    throw new Error('KNOWLEDGE_FULL_SOURCE_ACCESS_DENIED')
  }
}

export async function searchKnowledgeFullSource(input: KnowledgeFullSourceSearchInput) {
  requireInternalKnowledgeAccess(input.accessTiers)
  const query = input.query.trim()
  if (query.length < 2 || query.length > 300) throw new Error('KNOWLEDGE_FULL_SOURCE_QUERY_INVALID')
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50)
  const blockTypeFilter = input.blockTypes?.length
    ? Prisma.sql`AND block."blockType" IN (${Prisma.join(input.blockTypes.map((type) => Prisma.sql`${type}::"KnowledgeSourceBlockType"`))})`
    : Prisma.empty

  return getPrisma().$queryRaw<KnowledgeFullSourceSearchResult[]>(Prisma.sql`
    WITH latest_runs AS (
      SELECT DISTINCT ON (run."sourceVersionId") run."id", run."sourceVersionId"
      FROM "KnowledgeExtractionRun" run
      WHERE run."status" = 'COMPLETED'
      ORDER BY run."sourceVersionId", run."createdAt" DESC, run."id" DESC
    ), query AS (
      SELECT websearch_to_tsquery('dutch', ${query}) AS value
    )
    SELECT
      block."id" AS "blockId",
      source."code" AS "sourceCode",
      source."title" AS "sourceTitle",
      version."id" AS "sourceVersionId",
      version."versionLabel",
      source."temporalStatus",
      page."pageNumber",
      block."sectionPath",
      block."blockType",
      block."exactText",
      (ts_rank_cd(block."searchVector", query.value) * CASE WHEN block."blockType" = 'HEADER_FOOTER' THEN 0.1 ELSE 1 END)::float8 AS rank,
      'INTERNAL_REVIEWER'::text AS "accessTier"
    FROM latest_runs latest
    JOIN "KnowledgeSourceVersion" version ON version."id" = latest."sourceVersionId"
    JOIN "KnowledgeSource" source ON source."id" = version."sourceId"
    JOIN "KnowledgeSourcePage" page ON page."extractionRunId" = latest."id"
    JOIN "KnowledgeSourceBlock" block ON block."sourcePageId" = page."id" AND block."extractionRunId" = latest."id"
    CROSS JOIN query
    WHERE block."searchVector" @@ query.value
      ${input.sourceCode ? Prisma.sql`AND source."code" = ${input.sourceCode}` : Prisma.empty}
      ${input.sourceVersionId ? Prisma.sql`AND version."id" = ${input.sourceVersionId}::uuid` : Prisma.empty}
      ${input.pageNumber ? Prisma.sql`AND page."pageNumber" = ${input.pageNumber}` : Prisma.empty}
      ${input.temporalStatus ? Prisma.sql`AND source."temporalStatus" = ${input.temporalStatus}::"KnowledgeTemporalStatus"` : Prisma.empty}
      ${blockTypeFilter}
    ORDER BY rank DESC, source."code" ASC, page."pageNumber" ASC, block."pageSequence" ASC
    LIMIT ${limit}
  `)
}
