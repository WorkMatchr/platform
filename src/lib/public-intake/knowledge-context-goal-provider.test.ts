import { describe, expect, it, vi } from 'vitest'
import { loadKnowledgeGroundedContextGoals } from './knowledge-context-goal-provider'

const claimId = '11111111-1111-4111-8111-111111111101'

describe('Knowledge Engine Context Goal provider', () => {
  it('gebruikt uitsluitend beheerde gepubliceerde en gevalideerde kennisfilters', async () => {
    const findClaims = vi.fn().mockResolvedValue([])
    const findRules = vi.fn().mockResolvedValue([])
    await loadKnowledgeGroundedContextGoals({
      database: { knowledgeClaim: { findMany: findClaims }, knowledgeRule: { findMany: findRules } } as never,
      concepts: [],
      originalInput: 'Medewerkers ervaren geluid in de werkplaats.',
    })
    expect(findClaims).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED', temporalStatus: 'CURRENT',
      sourceControlStatus: 'CONTROL_COMPLETE', accessTier: 'PUBLIC_BASIC',
    }) }))
    expect(findRules).toHaveBeenCalledWith(expect.objectContaining({ where: {
      ruleType: 'ROUTING_RULE', publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED', accessTier: 'PUBLIC_BASIC',
    } }))
  })

  it('maakt een nieuw Context Goal data-gedreven beschikbaar zonder topic-codepad', async () => {
    const result = await loadKnowledgeGroundedContextGoals({
      database: {
        knowledgeClaim: { findMany: vi.fn().mockResolvedValue([{ id: claimId, confidenceLevel: 'HIGH', topic: { slug: 'geluid' } }]) },
        knowledgeRule: { findMany: vi.fn().mockResolvedValue([{
          id: '11111111-1111-4111-8111-111111111201',
          outputSchema: {
            kind: 'CONTEXT_GOAL', code: 'NOISE_WORK_PATTERN', questionKey: 'context_noise_work_pattern',
            purpose: 'Het relevante werkpatroon bij geluid onderscheiden.',
            text: 'Tijdens welke werkzaamheden speelt het geluid vooral?', answerType: 'OPTION',
            options: [{ code: 'MACHINE_USE', label: 'Tijdens machinegebruik' }, { code: 'OTHER', label: 'Tijdens ander werk' }],
            category: 'WORK', relevantConceptCodes: ['NOISE'], satisfiesFactCodes: ['NOISE_WORK_PATTERN'],
            equivalentGoalCodes: [], mandatory: false, universal: false,
            weights: { relevance: 1, informationGain: 1, matchingValue: 0.8, userBurden: 0.2 },
            supportingKnowledgeIds: [claimId],
          },
        }]) },
      } as never,
      concepts: [], originalInput: 'In de werkplaats is veel geluid tijdens het werk.',
    })
    expect(result.goals).toContainEqual(expect.objectContaining({ code: 'NOISE_WORK_PATTERN' }))
    expect(result.knowledgeConcepts).toContainEqual(expect.objectContaining({ code: 'NOISE' }))
    expect(result.evidenceByGoalCode.get('NOISE_WORK_PATTERN')).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'PUBLISHED_ROUTING_RULE' }),
      expect.objectContaining({ knowledgeId: claimId, source: 'PUBLISHED_CLAIM' }),
    ]))
  })

  it('weigert een regel waarvan knowledge-provenance niet in de actuele claimset zit', async () => {
    const result = await loadKnowledgeGroundedContextGoals({
      database: {
        knowledgeClaim: { findMany: vi.fn().mockResolvedValue([]) },
        knowledgeRule: { findMany: vi.fn().mockResolvedValue([{
          id: '11111111-1111-4111-8111-111111111201',
          outputSchema: {
            kind: 'CONTEXT_GOAL', code: 'UNSUPPORTED', questionKey: 'context_unsupported',
            purpose: 'Deze vraag mist geldige actuele kennisgronding.', text: 'Deze vraag mag niet worden gesteld.',
            answerType: 'OPTION', options: [{ code: 'YES', label: 'Ja' }], category: 'WORK',
            relevantConceptCodes: ['NOISE'], satisfiesFactCodes: ['UNSUPPORTED'], equivalentGoalCodes: [],
            mandatory: false, universal: false,
            weights: { relevance: 1, informationGain: 1, matchingValue: 1, userBurden: 0.2 },
            supportingKnowledgeIds: [claimId],
          },
        }]) },
      } as never,
      concepts: [], originalInput: 'Geluid in de werkplaats.',
    })
    expect(result.goals.map((goal) => goal.code)).not.toContain('UNSUPPORTED')
  })
})
