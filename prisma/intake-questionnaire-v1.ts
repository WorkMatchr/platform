export type IntakeQuestionnaireOptionSeed = {
  id: string
  value: string
  label: string
  sortOrder: number
  isExclusive?: boolean
}

export type IntakeQuestionnaireQuestionSeed = {
  id: string
  key: string
  category:
    | 'HELP_REQUEST'
    | 'DESIRED_OUTCOME'
    | 'SITUATION'
    | 'IMPACT'
    | 'URGENCY'
    | 'LOCATION'
    | 'WORK_MODE'
    | 'PLANNING'
    | 'CONSTRAINTS'
  inputType:
    | 'SHORT_TEXT'
    | 'LONG_TEXT'
    | 'NUMBER'
    | 'BOOLEAN'
    | 'DATE'
    | 'SINGLE_SELECT'
    | 'MULTI_SELECT'
    | 'ORGANIZATION_LOCATION'
  label: string
  helpText: string
  isRequired: boolean
  sortOrder: number
  minLength?: number
  maxLength?: number
  minNumber?: number
  maxNumber?: number
  minSelections?: number
  maxSelections?: number
  options?: IntakeQuestionnaireOptionSeed[]
}

function createOptions(options: ReadonlyArray<readonly [string, string, string, boolean?]>): IntakeQuestionnaireOptionSeed[] {
  return options.map(([id, value, label, isExclusive], index) => ({
    id,
    value,
    label,
    sortOrder: (index + 1) * 10,
    ...(isExclusive === undefined ? {} : { isExclusive }),
  }))
}

export const intakeQuestionnaireV1 = {
  id: '00000000-0000-4000-8000-000000005000',
  versionId: '00000000-0000-4000-8000-000000005001',
  slug: 'client-occupational-health-and-safety',
  name: 'Arbo en veiligheid — opdrachtgever',
  version: 1,
  questions: [
    {
      id: '00000000-0000-4000-8000-000000005101',
      key: 'HELP_REQUEST_DESCRIPTION',
      category: 'HELP_REQUEST',
      inputType: 'LONG_TEXT',
      label: 'Waarbij heeft Uw organisatie hulp nodig?',
      helpText:
        'Beschrijf kort wat er speelt. U hoeft nog niet te weten welke specialist U nodig heeft. Vermeld geen namen, medische gegevens, BSN’s, wachtwoorden of andere vertrouwelijke persoonsgegevens.',
      isRequired: true,
      sortOrder: 10,
      minLength: 20,
      maxLength: 2000,
    },
    {
      id: '00000000-0000-4000-8000-000000005102',
      key: 'HELP_REQUEST_TOPICS',
      category: 'HELP_REQUEST',
      inputType: 'MULTI_SELECT',
      label: 'Welke onderwerpen spelen bij Uw hulpvraag?',
      helpText: 'Kies maximaal drie onderwerpen. Kies ‘Dat weet ik nog niet’ wanneer geen onderwerp passend of duidelijk is.',
      isRequired: true,
      sortOrder: 20,
      minSelections: 1,
      maxSelections: 3,
      options: createOptions([
        ['00000000-0000-4000-8000-000000006101', 'RISK_INVENTORY_EVALUATION', 'RI&E of plan van aanpak'],
        ['00000000-0000-4000-8000-000000006102', 'WORKPLACE_OPERATIONAL_SAFETY', 'Veilig werken of veiligheid op de werkvloer'],
        ['00000000-0000-4000-8000-000000006103', 'MACHINERY_WORK_EQUIPMENT', 'Machines, gereedschap of arbeidsmiddelen'],
        ['00000000-0000-4000-8000-000000006104', 'HAZARDOUS_SUBSTANCES', 'Gevaarlijke stoffen'],
        ['00000000-0000-4000-8000-000000006105', 'ERGONOMICS_PHYSICAL_LOAD', 'Ergonomie of lichamelijke belasting'],
        ['00000000-0000-4000-8000-000000006106', 'PSYCHOSOCIAL_WORKLOAD', 'Werkdruk, ongewenst gedrag of sociale veiligheid'],
        ['00000000-0000-4000-8000-000000006107', 'OCCUPATIONAL_HEALTH_EMPLOYABILITY', 'Gezondheid, verzuim of duurzame inzetbaarheid'],
        ['00000000-0000-4000-8000-000000006108', 'EMERGENCY_RESPONSE_FIRE_SAFETY', 'BHV, brandveiligheid of ontruiming'],
        ['00000000-0000-4000-8000-000000006109', 'INCIDENT_INVESTIGATION', 'Ongeval, incident of onderzoek'],
        ['00000000-0000-4000-8000-000000006110', 'TRAINING_SAFETY_CULTURE', 'Training, instructie of veiligheidscultuur'],
        ['00000000-0000-4000-8000-000000006111', 'POLICY_COMPLIANCE', 'Beleid, wetgeving of naleving'],
        ['00000000-0000-4000-8000-000000006112', 'OTHER', 'Anders'],
        ['00000000-0000-4000-8000-000000006113', 'NOT_SURE', 'Dat weet ik nog niet', true],
      ]),
    },
    {
      id: '00000000-0000-4000-8000-000000005103',
      key: 'DESIRED_OUTCOME_DESCRIPTION',
      category: 'DESIRED_OUTCOME',
      inputType: 'LONG_TEXT',
      label: 'Wat wilt U met de ondersteuning bereiken?',
      helpText: 'Beschrijf het gewenste resultaat, bijvoorbeeld een praktisch advies, een veilige werkwijze of duidelijkheid over vervolgstappen.',
      isRequired: true,
      sortOrder: 30,
      minLength: 10,
      maxLength: 1500,
    },
    {
      id: '00000000-0000-4000-8000-000000005104',
      key: 'SITUATION_DESCRIPTION',
      category: 'SITUATION',
      inputType: 'LONG_TEXT',
      label: 'Wat is de huidige situatie en wat heeft U al gedaan?',
      helpText: 'Beschrijf alleen informatie die nodig is om de situatie te begrijpen. Noem geen personen en voeg geen medische of andere bijzondere persoonsgegevens toe.',
      isRequired: true,
      sortOrder: 40,
      minLength: 20,
      maxLength: 3000,
    },
    {
      id: '00000000-0000-4000-8000-000000005105',
      key: 'IMPACT_AREAS',
      category: 'IMPACT',
      inputType: 'MULTI_SELECT',
      label: 'Wie of wat merkt gevolgen van deze situatie?',
      helpText: 'Kies maximaal vier opties. U kunt deze vraag ook overslaan.',
      isRequired: false,
      sortOrder: 50,
      minSelections: 1,
      maxSelections: 4,
      options: createOptions([
        ['00000000-0000-4000-8000-000000006114', 'EMPLOYEES', 'Medewerkers'],
        ['00000000-0000-4000-8000-000000006115', 'MANAGERS', 'Leidinggevenden'],
        ['00000000-0000-4000-8000-000000006116', 'TEMPORARY_WORKERS_CONTRACTORS', 'Inleenkrachten of opdrachtnemers'],
        ['00000000-0000-4000-8000-000000006117', 'VISITORS_CUSTOMERS', 'Bezoekers, klanten, cliënten, patiënten of leerlingen'],
        ['00000000-0000-4000-8000-000000006118', 'WORK_PROCESS', 'Een werkproces of afdeling'],
        ['00000000-0000-4000-8000-000000006119', 'LOCATION', 'Een locatie of vestiging'],
        ['00000000-0000-4000-8000-000000006120', 'ENTIRE_ORGANIZATION', 'De hele organisatie'],
        ['00000000-0000-4000-8000-000000006121', 'NOT_SURE', 'Dat weet ik nog niet', true],
      ]),
    },
    {
      id: '00000000-0000-4000-8000-000000005106',
      key: 'AFFECTED_EMPLOYEE_COUNT',
      category: 'IMPACT',
      inputType: 'NUMBER',
      label: 'Om hoeveel medewerkers gaat het ongeveer?',
      helpText: 'Een schatting is voldoende. Laat dit veld leeg wanneer het aantal niet bekend of niet van toepassing is.',
      isRequired: false,
      sortOrder: 60,
      minNumber: 1,
      maxNumber: 1000000,
    },
    {
      id: '00000000-0000-4000-8000-000000005107',
      key: 'SUPPORT_URGENCY',
      category: 'URGENCY',
      inputType: 'SINGLE_SELECT',
      label: 'Hoe snel wilt U ondersteuning?',
      helpText: 'Is er direct gevaar voor mensen? Volg dan eerst de noodprocedure van Uw organisatie en bel bij een acute noodsituatie 112. WorkMatchr is geen nood- of meldpunt.',
      isRequired: true,
      sortOrder: 70,
      minSelections: 1,
      maxSelections: 1,
      options: createOptions([
        ['00000000-0000-4000-8000-000000006122', 'AS_SOON_AS_POSSIBLE', 'Zo snel mogelijk, bij voorkeur binnen enkele dagen'],
        ['00000000-0000-4000-8000-000000006123', 'WITHIN_FOUR_WEEKS', 'Binnen vier weken'],
        ['00000000-0000-4000-8000-000000006124', 'WITHIN_THREE_MONTHS', 'Binnen één tot drie maanden'],
        ['00000000-0000-4000-8000-000000006125', 'AFTER_THREE_MONTHS', 'Later dan drie maanden'],
        ['00000000-0000-4000-8000-000000006126', 'NO_FIXED_PREFERENCE', 'Geen vaste voorkeur of nog onbekend'],
      ]),
    },
    {
      id: '00000000-0000-4000-8000-000000005108',
      key: 'PREFERRED_WORK_MODE',
      category: 'WORK_MODE',
      inputType: 'SINGLE_SELECT',
      label: 'Hoe kan de ondersteuning volgens U het beste plaatsvinden?',
      helpText: 'Dit is een voorkeur en geen garantie over de latere uitvoering.',
      isRequired: true,
      sortOrder: 80,
      minSelections: 1,
      maxSelections: 1,
      options: createOptions([
        ['00000000-0000-4000-8000-000000006127', 'ON_SITE', 'Op locatie'],
        ['00000000-0000-4000-8000-000000006128', 'HYBRID', 'Deels op locatie en deels op afstand'],
        ['00000000-0000-4000-8000-000000006129', 'REMOTE', 'Volledig op afstand'],
        ['00000000-0000-4000-8000-000000006130', 'NOT_SURE', 'Dat weet ik nog niet'],
      ]),
    },
    {
      id: '00000000-0000-4000-8000-000000005109',
      key: 'PRIMARY_LOCATION',
      category: 'LOCATION',
      inputType: 'ORGANIZATION_LOCATION',
      label: 'Op welke locatie speelt Uw hulpvraag vooral?',
      helpText: 'Kies de belangrijkste actieve locatie. Bij volledig werken op afstand is deze vraag niet verplicht.',
      isRequired: false,
      sortOrder: 90,
    },
    {
      id: '00000000-0000-4000-8000-000000005110',
      key: 'PREFERRED_START_DATE',
      category: 'PLANNING',
      inputType: 'DATE',
      label: 'Vanaf wanneer wilt U bij voorkeur ondersteuning?',
      helpText: 'Kies alleen een datum wanneer U al een voorkeur heeft. U kunt dit veld anders leeg laten.',
      isRequired: false,
      sortOrder: 100,
    },
    {
      id: '00000000-0000-4000-8000-000000005111',
      key: 'EXPECTED_ENGAGEMENT_SIZE',
      category: 'PLANNING',
      inputType: 'SINGLE_SELECT',
      label: 'Welke omvang van de ondersteuning verwacht U ongeveer?',
      helpText: 'De keuze is een eerste inschatting en bepaalt nog geen opdrachttype of aanbieder.',
      isRequired: false,
      sortOrder: 110,
      minSelections: 1,
      maxSelections: 1,
      options: createOptions([
        ['00000000-0000-4000-8000-000000006131', 'SINGLE_CONSULTATION', 'Een eenmalig advies of gesprek'],
        ['00000000-0000-4000-8000-000000006132', 'SHORT_ASSIGNMENT', 'Een korte opdracht van enkele dagen'],
        ['00000000-0000-4000-8000-000000006133', 'TEMPORARY_PROJECT', 'Een tijdelijk traject tot ongeveer drie maanden'],
        ['00000000-0000-4000-8000-000000006134', 'LONGER_TERM_SUPPORT', 'Ondersteuning voor een langere periode'],
        ['00000000-0000-4000-8000-000000006135', 'NOT_SURE', 'Dat weet ik nog niet'],
      ]),
    },
    {
      id: '00000000-0000-4000-8000-000000005112',
      key: 'CONSTRAINTS_DESCRIPTION',
      category: 'CONSTRAINTS',
      inputType: 'LONG_TEXT',
      label: 'Zijn er belangrijke randvoorwaarden waarmee rekening moet worden gehouden?',
      helpText: 'Denk bijvoorbeeld aan werktijden, toegang tot een locatie, vereiste afstemming of andere praktische beperkingen. Vermeld geen persoonsgegevens of secrets.',
      isRequired: false,
      sortOrder: 120,
      maxLength: 2000,
    },
  ] satisfies IntakeQuestionnaireQuestionSeed[],
} as const
