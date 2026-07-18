export const TEST_PROVIDER_PREFIX = 'TEST-WM-'
export const TEST_PROVIDER_DATABASE = 'workmatchr_test_providers'
export const TEST_PROVIDER_DATASET_VERSION = 'TEST-WM-PROVIDERS-V1'

export const provinceFixtures = [
  ['GRONINGEN', 'Groningen', 'Testplaats Groningen'],
  ['FRIESLAND', 'Friesland', 'Testplaats Friesland'],
  ['DRENTHE', 'Drenthe', 'Testplaats Drenthe'],
  ['OVERIJSSEL', 'Overijssel', 'Testplaats Overijssel'],
  ['GELDERLAND', 'Gelderland', 'Testplaats Gelderland'],
  ['UTRECHT', 'Utrecht', 'Testplaats Utrecht'],
  ['NOORD_HOLLAND', 'Noord-Holland', 'Testplaats Noord-Holland'],
  ['ZUID_HOLLAND', 'Zuid-Holland', 'Testplaats Zuid-Holland'],
  ['ZEELAND', 'Zeeland', 'Testplaats Zeeland'],
  ['NOORD_BRABANT', 'Noord-Brabant', 'Testplaats Noord-Brabant'],
  ['LIMBURG', 'Limburg', 'Testplaats Limburg'],
  ['FLEVOLAND', 'Flevoland', 'Testplaats Flevoland'],
] as const

export const serviceCodes = [
  'RISK_ASSESSMENT',
  'SAFETY_ADVICE',
  'AUDIT_AND_INSPECTION',
  'IMPLEMENTATION_SUPPORT',
  'TRAINING',
] as const

export type ServiceCode = (typeof serviceCodes)[number]
export type ProviderCategory =
  | 'FULLY_QUALIFIED'
  | 'BLOCKED'
  | 'CONTENT_FIT_UNVERIFIED'
  | 'OUTSIDE_WORK_AREA'
  | 'WRONG_SERVICE'
  | 'INSUFFICIENT_QUALIFICATION'
  | 'MISSING_INSURANCE'
  | 'SELF_DECLARED_ONLY'
  | 'MULTI_PURPOSE'

export type TestProviderSpec = {
  number: number
  code: string
  organizationName: string
  organizationType: 'PROVIDER' | 'BOTH'
  provinceCode: string
  province: string
  city: string
  workAreaCodes: string[]
  serviceCodes: ServiceCode[]
  sectorCodes: string[]
  professionalCount: number
  category: ProviderCategory
  verified: boolean
  qualified: boolean
  selectable: boolean
  blocked: boolean
  insured: boolean
}

function primaryService(number: number): ServiceCode {
  if (number <= 15) return 'RISK_ASSESSMENT'
  if (number <= 25) return 'SAFETY_ADVICE'
  if (number <= 33) return 'AUDIT_AND_INSPECTION'
  if (number <= 40) return 'IMPLEMENTATION_SUPPORT'
  return 'TRAINING'
}

const multiServices: Record<number, ServiceCode[]> = {
  46: ['RISK_ASSESSMENT', 'SAFETY_ADVICE'],
  47: ['RISK_ASSESSMENT', 'AUDIT_AND_INSPECTION'],
  48: ['SAFETY_ADVICE', 'IMPLEMENTATION_SUPPORT'],
  49: ['AUDIT_AND_INSPECTION', 'TRAINING'],
  50: ['RISK_ASSESSMENT', 'IMPLEMENTATION_SUPPORT', 'TRAINING'],
}

function categoryFor(number: number): ProviderCategory {
  if (number <= 15) return 'FULLY_QUALIFIED'
  if (number <= 18) return 'BLOCKED'
  if (number <= 23) return 'CONTENT_FIT_UNVERIFIED'
  if (number <= 28) return 'OUTSIDE_WORK_AREA'
  if (number <= 33) return 'WRONG_SERVICE'
  if (number <= 38) return 'INSUFFICIENT_QUALIFICATION'
  if (number <= 42) return 'MISSING_INSURANCE'
  if (number <= 45) return 'SELF_DECLARED_ONLY'
  return 'MULTI_PURPOSE'
}

function workAreasFor(number: number, provinceCode: string): string[] {
  if (number % 10 === 0) return ['NATIONWIDE']
  if (number % 7 === 0) return ['REMOTE']
  if (number % 5 === 0) return [provinceCode, 'REMOTE']
  if (number % 3 === 0) {
    const current = provinceFixtures.findIndex(([code]) => code === provinceCode)
    return [provinceCode, provinceFixtures[(current + 1) % provinceFixtures.length][0]]
  }
  return [provinceCode]
}

const sectorCodes = [
  'bouw',
  'industrie',
  'zorg',
  'onderwijs',
  'overheid',
  'semioverheid',
  'logistiek',
  'zakelijke-dienstverlening',
  'detailhandel',
  'horeca',
  'landbouw',
] as const

export const testProviderSpecs: TestProviderSpec[] = Array.from({ length: 50 }, (_, index) => {
  const number = index + 1
  const [provinceCode, province, city] = provinceFixtures[index % provinceFixtures.length]
  const category = categoryFor(number)
  const qualified = ['FULLY_QUALIFIED', 'OUTSIDE_WORK_AREA', 'WRONG_SERVICE', 'MULTI_PURPOSE', 'BLOCKED'].includes(category)
  const selectable = qualified && category !== 'BLOCKED'
  return {
    number,
    code: `${TEST_PROVIDER_PREFIX}${String(number).padStart(2, '0')}`,
    organizationName: `${TEST_PROVIDER_PREFIX}Dienstverlener ${String(number).padStart(2, '0')}`,
    organizationType: number % 4 === 0 ? 'BOTH' : 'PROVIDER',
    provinceCode,
    province,
    city,
    workAreaCodes: workAreasFor(number, provinceCode),
    serviceCodes: multiServices[number] ?? [primaryService(number)],
    sectorCodes: [sectorCodes[index % sectorCodes.length], sectorCodes[(index + 3) % sectorCodes.length]],
    professionalCount: (index % 5) + 1,
    category,
    verified: qualified || category === 'INSUFFICIENT_QUALIFICATION',
    qualified,
    selectable,
    blocked: category === 'BLOCKED',
    insured: category !== 'MISSING_INSURANCE',
  }
})

export type TestFilterScenario = {
  code: string
  serviceCode: ServiceCode
  regionCode: string
  requiredQualificationCode: string
  remoteOnly?: boolean
  excludedCategory?: ProviderCategory
  description: string
}

export const testFilterScenarios: TestFilterScenario[] = [
  { code: 'SCENARIO-01', serviceCode: 'RISK_ASSESSMENT', regionCode: 'GRONINGEN', requiredQualificationCode: 'hvk-diploma', description: 'RI&E in Groningen' },
  { code: 'SCENARIO-02', serviceCode: 'SAFETY_ADVICE', regionCode: 'UTRECHT', requiredQualificationCode: 'hvk-diploma', description: 'Veiligheidsadvies in Utrecht' },
  { code: 'SCENARIO-03', serviceCode: 'AUDIT_AND_INSPECTION', regionCode: 'ZUID_HOLLAND', requiredQualificationCode: 'iso-45001-lead-auditor', description: 'Audit in Zuid-Holland' },
  { code: 'SCENARIO-04', serviceCode: 'IMPLEMENTATION_SUPPORT', regionCode: 'NOORD_BRABANT', requiredQualificationCode: 'mvk-diploma', description: 'Implementatieondersteuning in Noord-Brabant' },
  { code: 'SCENARIO-05', serviceCode: 'TRAINING', regionCode: 'LIMBURG', requiredQualificationCode: 'mvk-diploma', description: 'Training in Limburg' },
  { code: 'SCENARIO-06', serviceCode: 'RISK_ASSESSMENT', regionCode: 'REMOTE', requiredQualificationCode: 'hvk-diploma', remoteOnly: true, description: 'RI&E volledig op afstand' },
  { code: 'SCENARIO-07', serviceCode: 'SAFETY_ADVICE', regionCode: 'FLEVOLAND', requiredQualificationCode: 'hvk-diploma', description: 'Veiligheidsadvies in Flevoland' },
  { code: 'SCENARIO-08', serviceCode: 'AUDIT_AND_INSPECTION', regionCode: 'NATIONWIDE', requiredQualificationCode: 'iso-45001-lead-auditor', description: 'Landelijke audit' },
  { code: 'SCENARIO-09', serviceCode: 'IMPLEMENTATION_SUPPORT', regionCode: 'GELDERLAND', requiredQualificationCode: 'mvk-diploma', excludedCategory: 'BLOCKED', description: 'Implementatie in Gelderland zonder geblokkeerde aanbieders' },
  { code: 'SCENARIO-10', serviceCode: 'TRAINING', regionCode: 'REMOTE', requiredQualificationCode: 'mvk-diploma', remoteOnly: true, description: 'Training op afstand' },
]

export function expectedProvidersForScenario(scenario: TestFilterScenario): string[] {
  return testProviderSpecs
    .filter((provider) => provider.selectable)
    .filter((provider) => provider.serviceCodes.includes(scenario.serviceCode))
    .filter((provider) => {
      if (scenario.remoteOnly) return provider.workAreaCodes.includes('REMOTE')
      if (scenario.regionCode === 'NATIONWIDE') return provider.workAreaCodes.includes('NATIONWIDE')
      return provider.workAreaCodes.includes(scenario.regionCode) || provider.workAreaCodes.includes('NATIONWIDE')
    })
    .filter((provider) => !scenario.excludedCategory || provider.category !== scenario.excludedCategory)
    .map((provider) => provider.code)
    .sort()
}

export function exclusionReason(provider: TestProviderSpec, scenario: TestFilterScenario): string | null {
  if (!provider.selectable) return provider.blocked ? 'PROVIDER_BLOCKED' : 'NOT_SELECTABLE'
  if (!provider.serviceCodes.includes(scenario.serviceCode)) return 'WRONG_SERVICE'
  const regionMatches = scenario.remoteOnly
    ? provider.workAreaCodes.includes('REMOTE')
    : scenario.regionCode === 'NATIONWIDE'
      ? provider.workAreaCodes.includes('NATIONWIDE')
      : provider.workAreaCodes.includes(scenario.regionCode) || provider.workAreaCodes.includes('NATIONWIDE')
  if (!regionMatches) return 'OUTSIDE_WORK_AREA'
  if (scenario.excludedCategory && provider.category === scenario.excludedCategory) return 'EXCLUDED_CATEGORY'
  return null
}
