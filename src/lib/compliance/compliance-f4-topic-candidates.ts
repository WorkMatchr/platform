import type { Condition } from './compliance-v2-conditions'
import { evaluateComplianceV2Condition } from './compliance-v2-conditions'
import { complianceChecksum } from './compliance-v2'

// Candidate input for the existing framework review/import pipeline, never a runtime fallback.
// No source IDs, source revisions or human approvals are invented.
const options = [{ value: 'YES', label: 'Ja' }, { value: 'PARTIAL', label: 'Gedeeltelijk' }, { value: 'NO', label: 'Nee' }, { value: 'UNKNOWN', label: 'Ik weet het niet' }] as const
const employer: Condition = { question: 'HASEMPLOYEES', equals: 'YES' }
const basis = 'https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/basiscontract/waar-moet-het-basiscontract-aan-voldoen'
const exposure = 'https://www.arboportaal.nl/onderwerpen/werken-met-gevaarlijke-stoffen/blootstellingsmeting'
export const f4TopicCandidates = [
  { moduleCode: 'C07', registryTitle: 'Ziekteverzuimbeleid', title: 'Verzuimbeleid', frameworkCode: 'NL_ARBO_GUIDE', candidateVersion: '2.2', status: 'DRAFT',
    learningObjective: 'Herkennen welke afspraken over verzuim en deskundige begeleiding moeten worden onderzocht.',
    assessmentObjective: 'Inventariseren of afspraken en deskundige ondersteuning bekend zijn, zonder individuele medische gegevens.',
    basisCandidate: 'Arbowet artikel 14: taakgebonden bijstand; geen algemene conclusie over alle re-integratieverplichtingen.',
    evidence: { dossier: 'docs/compliance/arbo-compliance-knowledge-completion.md', url: basis, sourceVersionId: null, claimId: null, review: 'REVIEW_REQUIRED' },
    questions: [
      { code: 'CW-C07-01', prompt: 'Zijn afspraken over het melden en begeleiden van ziekteverzuim vastgelegd?', basis: 'RECOMMENDATION', visibleWhen: employer },
      { code: 'CW-C07-02', prompt: 'Is deskundige begeleiding door een bedrijfsarts of arbodienst geregeld bij ziekteverzuim?', basis: 'LEGAL_REQUIREMENT', visibleWhen: employer },
      { code: 'CW-C07-03', prompt: 'Wordt beoordeeld of de afspraken over verzuimbegeleiding in de praktijk werken?', basis: 'RECOMMENDATION', visibleWhen: { all: [employer, { not: { question: 'CW-C07-01', equals: 'NO' } }] } },
    ],
    missingEvidence: ['Actuele directe citatie per gevolgtrekking', 'Taakgebonden toepasselijkheid en uitzonderingen', 'Beoordeling praktische aanbevelingen los van wettelijke plichten', 'Menselijke goedkeuring'],
  },
  { moduleCode: 'R03', registryTitle: 'Gevaarlijke stoffen', title: 'Gevaarlijke stoffen', frameworkCode: 'NL_ARBO_GUIDE', candidateVersion: '2.2', status: 'DRAFT',
    learningObjective: 'Herkennen van mogelijke blootstelling en de behoefte aan deskundige beoordeling.',
    assessmentObjective: 'Inventariseren van stofinformatie, blootstellingsbeoordeling en maatregelen; geen conclusie uit niet-geselecteerde risico’s.',
    basisCandidate: 'Arbobesluit artikel 4.2: blootstellingsbeoordeling; CMR-vervanging (4.17) is geen algemene norm voor alle stoffen.',
    evidence: { dossier: 'docs/compliance/arbo-compliance-knowledge-completion.md', url: exposure, sourceVersionId: null, claimId: null, review: 'REVIEW_REQUIRED' },
    questions: [
      { code: 'CW-R03-01', prompt: 'Kunnen werkenden tijdens het werk worden blootgesteld aan gevaarlijke stoffen, ook stoffen die tijdens het werk ontstaan?', basis: 'CONTEXT', visibleWhen: employer },
      { code: 'CW-R03-02', prompt: 'Zijn de stoffen en de situaties waarin blootstelling kan optreden geïnventariseerd?', basis: 'LEGAL_REQUIREMENT', visibleWhen: employer },
      { code: 'CW-R03-03', prompt: 'Zijn aard, mate en duur van mogelijke blootstelling beoordeeld?', basis: 'LEGAL_REQUIREMENT', visibleWhen: { all: [employer, { not: { question: 'CW-R03-01', equals: 'NO' } }] } },
      { code: 'CW-R03-04', prompt: 'Zijn maatregelen om blootstelling te voorkomen of beperken onderbouwd met die beoordeling?', basis: 'LEGAL_REQUIREMENT', visibleWhen: { all: [employer, { not: { question: 'CW-R03-01', equals: 'NO' } }] } },
    ],
    missingEvidence: ['Bronrevisie en directe artikel-/lidbinding per regel', 'Werkgeversscope inclusief bijzondere groepen', 'Stofcategorie, blootstellingsroute en grenswaarden', 'Menselijke goedkeuring; geen vrijstelling op zelfverklaarde afwezigheid'],
  },
] as const

export function inspectF4TopicCandidate(index: number, answers: Record<string, string>) {
  const candidate = f4TopicCandidates[index]
  if (!candidate) throw new Error('UNKNOWN_CANDIDATE')
  return { candidate, checksum: complianceChecksum(candidate), options,
    visibleCodes: candidate.questions.filter(q => evaluateComplianceV2Condition(q.visibleWhen as Condition, answers) !== false).map(q => q.code),
    assessmentStatus: 'NOT_ASSESSED' as const,
    nextStep: 'Laat bronbindingen, toepasselijkheid en antwoorden door een bevoegd inhoudelijk reviewer beoordelen.',
    publicationDecision: 'NO_GO' as const,
  }
}
