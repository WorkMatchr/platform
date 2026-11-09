import { providerServiceTerms } from '../../../prisma/provider-service-catalog'
import { describe, it, expect } from 'vitest'
import { classifyTask, standardTasks, knownService, scopeReference, type Service } from './assignment-scope'
import { qualifyScopePolicy } from './assignment-scope-policy'

describe('inhoudelijke opdrachtcontrole', () => {
  for (const [service, t] of Object.entries(standardTasks)) {
    it('laat uitsluitend de begrensde standaardtaak door: ' + service, () => {
      expect(classifyTask(service as Service, t.title, t.task, [], t.specialists).state).toBe('BINNEN_SCOPE')
      expect(
        classifyTask(
          service as Service,
          t.title,
          t.task + ' En andere nader te bepalen werkzaamheden.',
          [],
          t.specialists,
        ).state,
      ).toBe('BEOORDELING_NODIG')
      expect(classifyTask(service as Service, t.title, t.task, ['Nog te bepalen'], t.specialists).state).toBe(
        'BEOORDELING_NODIG',
      )
      expect(classifyTask(service as Service, t.title, t.task, [], ['ander specialisme']).state).toBe(
        'BEOORDELING_NODIG',
      )
    })
  }
  it.each([
    ['SAFETY_ADVICE', 'Wettelijke RI&E-toets uitvoeren'],
    ['SAFETY_ADVICE', 'Toets het plan van aanpak'],
    ['REINTEGRATION_FIRST_TRACK', 'Medische belastbaarheidsbeoordeling uitvoeren'],
    ['REINTEGRATION_SECOND_TRACK', 'Formeel WIA-/UWV-oordeel afgeven'],
    ['INCIDENT_INVESTIGATION', 'Particulier rechercheonderzoek uitvoeren'],
  ] as const)('sluit %s uit bij %s', (s, text) => {
    const t = standardTasks[s]
    for (const [title, body, extra] of [
      [text, t.task, []],
      [t.title, text, []],
      [t.title, t.task, [text]],
    ] as const)
      expect(classifyTask(s, title, body, [...extra], t.specialists)).toMatchObject({
        state: 'BUITEN_SCOPE',
        reviewable: false,
      })
  })
  it('houdt alle dertien overige catalogusdiensten gesloten', () => {
    const launch = ['ERGONOMICS', 'INCIDENT_INVESTIGATION', 'SAFETY_ADVICE', 'IMPLEMENTATION_SUPPORT',
      'REINTEGRATION_FIRST_TRACK', 'REINTEGRATION_SECOND_TRACK']
    expect(providerServiceTerms).toHaveLength(19)
    expect(providerServiceTerms.filter(([code]) => knownService(code)).map(([code]) => code).sort())
      .toEqual(launch.sort())
    expect(providerServiceTerms.filter(([code]) => !knownService(code))).toHaveLength(13)
  })
  it('erkent uitsluitend de zes bekrachtigde diensten en de gepubliceerde referentieterm', () => {
    expect(knownService('OCCUPATIONAL_HEALTH_SERVICE')).toBe(false)
    expect(knownService('constructor')).toBe(false)
    const term = {
      id: 't',
      code: 'ERGONOMICS',
      label: 'Ergonomie',
      isActive: true,
      version: { version: 2, status: 'PUBLISHED', taxonomy: { kind: 'SERVICE' } },
    }
    const row = {
      serviceTerm: term,
      requirementTerm: {
        ...term,
        code: 'STANDARD_SERVICE_SCOPE',
        label: scopeReference,
        version: { ...term.version, taxonomy: { kind: 'QUALIFICATION' } },
      },
      specialismTermId: null,
      kind: 'QUALIFICATION',
      isRequired: false,
      minimumVerification: 'SELF_DECLARED',
      requiresValidity: false,
      requiresProfessionalLiability: false,
    }
    expect(qualifyScopePolicy(row)).toBe(true)
    for (const changed of [
      { requiresValidity: true },
      { isRequired: true },
      { specialismTermId: 'special' },
      { serviceTerm: { ...term, isActive: false } },
      { requirementTerm: { ...row.requirementTerm, label: 'Oud beleid' } },
    ])
      expect(qualifyScopePolicy({ ...row, ...changed })).toBe(false)
  })
})
