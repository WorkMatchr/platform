import type { PrismaClient } from '../../src/generated/prisma/client'
import { testSourceExcerpt, testSourceExcerptHash, testFragmentId } from '../../src/test-fixtures/compliance-source-fragment'

/** Synthetic evidence only, called from the disposable localhost database harness. */
export async function createReviewedTestCitation(db: PrismaClient, input: { id: string; claimId: string; sourceVersionId: string }, reviewer: string, reviewedAt: Date) {
  const fragment = await db.knowledgeFragment.create({ data: {
    id: testFragmentId(input.id), externalKey: `test-${input.id}`, sourceVersionId: input.sourceVersionId, sectionPath: 'Synthetisch artikel',
    fragmentType: 'TEST', internalExcerpt: testSourceExcerpt, excerptHash: testSourceExcerptHash, extractionMethod: 'TEST', requiresReview: false,
  } })
  await db.knowledgeValidation.create({ data: { claimId: input.claimId, validationMethod: 'HUMAN_EXPERT_REVIEW',
    validatorType: 'HUMAN', validatorUserId: reviewer, status: 'VALIDATED', rationale: 'Synthetische testgoedkeuring; geen echte bronvrijgave.', validatedAt: reviewedAt,
  } })
  await db.knowledgeCitation.create({ data: { id: input.id, claimId: input.claimId, sourceVersionId: input.sourceVersionId, fragmentId: fragment.id, supportType: 'DIRECT_SUPPORT' } })
}
