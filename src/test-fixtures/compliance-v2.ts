import { complianceChecksum, type ComplianceV2Definition } from '../lib/compliance/compliance-v2'

export const v2Context = { organizationName: 'Synthetische organisatie', scannedAt: '2026-10-15T12:00:00.000Z' }
export const v2Answers = { Q1: true, Q2: true, Q3: true, Q4: 'UNKNOWN', Q5: true }
export function v2Definition(): ComplianceV2Definition {
  const claimId = '40000000-0000-4000-8000-000000000001'
  const source = { id: '60000000-0000-4000-8000-000000000001', title: 'Synthetische bron', publisher: 'Test', url: 'https://example.invalid/source', reviewedAt: '2026-10-15', category: 'LEGISLATION' as const,
    claimId, sourceVersionId: '50000000-0000-4000-8000-000000000001', sourceChecksum: 'a'.repeat(64),
    claimChecksum: complianceChecksum({ id: claimId, type: 'LEGAL_REQUIREMENT', statement: 'Synthetische testclaim', applicability: 'Test', reviewedAt: v2Context.scannedAt, supportType: 'DIRECT_SUPPORT' }),
  }
  const statuses = ['IN_ORDER', 'ATTENTION_REQUIRED', 'ACTION_REQUIRED', 'NOT_ASSESSED', 'NOT_APPLICABLE'] as const
  return { id: '10000000-0000-4000-8000-000000000001', frameworkCode: 'NL_ARBO_GUIDE', version: '2', title: 'Synthetisch v2 framework', disclaimer: 'Indicatieve test; geen certificering.',
    modules: statuses.map((status, i) => ({ code: `C0${i + 1}`, title: `Synthetisch onderwerp ${i + 1}`,
      questions: [{ id: `20000000-0000-4000-8000-00000000000${i + 1}`, code: `Q${i + 1}`, prompt: 'Synthetische testvraag?', required: true, inputType: 'BOOLEAN', options: [] }],
      rules: [{ id: `30000000-0000-4000-8000-00000000000${i + 1}`, code: `RULE${i + 1}`, condition: { question: `Q${i + 1}`, equals: true }, status,
        applicability: status === 'NOT_APPLICABLE' ? 'NOT_APPLICABLE' : 'RELEVANT', mode: 'FULL', basis: 'LEGAL_REQUIREMENT',
        explanation: 'Synthetische testbevinding.', nextStep: 'Controleer de synthetische situatie.', sources: [structuredClone(source)],
      }],
    })),
  }
}
