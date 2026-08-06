import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  knowledgeImprovementHandlingSchema,
  knowledgeImprovementReportSchema,
} from './knowledge-improvement-service'
import { knowledgeImprovementClaimWhere } from './knowledge-improvement-policy'

const id = '10000000-0000-4000-8000-000000000001'

describe('inhoudelijke verbetermelding', () => {
  it('accepteert uitsluitend begrensde, getypeerde meldingen', () => {
    expect(knowledgeImprovementReportSchema.parse({
      knowledgeItemId: id,
      reportType: 'OUTDATED',
      explanation: 'Deze bron is aantoonbaar vervangen door een recentere uitgave.',
      sourceReference: 'https://example.invalid/actuele-bron',
    })).toMatchObject({ reportType: 'OUTDATED' })
    expect(knowledgeImprovementReportSchema.safeParse({
      knowledgeItemId: id, reportType: 'UNKNOWN', explanation: 'Te kort.',
    }).success).toBe(false)
  })

  it('vereist bij definitieve afhandeling een gemotiveerde resolutie', () => {
    expect(knowledgeImprovementHandlingSchema.safeParse({
      reportId: id, expectedVersion: 1, status: 'PROCESSED', resolution: '',
    }).success).toBe(false)
    expect(knowledgeImprovementHandlingSchema.safeParse({
      reportId: id, expectedVersion: 1, status: 'UNDER_INVESTIGATION',
    }).success).toBe(true)
  })

  it('houdt productie strikt en staat alleen in development een intern testitem toe', () => {
    expect(knowledgeImprovementClaimWhere(id, 'production')).toEqual({
      id,
      publicationStatus: 'PUBLISHED',
      validationStatus: 'VALIDATED',
    })
    expect(knowledgeImprovementClaimWhere(id, 'test')).toEqual({
      id,
      publicationStatus: 'PUBLISHED',
      validationStatus: 'VALIDATED',
    })
    expect(knowledgeImprovementClaimWhere(id, 'development')).toEqual({ id })
  })
})
