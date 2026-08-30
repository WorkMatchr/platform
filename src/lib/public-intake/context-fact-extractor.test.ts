import { describe, expect, it } from 'vitest'
import { emptyCaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'
import { deriveKnowledgeConceptCandidates, extractPublicIntakeFacts } from './context-fact-extractor'

const codes = (input: string) => extractPublicIntakeFacts({ originalInput: input, answers: [] })

describe('public intake fact extraction', () => {
  it('interpreteert een machinewijziging niet als een wijziging van de werkomgeving', () => {
    const originalInput = 'We hebben een productiemachine aangepast. De besturing en afscherming zijn veranderd.'
    const understanding = emptyCaseUnderstanding()
    const facts = extractPublicIntakeFacts({
      originalInput,
      answers: [],
      caseUnderstanding: {
        ...understanding,
        recentChanges: {
          value: ['besturing en afscherming van de machine zijn veranderd'],
          evidence: ['De besturing en afscherming zijn veranderd.'],
          confidence: 0.95,
          status: 'RELIABLE_EXTRACTION',
        },
      },
    })

    expect(facts.some((fact) => fact.code === 'RECENT_CHANGES')).toBe(true)
    expect(facts.some((fact) => fact.code === 'WORK_ENVIRONMENT_CHANGE')).toBe(true)
    expect(facts.some((fact) => fact.code === 'WORK_ENVIRONMENT_CHANGE_SIGNAL')).toBe(false)
    expect(deriveKnowledgeConceptCandidates({ originalInput, classification: null, facts }).map((concept) => concept.code))
      .not.toContain('WORK_ENVIRONMENT_CHANGE')
  })

  it('gebruikt procesveroudering alleen om een beantwoorde veranderingsvraag te onderdrukken', () => {
    const originalInput = 'De technische dienst vermoedt verouderende procesinstallaties.'
    const understanding = emptyCaseUnderstanding()
    const facts = extractPublicIntakeFacts({
      originalInput,
      answers: [],
      caseUnderstanding: {
        ...understanding,
        recentChanges: {
          value: ['verouderende procesinstallaties'],
          evidence: ['De technische dienst vermoedt verouderende procesinstallaties.'],
          confidence: 0.95,
          status: 'RELIABLE_EXTRACTION',
        },
      },
    })

    expect(facts.some((fact) => fact.code === 'WORK_ENVIRONMENT_CHANGE')).toBe(true)
    expect(facts.some((fact) => fact.code === 'WORK_ENVIRONMENT_CHANGE_SIGNAL')).toBe(false)
    expect(deriveKnowledgeConceptCandidates({ originalInput, classification: null, facts }).map((concept) => concept.code))
      .not.toContain('WORK_ENVIRONMENT_CHANGE')
  })

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
    const facts = codes('Wij zijn een metaalbewerkingsbedrijf met 85 medewerkers op twee locaties en willen volgende maand voor het eerst een RI&E laten uitvoeren.')
    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ORGANIZATION_SIZE', value: 85 }),
      expect.objectContaining({ code: 'WORKSITE_COUNT', value: 2 }),
      expect.objectContaining({ code: 'RIE_INTENT', value: 'NEW' }),
      expect.objectContaining({ code: 'START_WINDOW' }),
    ]))
  })

  it('herkent een genoemd tijdspatroon en verandering zonder die opnieuw te vragen', () => {
    const facts = codes('Sinds de verhuizing hebben enkele collega’s hoofdpijn na een dag werken.')
    expect(facts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'WORK_ENVIRONMENT_CHANGE' }),
      expect.objectContaining({ code: 'DURATION_FREQUENCY' }),
      expect.objectContaining({ code: 'AFFECTED_SCOPE', value: 'MULTIPLE' }),
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

  it('activeert de RI&E-vraagroute niet op alleen een classifierlabel zonder expliciete RI&E-context', () => {
    const classification = {
      summary: 'Een gerichte machineveiligheidsbeoordeling.',
      primarySubject: 'RIE' as const,
      secondarySubjects: [],
      confidence: 'HIGH' as const,
      alternatives: [],
      caseUnderstanding: emptyCaseUnderstanding(),
    }
    const facts = codes('Wie kan onze aangepaste productiemachine beoordelen?')

    expect(deriveKnowledgeConceptCandidates({ originalInput: '', classification, facts }).map((item) => item.code))
      .not.toContain('RIE')
  })

  it('activeert geen RI&E-vragen voor een voorlopige secundaire RI&E-kandidaat zonder RI&E-vermelding', () => {
    const understanding = {
      ...emptyCaseUnderstanding(),
      candidateExpertiseDomains: {
        value: ['RIE', 'PROCESS_SAFETY_MAJOR_HAZARDS'],
        evidence: ['BRZO/Seveso-locatie met gelijktijdige onderhoudswerkzaamheden'],
        confidence: 0.98,
        status: 'RELIABLE_EXTRACTION' as const,
      },
    }
    const classification = {
      summary: 'Een integrale procesveiligheidsbeoordeling tijdens een onderhoudsstop.',
      primarySubject: 'RIE' as const,
      secondarySubjects: [],
      confidence: 'HIGH' as const,
      alternatives: [],
      caseUnderstanding: understanding,
    }
    const facts = codes('Wie kan de integrale risico’s op onze BRZO/Seveso-locatie tijdens de onderhoudsstop beoordelen?')

    expect(deriveKnowledgeConceptCandidates({ originalInput: '', classification, facts }).map((item) => item.code))
      .toEqual(['PROCESS_SAFETY_MAJOR_HAZARDS'])
  })

  it('gebruikt een brede legacy hoofdcategorie niet naast specifiekere semantische domeinen', () => {
    const understanding = {
      ...emptyCaseUnderstanding(),
      candidateExpertiseDomains: {
        value: ['PSA', 'WORK_ORGANIZATION'], evidence: ['werkdruk en spanningen'], confidence: 0.98, status: 'RELIABLE_EXTRACTION' as const,
      },
    }
    const classification = {
      summary: 'Organisatiegerichte onderzoeksvraag.', primarySubject: 'OCCUPATIONAL_HEALTH' as const,
      secondarySubjects: [], confidence: 'HIGH' as const, alternatives: [], caseUnderstanding: understanding,
    }

    expect(deriveKnowledgeConceptCandidates({ originalInput: '', classification, facts: [] }).map((item) => item.code))
      .toEqual(['PSA', 'WORK_ORGANIZATION'])
  })
})
