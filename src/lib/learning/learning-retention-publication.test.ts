import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  isRetentionQuestionSelectable,
  LEARNING_QUESTION_PUBLISHED_STATUS,
  RETENTION_BANK_PUBLISHED_STATUS,
} from './learning-retention-publication'

const originalMigration = readFileSync('prisma/migrations/20260930100000_add_learning_retention/migration.sql', 'utf8')
const correctionMigration = readFileSync('prisma/migrations/20260930120000_correct_learning_retention_publication_policy/migration.sql', 'utf8')

describe('retention publication policy', () => {
  it('rejects DRAFT retention metadata', () => {
    expect(isRetentionQuestionSelectable({
      retentionStatus: 'DRAFT',
      learningQuestionStatus: LEARNING_QUESTION_PUBLISHED_STATUS,
    })).toBe(false)
  })

  it('allows only published retention metadata on a prototype-published LearningQuestion', () => {
    expect(isRetentionQuestionSelectable({
      retentionStatus: RETENTION_BANK_PUBLISHED_STATUS,
      learningQuestionStatus: LEARNING_QUESTION_PUBLISHED_STATUS,
    })).toBe(true)
  })

  it('rejects a published retention record with any noncanonical LearningQuestion status', () => {
    for (const status of ['DRAFT', 'PUBLISHED', 'RETIRED', 'PUBLISHED_OTHER']) {
      expect(isRetentionQuestionSelectable({
        retentionStatus: RETENTION_BANK_PUBLISHED_STATUS,
        learningQuestionStatus: status,
      })).toBe(false)
    }
  })

  it('keeps the forward migration and application policy identical for annual checks', () => {
    expect(originalMigration).toContain('metadata."status" = \'PUBLISHED\' AND question."status" = \'PUBLISHED\'')
    expect(correctionMigration).toContain('metadata."status" = \'PUBLISHED\'')
    expect(correctionMigration).toContain('question."status" = \'PUBLISHED_PROTOTYPE\'')
    expect(correctionMigration.match(/question\."status" = 'PUBLISHED_PROTOTYPE'/g)).toHaveLength(2)
    expect(correctionMigration).not.toMatch(/question\."status" = 'PUBLISHED'(?!_PROTOTYPE)/)
    expect(correctionMigration).toContain('CREATE OR REPLACE FUNCTION "learning_retention_check_completion_guard"()')
  })
})
