import type {
  PublicIntakeAnswerDisposition,
  PublicIntakeEntryPoint,
} from '@/generated/prisma/client'
import type { PublicIntakeAnswerView } from './public-intake-types'
import { aiContextQuestionCatalog } from '@/lib/ai-intake-classifier/ai-context-question-catalog'
import type {
  RecognizableRequestKey,
  RecordPublicIntakeAnswerInput,
} from './public-intake-validation'

export type PublicIntakePrototypeOption = {
  label: string
  value?: string | number | boolean
  disposition: PublicIntakeAnswerDisposition
}

export type PublicIntakePrototypeQuestion = {
  questionKey: string
  questionVersion: 1
  legend: string
  explanation: string
  decisionPurpose: string
  inputKind: 'OPTIONS' | 'NUMBER'
  options?: readonly PublicIntakePrototypeOption[]
  numberLabel?: string
  numberPlaceholder?: string
  skipMessage?: string
}

export type RecognizableSituation = {
  key: RecognizableRequestKey
  label: string
  prototypeAvailable: boolean
}

export const recognizableSituations = [
  { key: 'rie_needed', label: 'Wij hebben een RI&E nodig', prototypeAvailable: true },
  {
    key: 'rie_update',
    label: 'Onze RI&E moet worden geactualiseerd',
    prototypeAvailable: true,
  },
  {
    key: 'rie_uncertain',
    label: 'Wij weten niet of onze RI&E nog voldoet',
    prototypeAvailable: true,
  },
  {
    key: 'health_complaints',
    label: 'Medewerkers ervaren gezondheidsklachten',
    prototypeAvailable: false,
  },
  {
    key: 'occupational_health_service',
    label: 'Wij zoeken een bedrijfsarts of arbodienst',
    prototypeAvailable: false,
  },
  {
    key: 'legal_requirements',
    label: 'Wij willen weten wat wettelijk verplicht is',
    prototypeAvailable: false,
  },
  {
    key: 'other',
    label: 'Mijn situatie staat er niet tussen',
    prototypeAvailable: false,
  },
] as const satisfies readonly RecognizableSituation[]

export const publicIntakePrototypeQuestions = [
  {
    questionKey: 'guidance_topic',
    questionVersion: 1,
    legend: 'Waar gaat uw vraag vooral over?',
    explanation:
      'Wij kunnen uw vraag nog niet goed genoeg plaatsen. Kies het onderwerp dat het beste bij uw vraag past.',
    decisionPurpose:
      'Het onderwerp van een nog niet geclassificeerde hulpvraag expliciet laten kiezen.',
    inputKind: 'OPTIONS',
    options: [
      {
        label: 'Gevaarlijke stoffen of brandstof',
        value: 'HAZARDOUS_SUBSTANCES',
        disposition: 'ANSWERED',
      },
      {
        label: 'Een incident of ongeval',
        value: 'INCIDENT',
        disposition: 'ANSWERED',
      },
      { label: 'RI&E', value: 'RIE', disposition: 'ANSWERED' },
      {
        label: 'Gezondheid of belasting van medewerkers',
        value: 'OCCUPATIONAL_HEALTH',
        disposition: 'ANSWERED',
      },
      {
        label: 'Bedrijfshulpverlening of een noodsituatie',
        value: 'EMERGENCY_RESPONSE',
        disposition: 'ANSWERED',
      },
      { label: 'Iets anders', value: 'OTHER', disposition: 'ANSWERED' },
    ],
  },
  ...aiContextQuestionCatalog.map((question) => ({
    questionKey: question.questionKey,
    questionVersion: 1 as const,
    legend: question.text,
    explanation: 'Deze informatie helpt om uw situatie beter te begrijpen.',
    decisionPurpose: 'Aanvullende feitelijke context voor uw hulpvraag.',
    inputKind: 'OPTIONS' as const,
    options: [...question.options.map((value) => ({ label: value, value, disposition: 'ANSWERED' as const })), { label: 'Dat weet ik niet', disposition: 'UNKNOWN' as const }],
  })),
  {
    questionKey: 'rie_has_employees',
    questionVersion: 1,
    legend: 'Heeft u personeel?',
    explanation:
      'Hiermee bepalen we uitsluitend welke informatie over uw RI&E-situatie relevant is.',
    decisionPurpose:
      'Expliciet vastleggen of de organisatie personeel heeft.',
    inputKind: 'OPTIONS',
    options: [
      { label: 'Ja', value: true, disposition: 'ANSWERED' },
      { label: 'Nee', value: false, disposition: 'ANSWERED' },
      { label: 'Dat weet ik niet', disposition: 'UNKNOWN' },
    ],
    skipMessage:
      'Geen probleem. Deze informatie blijft openstaan.',
  },
  {
    questionKey: 'incident_injury_occurred',
    questionVersion: 1,
    legend: 'Is er letsel?',
    explanation:
      'Hiermee leggen we alleen vast of letsel onderdeel is van de gemelde situatie.',
    decisionPurpose:
      'Expliciet vastleggen of bij het incident letsel is ontstaan.',
    inputKind: 'OPTIONS',
    options: [
      { label: 'Ja', value: true, disposition: 'ANSWERED' },
      { label: 'Nee', value: false, disposition: 'ANSWERED' },
      { label: 'Dat weet ik niet', disposition: 'UNKNOWN' },
    ],
  },
  {
    questionKey: 'hazardous_substances_storage',
    questionVersion: 1,
    legend: 'Gaat het om opslag?',
    explanation:
      'Hiermee verduidelijken we of opslag onderdeel is van uw vraag.',
    decisionPurpose:
      'Expliciet vastleggen of de situatie opslag van gevaarlijke stoffen betreft.',
    inputKind: 'OPTIONS',
    options: [
      { label: 'Ja', value: true, disposition: 'ANSWERED' },
      { label: 'Nee', value: false, disposition: 'ANSWERED' },
      { label: 'Dat weet ik niet', disposition: 'UNKNOWN' },
    ],
  },
  {
    questionKey: 'hazardous_substances_transport',
    questionVersion: 1,
    legend: 'Gaat het om vervoer?',
    explanation:
      'Hiermee verduidelijken we of vervoer onderdeel is van uw vraag.',
    decisionPurpose:
      'Expliciet vastleggen of de situatie vervoer van gevaarlijke stoffen betreft.',
    inputKind: 'OPTIONS',
    options: [
      { label: 'Ja', value: true, disposition: 'ANSWERED' },
      { label: 'Nee', value: false, disposition: 'ANSWERED' },
      { label: 'Dat weet ik niet', disposition: 'UNKNOWN' },
    ],
  },
  {
    questionKey: 'hazardous_substances_loading_unloading',
    questionVersion: 1,
    legend: 'Gaat het om laden of lossen?',
    explanation:
      'Hiermee verduidelijken we of laden of lossen onderdeel is van uw vraag.',
    decisionPurpose:
      'Expliciet vastleggen of de situatie laden of lossen van gevaarlijke stoffen betreft.',
    inputKind: 'OPTIONS',
    options: [
      { label: 'Ja', value: true, disposition: 'ANSWERED' },
      { label: 'Nee', value: false, disposition: 'ANSWERED' },
      { label: 'Dat weet ik niet', disposition: 'UNKNOWN' },
    ],
  },
  {
    questionKey: 'rie_existing_status',
    questionVersion: 1,
    legend: 'Heeft uw organisatie momenteel een RI&E?',
    explanation:
      'Hiermee bepalen we of uw hulpvraag gaat over een nieuwe RI&E, actualisatie of controle.',
    decisionPurpose: 'De vorm van de benodigde RI&E-ondersteuning verduidelijken.',
    inputKind: 'OPTIONS',
    options: [
      { label: 'Nee', value: 'NONE', disposition: 'ANSWERED' },
      {
        label: 'Ja, maar deze moet worden geactualiseerd',
        value: 'NEEDS_UPDATE',
        disposition: 'ANSWERED',
      },
      {
        label: 'Ja, maar ik weet niet of deze nog voldoet',
        value: 'COMPLIANCE_UNCERTAIN',
        disposition: 'ANSWERED',
      },
      { label: 'Dat weet ik niet', disposition: 'UNKNOWN' },
    ],
  },
  {
    questionKey: 'employee_count_range',
    questionVersion: 1,
    legend: 'Hoeveel medewerkers heeft uw organisatie?',
    explanation:
      'Een globale omvang helpt om uw situatie begrijpelijk te maken. Een exact aantal is nog niet nodig.',
    decisionPurpose: 'De globale organisatieomvang als context vastleggen.',
    inputKind: 'OPTIONS',
    options: [
      { label: '1 tot en met 10', value: 'ONE_TO_TEN', disposition: 'ANSWERED' },
      { label: '11 tot en met 50', value: 'ELEVEN_TO_FIFTY', disposition: 'ANSWERED' },
      {
        label: '51 tot en met 250',
        value: 'FIFTY_ONE_TO_TWO_FIFTY',
        disposition: 'ANSWERED',
      },
      {
        label: 'Meer dan 250',
        value: 'MORE_THAN_TWO_FIFTY',
        disposition: 'ANSWERED',
      },
      { label: 'Dat weet ik nu niet', disposition: 'UNKNOWN' },
    ],
  },
  {
    questionKey: 'rie_current_age',
    questionVersion: 1,
    legend: 'Wanneer is uw huidige RI&E opgesteld?',
    explanation:
      'Een globale periode is voldoende. Zo wordt duidelijk hoe actueel de bestaande RI&E waarschijnlijk is.',
    decisionPurpose: 'De ouderdom van de bestaande RI&E vastleggen.',
    inputKind: 'OPTIONS',
    options: [
      {
        label: 'Minder dan een jaar geleden',
        value: 'LESS_THAN_ONE_YEAR',
        disposition: 'ANSWERED',
      },
      {
        label: 'Eén tot drie jaar geleden',
        value: 'ONE_TO_THREE_YEARS',
        disposition: 'ANSWERED',
      },
      {
        label: 'Meer dan drie jaar geleden',
        value: 'MORE_THAN_THREE_YEARS',
        disposition: 'ANSWERED',
      },
      { label: 'Dat weet ik niet', disposition: 'UNKNOWN' },
    ],
  },
  {
    questionKey: 'rie_update_reason',
    questionVersion: 1,
    legend: 'Waarom wilt u de RI&E actualiseren of controleren?',
    explanation:
      'De aanleiding helpt om de hulpvraag af te bakenen zonder al een oplossing te kiezen.',
    decisionPurpose: 'De aanleiding voor actualisatie of controle verduidelijken.',
    inputKind: 'OPTIONS',
    options: [
      {
        label: 'Onze organisatie is veranderd',
        value: 'ORGANIZATION_CHANGED',
        disposition: 'ANSWERED',
      },
      {
        label: 'Werkzaamheden of risico’s zijn veranderd',
        value: 'WORK_CHANGED',
        disposition: 'ANSWERED',
      },
      {
        label: 'Er was een incident of ander signaal',
        value: 'INCIDENT_OR_SIGNAL',
        disposition: 'ANSWERED',
      },
      {
        label: 'Het is tijd voor een periodieke controle',
        value: 'PERIODIC_REVIEW',
        disposition: 'ANSWERED',
      },
      { label: 'Dat weet ik nog niet', disposition: 'UNKNOWN' },
    ],
  },
  {
    questionKey: 'sector',
    questionVersion: 1,
    legend: 'In welke sector is uw organisatie actief?',
    explanation:
      'Sectorcontext helpt later om relevante ervaring te herkennen. U kunt dit nu ook overslaan.',
    decisionPurpose: 'De sectorcontext voor toekomstige vraagverheldering vastleggen.',
    inputKind: 'OPTIONS',
    options: [
      { label: 'Bouw', value: 'Bouw', disposition: 'ANSWERED' },
      { label: 'Industrie', value: 'Industrie', disposition: 'ANSWERED' },
      { label: 'Zorg en welzijn', value: 'Zorg en welzijn', disposition: 'ANSWERED' },
      {
        label: 'Zakelijke dienstverlening',
        value: 'Zakelijke dienstverlening',
        disposition: 'ANSWERED',
      },
      { label: 'Handel en logistiek', value: 'Handel en logistiek', disposition: 'ANSWERED' },
      { label: 'Onderwijs', value: 'Onderwijs', disposition: 'ANSWERED' },
      { label: 'Andere sector', value: 'Andere sector', disposition: 'ANSWERED' },
      { label: 'Nu niet', disposition: 'SKIPPED' },
    ],
    skipMessage: 'Geen probleem. Deze informatie kunnen we later altijd nog aanvullen.',
  },
  {
    questionKey: 'location_count',
    questionVersion: 1,
    legend: 'Voor hoeveel vestigingen heeft u ondersteuning nodig?',
    explanation:
      'Een globale telling maakt duidelijk hoe breed de RI&E moet worden uitgevoerd.',
    decisionPurpose: 'De omvang van de uitvoering over vestigingen vastleggen.',
    inputKind: 'NUMBER',
    numberLabel: 'Aantal vestigingen',
    numberPlaceholder: 'Bijvoorbeeld 1',
    options: [{ label: 'Dat weet ik nu niet', disposition: 'UNKNOWN' }],
  },
  {
    questionKey: 'preferred_start_period',
    questionVersion: 1,
    legend: 'Wanneer wilt u hiermee starten?',
    explanation:
      'Een globale voorkeur is voldoende. Deze informatie kan later altijd worden aangescherpt.',
    decisionPurpose: 'De gewenste startperiode globaal vastleggen.',
    inputKind: 'OPTIONS',
    options: [
      { label: 'Ik oriënteer mij nog', value: 'ORIENTING', disposition: 'ANSWERED' },
      { label: 'Zo snel mogelijk', value: 'SOON', disposition: 'ANSWERED' },
      {
        label: 'Voor een specifieke datum',
        value: 'SPECIFIC_DATE',
        disposition: 'ANSWERED',
      },
      { label: 'Dat weet ik nog niet', disposition: 'UNKNOWN' },
    ],
  },
] as const satisfies readonly PublicIntakePrototypeQuestion[]

const prototypeQuestionsByKey = new Map<string, PublicIntakePrototypeQuestion>(
  publicIntakePrototypeQuestions.map((question) => [question.questionKey, question]),
)

const labelsByAnswer = new Map<string, string>()
for (const question of publicIntakePrototypeQuestions) {
  for (const option of question.options) {
    const value = 'value' in option ? option.value : undefined
    labelsByAnswer.set(
      `${question.questionKey}:${option.disposition}:${value ?? ''}`,
      option.label,
    )
  }
}
labelsByAnswer.set(
  'guidance_topic:ANSWERED:HEALTH_WORKLOAD',
  'Gezondheid of belasting van medewerkers',
)

export function getRecognizableRequestInitialAnswer(
  key: RecognizableRequestKey,
): RecordPublicIntakeAnswerInput | null {
  const valueByKey: Partial<Record<RecognizableRequestKey, string>> = {
    rie_needed: 'NONE',
    rie_update: 'NEEDS_UPDATE',
    rie_uncertain: 'COMPLIANCE_UNCERTAIN',
  }
  const value = valueByKey[key]
  return value
    ? {
        questionKey: 'rie_existing_status',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value,
      }
    : null
}

export function getPublicIntakePrototypeQuestion(
  questionKey: string | null,
): PublicIntakePrototypeQuestion | null {
  return questionKey ? (prototypeQuestionsByKey.get(questionKey) ?? null) : null
}

export function getPublicIntakeAnswerLabel(answer: PublicIntakeAnswerView): string {
  return (
    labelsByAnswer.get(
      `${answer.questionKey}:${answer.disposition}:${answer.value === null ? '' : String(answer.value)}`,
    ) ??
    (answer.disposition === 'UNKNOWN'
      ? 'Dat weet ik niet'
      : answer.disposition === 'SKIPPED'
        ? 'Nu niet'
        : String(answer.value ?? 'Niet ingevuld'))
  )
}

export function getEntryPointLabel(
  entryPoint: PublicIntakeEntryPoint,
  selectedRequestKey: string | null,
  originalInput: string | null,
): string {
  if (entryPoint === 'FREE_TEXT') return originalInput ?? 'Uw beschreven situatie'
  return (
    recognizableSituations.find((situation) => situation.key === selectedRequestKey)?.label ??
    'Uw gekozen situatie'
  )
}
