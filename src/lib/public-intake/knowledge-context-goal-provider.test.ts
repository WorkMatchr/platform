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
      sourceControlStatus: 'CONTROL_COMPLETE', accessTier: 'PUBLIC_BASIC', usageScopes: { has: 'INTAKE_ROUTING_KNOWLEDGE' },
    }) }))
    expect(findRules).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      ruleType: 'ROUTING_RULE', publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED', accessTier: 'PUBLIC_BASIC',
      usageScopes: { has: 'INTAKE_ROUTING_KNOWLEDGE' },
    }) }))
  })

  it('maakt een nieuw Context Goal data-gedreven beschikbaar zonder topic-codepad', async () => {
    const result = await loadKnowledgeGroundedContextGoals({
      database: {
        knowledgeClaim: { findMany: vi.fn().mockResolvedValue([{ id: claimId, confidenceLevel: 'HIGH', topic: { slug: 'geluid' } }]) },
        knowledgeRule: { findMany: vi.fn().mockResolvedValue([{
          id: '11111111-1111-4111-8111-111111111201',
          code: 'CASE_GOAL_NOISE_WORK_PATTERN', ruleVersion: 2,
          outputSchema: {
            kind: 'CONTEXT_GOAL', scope: 'INTAKE_ROUTING_KNOWLEDGE', code: 'NOISE_WORK_PATTERN', questionKey: 'context_noise_work_pattern',
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
      concepts: [{ code: 'NOISE', confidence: 1, source: 'CLASSIFIER', supportingKnowledgeIds: [] }],
      originalInput: 'In de werkplaats is veel geluid tijdens het werk.',
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
          id: '11111111-1111-4111-8111-111111111201', code: 'CASE_GOAL_UNSUPPORTED', ruleVersion: 2,
          outputSchema: {
            kind: 'CONTEXT_GOAL', scope: 'INTAKE_ROUTING_KNOWLEDGE', code: 'UNSUPPORTED', questionKey: 'context_unsupported',
            purpose: 'Deze vraag mist geldige actuele kennisgronding.', text: 'Deze vraag mag niet worden gesteld.',
            answerType: 'OPTION', options: [{ code: 'YES', label: 'Ja' }], category: 'WORK',
            relevantConceptCodes: ['NOISE'], satisfiesFactCodes: ['UNSUPPORTED'], equivalentGoalCodes: [],
            mandatory: false, universal: false,
            weights: { relevance: 1, informationGain: 1, matchingValue: 1, userBurden: 0.2 },
            supportingKnowledgeIds: [claimId],
          },
        }]) },
      } as never,
      concepts: [{ code: 'NOISE', confidence: 1, source: 'CLASSIFIER', supportingKnowledgeIds: [] }],
      originalInput: 'Geluid in de werkplaats.',
    })
    expect(result.goals.map((goal) => goal.code)).not.toContain('UNSUPPORTED')
  })

  it('hydrateert supporting claims rechtstreeks op ID buiten de tekstuele discoveryset', async () => {
    const discovered = { id: '11111111-1111-4111-8111-111111111102', confidenceLevel: 'HIGH', topic: { slug: 'algemeen' } }
    const supported = { id: claimId, confidenceLevel: 'HIGH', topic: { slug: 'machine-safety' } }
    const findMany = vi.fn().mockResolvedValueOnce([discovered]).mockResolvedValueOnce([supported])
    const result = await loadKnowledgeGroundedContextGoals({
      database: {
        knowledgeClaim: { findMany },
        knowledgeRule: { findMany: vi.fn().mockResolvedValue([{
          id: '11111111-1111-4111-8111-111111111201', code: 'CASE_GOAL_MACHINE_DOCUMENTATION', ruleVersion: 2,
          outputSchema: {
            kind: 'CONTEXT_GOAL', scope: 'INTAKE_ROUTING_KNOWLEDGE', code: 'EXISTING_MEASURES', variantKey: 'MACHINE:EXISTING_MEASURES',
            questionKey: 'context_machine_existing_measures', purpose: 'Vaststellen welke machinebeoordeling en documentatie beschikbaar zijn.',
            text: 'Welke risicobeoordeling en technische documentatie zijn na de wijziging bijgewerkt?', answerType: 'TEXT', options: [],
            category: 'EXISTING_CONTROL', relevantConceptCodes: ['MACHINE_SAFETY'],
            satisfiesFactCodes: ['CONTEXT_ANSWERED_MACHINE_EXISTING_MEASURES'], equivalentGoalCodes: [],
            mandatory: false, universal: false, weights: { relevance: 1, informationGain: 1, matchingValue: 1, userBurden: 0.2 },
            supportingKnowledgeIds: [claimId],
          },
        }]) },
      } as never,
      concepts: [{ code: 'MACHINE_SAFETY', confidence: 1, source: 'CLASSIFIER', supportingKnowledgeIds: [] }],
      originalInput: 'Een gewijzigde installatie vraagt aandacht.',
    })
    expect(findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([
      expect.objectContaining({ id: { in: [claimId] } }),
    ]) }) }))
    expect(result.goals).toContainEqual(expect.objectContaining({ variantKey: 'MACHINE:EXISTING_MEASURES' }))
    expect(result.evidenceByGoalCode.get('MACHINE:EXISTING_MEASURES')).toEqual(expect.arrayContaining([
      expect.objectContaining({ knowledgeId: claimId, source: 'PUBLISHED_CLAIM' }),
    ]))
  })

  it('laadt een domeinvariant niet via alleen een breed gedeeld nevenconcept', async () => {
    const findClaims = vi.fn().mockResolvedValue([])
    const result = await loadKnowledgeGroundedContextGoals({
      database: {
        knowledgeClaim: { findMany: findClaims },
        knowledgeRule: { findMany: vi.fn().mockResolvedValue([{
          id: '11111111-1111-4111-8111-111111111201', code: 'CASE_GOAL_PROCESS_MEASUREMENTS', ruleVersion: 2,
          outputSchema: {
            kind: 'CONTEXT_GOAL', scope: 'INTAKE_ROUTING_KNOWLEDGE', code: 'EXISTING_MEASUREMENTS',
            variantKey: 'PROCESS:EXISTING_MEASUREMENTS', questionKey: 'context_process_existing_measurements',
            purpose: 'Procesmetingen in relatie tot lekkages beoordelen.',
            text: 'Wanneer en onder welke procescondities zijn de metingen uitgevoerd?', answerType: 'TEXT', options: [],
            category: 'EXISTING_CONTROL', relevantConceptCodes: ['PROCESS_SAFETY_MAJOR_HAZARDS', 'OCCUPATIONAL_HEALTH'],
            satisfiesFactCodes: ['CONTEXT_ANSWERED_PROCESS_EXISTING_MEASUREMENTS'], equivalentGoalCodes: [],
            applicability: {
              requiredAnyConceptCodes: ['PROCESS_SAFETY_MAJOR_HAZARDS', 'EXPOSURE_ASSESSMENT'],
              requiredFactCodes: [], requiredAnyFactCodes: [], excludedFactValues: [],
            },
            mandatory: false, universal: false,
            weights: { relevance: 1, informationGain: 1, matchingValue: 1, userBurden: 0.2 },
            supportingKnowledgeIds: [claimId],
          },
        }]) },
      } as never,
      concepts: [{ code: 'OCCUPATIONAL_HEALTH', confidence: 1, source: 'CLASSIFIER', supportingKnowledgeIds: [] }],
      originalInput: 'Meerdere medewerkers hebben klachten in een nieuw kantoor.',
    })
    expect(result.goals).not.toContainEqual(expect.objectContaining({ variantKey: 'PROCESS:EXISTING_MEASUREMENTS' }))
    expect(findClaims).toHaveBeenCalledTimes(1)
  })

  it('laat gevalideerde dynamische evidence niet overschrijven door legacy evidence', async () => {
    const result = await loadKnowledgeGroundedContextGoals({
      database: {
        knowledgeClaim: { findMany: vi.fn().mockResolvedValue([{ id: claimId, confidenceLevel: 'HIGH', topic: { slug: 'location-pattern' } }]) },
        knowledgeRule: { findMany: vi.fn().mockResolvedValue([{
          id: '11111111-1111-4111-8111-111111111201', code: 'CASE_GOAL_LOCATION_PATTERN_OFFICE', ruleVersion: 1,
          outputSchema: {
            kind: 'CONTEXT_GOAL', scope: 'INTAKE_ROUTING_KNOWLEDGE', code: 'LOCATION_PATTERN', variantKey: 'OFFICE:LOCATION_PATTERN',
            questionKey: 'context_office_location_pattern', purpose: 'Het klachtenpatroon per ruimte feitelijk onderscheiden.',
            text: 'In welke ruimtes treden de klachten op en waar juist niet?', answerType: 'TEXT', options: [], category: 'SCOPE',
            relevantConceptCodes: ['INDOOR_CLIMATE'], satisfiesFactCodes: ['CONTEXT_ANSWERED_OFFICE_LOCATION_PATTERN'], equivalentGoalCodes: [],
            mandatory: false, universal: false, weights: { relevance: 1, informationGain: 1, matchingValue: 1, userBurden: 0.2 },
            supportingKnowledgeIds: [claimId],
          },
        }]) },
      } as never,
      concepts: [{ code: 'INDOOR_CLIMATE', confidence: 1, source: 'CLASSIFIER', supportingKnowledgeIds: [] }], originalInput: 'Klachten in een nieuw kantoor.',
    })
    expect(result.evidenceByGoalCode.get('OFFICE:LOCATION_PATTERN')?.map((item) => item.source)).toEqual([
      'PUBLISHED_ROUTING_RULE', 'PUBLISHED_CLAIM',
    ])
    expect(result.goals.filter((goal) => goal.code === 'LOCATION_PATTERN')).toHaveLength(2)
  })
})
