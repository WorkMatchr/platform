import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
import {
  knowledgeReviewDecisionSchema,
  knowledgeReviewDraftSchema,
  knowledgeSupportingSourceSchema,
} from './knowledge-review-service'

const taskId = '10000000-0000-4000-8000-000000000001'

describe('Knowledge Review-contracten', () => {
  it('begrensd een beoordelingsconcept zonder technische statusmutatie uit clientinvoer', () => {
    const result = knowledgeReviewDraftSchema.parse({
      reviewTaskId: taskId,
      expectedVersion: 1,
      proposedStatement: 'Een korte eigen formulering.',
      substantiveNotes: 'Inhoudelijk gecontroleerd.',
      proposedAccessTier: 'INTERNAL_REVIEWER',
    })
    expect(result.proposedStatement).toBe('Een korte eigen formulering.')
    expect(result).not.toHaveProperty('status')
    expect(result).not.toHaveProperty('publicationStatus')
  })

  it('vereist bevestiging voor het afhandelen van een uitzondering', () => {
    const result = knowledgeReviewDecisionSchema.safeParse({
      reviewTaskId: taskId,
      expectedVersion: 1,
      operation: 'CONTENT_APPROVE',
      proposedStatement: '',
      confirmed: false,
    })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.map((issue) => issue.path[0])).toEqual(['confirmed'])
  })

  it('vereist een reden voor afwijzen en wijzigingen vragen', () => {
    for (const operation of ['REJECT', 'CHANGES_REQUIRED']) {
      expect(knowledgeReviewDecisionSchema.safeParse({
        reviewTaskId: taskId,
        expectedVersion: 1,
        operation,
        reason: '',
      }).success).toBe(false)
    }
  })

  it('accepteert een bestaande bron zonder handmatig gedupliceerde metadata', () => {
    expect(knowledgeSupportingSourceSchema.safeParse({
      reviewTaskId: taskId,
      expectedVersion: 1,
      sourceVersionId: '20000000-0000-4000-8000-000000000001',
      sourceType: 'OTHER',
      title: '',
      publisher: '',
      urlOrReference: '',
      authorityLevel: 'UNKNOWN',
      sourceFamily: '',
      supportType: 'CONTEXT',
    }).success).toBe(true)
  })

  it('vereist bij een handmatige bron een titel en bronfamilie', () => {
    const result = knowledgeSupportingSourceSchema.safeParse({
      reviewTaskId: taskId,
      expectedVersion: 1,
      sourceType: 'PROFESSIONAL_GUIDANCE',
      title: '',
      authorityLevel: 'UNKNOWN',
      sourceFamily: '',
      supportType: 'DIRECT_SUPPORT',
    })
    expect(result.success).toBe(false)
  })
})
