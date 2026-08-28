import { describe, expect, it } from 'vitest'
import { deriveKnowledgeConceptCandidates, extractPublicIntakeFacts } from './context-fact-extractor'

const codes = (input: string) => extractPublicIntakeFacts({ originalInput: input, answers: [] })

describe('public intake fact extraction', () => {
  it('scheidt expliciete arbeidscontext van een niet-bewezen oorzaak', () => {
    const facts = codes('Bij ons transportbedrijf hebben 6 chauffeurs last van hun rug.')
    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'AFFECTED_COUNT', value: 6 }),
      expect.objectContaining({ code: 'OCCUPATION', value: 'chauffeur' }),
      expect.objectContaining({ code: 'HEALTH_COMPLAINT', value: 'BACK_COMPLAINT' }),
    ]))
    expect(facts.map((fact) => fact.code)).not.toContain('PHYSICAL_LOAD_RELEVANT')
  })

  it('herkent organisatieomvang en locaties zonder ze opnieuw te laten vragen', () => {
    const facts = codes('Wij zijn een metaalbewerkingsbedrijf met 85 medewerkers op twee locaties en willen voor het eerst een RI&E laten uitvoeren.')
    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ORGANIZATION_SIZE', value: 85 }),
      expect.objectContaining({ code: 'WORKSITE_COUNT', value: 2 }),
      expect.objectContaining({ code: 'RIE_INTENT', value: 'NEW' }),
    ]))
  })

  it('houdt een genoemde deskundige als voorgestelde richting en niet als feitelijke conclusie', () => {
    const facts = codes('Ik heb een bedrijfsarts nodig omdat enkele medewerkers hoofdpijn hebben.')
    expect(facts).toContainEqual(expect.objectContaining({
      code: 'REQUESTED_DIRECTION', status: 'SUGGESTED_DIRECTION', value: 'OCCUPATIONAL_PHYSICIAN',
    }))
  })

  it('leidt kennisconceptkandidaten af zonder een diagnose te maken', () => {
    const facts = codes('In onze loods krijgen meerdere medewerkers hoofdpijn wanneer heftrucks lang binnen rijden.')
    const concepts = deriveKnowledgeConceptCandidates({ originalInput: '', classification: null, facts })
    expect(concepts.map((item) => item.code)).toEqual(expect.arrayContaining(['HEALTH_COMPLAINT', 'WORK_EQUIPMENT', 'EXPOSURE']))
    expect(concepts.map((item) => item.code)).not.toContain('DIAGNOSIS')
  })
})
