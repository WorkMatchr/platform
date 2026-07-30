export const TEST_PROVIDER_PREFIX = 'TEST-WM-'
export const TEST_PROVIDER_DATABASE = 'workmatchr_test_providers'
export const TEST_PROVIDER_DATASET_VERSION = 'TEST-WM-MARKETPLACE-V4'

export const provinceFixtures = [
  ['GRONINGEN', 'Groningen', 'Groningen'],
  ['FRIESLAND', 'Friesland', 'Leeuwarden'],
  ['DRENTHE', 'Drenthe', 'Assen'],
  ['OVERIJSSEL', 'Overijssel', 'Zwolle'],
  ['GELDERLAND', 'Gelderland', 'Arnhem'],
  ['UTRECHT', 'Utrecht', 'Utrecht'],
  ['NOORD_HOLLAND', 'Noord-Holland', 'Alkmaar'],
  ['ZUID_HOLLAND', 'Zuid-Holland', 'Rotterdam'],
  ['ZEELAND', 'Zeeland', 'Middelburg'],
  ['NOORD_BRABANT', 'Noord-Brabant', 'Breda'],
  ['LIMBURG', 'Limburg', 'Maastricht'],
  ['FLEVOLAND', 'Flevoland', 'Lelystad'],
] as const

export const serviceCodes = [
  'RISK_ASSESSMENT',
  'SAFETY_ADVICE',
  'AUDIT_AND_INSPECTION',
  'IMPLEMENTATION_SUPPORT',
  'TRAINING',
] as const

export type ServiceCode = (typeof serviceCodes)[number]
export type ProfessionalCategory =
  | 'MVK'
  | 'HVK'
  | 'BEDRIJFSARTS'
  | 'ARBEIDSHYGIENIST'
  | 'ARBEIDSDESKUNDIGE'
  | 'ERGONOOM'
  | 'BHV_SPECIALIST'
  | 'MACHINEVEILIGHEID'
  | 'ASBEST'
  | 'VEILIGHEIDSADVIES'

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
  chamberOfCommerceNumber: string
  phone: string
  website: string
  email: string
  logoPlaceholder: string
  workAreaCodes: string[]
  serviceCodes: ServiceCode[]
  focusAreas: string[]
  sectorCodes: string[]
  professionalCount: number
  professionalCategory: ProfessionalCategory
  experienceYears: 3 | 8 | 15 | 25
  rating: 4.2 | 4.6 | 4.8 | 5
  reviewCount: number
  availability: 'DIRECT' | 'TWO_WEEKS' | 'ONE_MONTH'
  hourlyRate: 75 | 95 | 110 | 125 | 145 | 175
  category: ProviderCategory
  verified: boolean
  qualified: boolean
  selectable: boolean
  blocked: boolean
  insured: boolean
}

const providerNames = [
  'Delta Veiligheidsadvies',
  'ArboKompas',
  'VeiligWerkt Noord',
  'Atlas Safety',
  'Integra Arbo & Veiligheid',
  'Rijnmond Risicobeheer',
  'Noorderlicht Arboadvies',
  'VitaalWerk Partners',
  'Kompas Veiligheidskunde',
  'Meridiaan Arbozorg',
  'IJssel Veiligheidsadvies',
  'Havenstad Safety',
  'Veluwe Arbo Experts',
  'Domstad Veilig Werken',
  'Kennemer Risicoadvies',
  'Maasland Veiligheid',
  'Schelde Arbo Consult',
  'Brabant Werkt Veilig',
  'Limburg Preventiepartners',
  'Flevo Veiligheidsbureau',
  'Orion Bedrijfsgezondheid',
  'VitaalKompas Bedrijfsartsen',
  'HelderWerk Arbozorg',
  'Aurelia Bedrijfsgezondheid',
  'Nova Arbeid & Gezondheid',
  'Medisch Werkperspectief',
  'Hygieia Arbeidshygiëne',
  'Lucht & Werk Advies',
  'Expositie Arbeidshygiëne',
  'GezondWerk Omgevingsadvies',
  'Aeris Blootstellingsadvies',
  'Perspectief Arbeidsdeskundigen',
  'Werkvermogen Adviesgroep',
  'InzetbaarheidsKompas',
  'Balans Arbeidsadvies',
  'ErgoWerk Nederland',
  'Mens & Houding Advies',
  'ErgoPraktijk Noord',
  'BrandVeilig Adviesgroep',
  'BHV Kompas',
  'Paraat Bedrijfshulpverlening',
  'Veiligheidsacademie Delta',
  'BHV RegioPartners',
  'Alarm & Preventie Advies',
  'MachineZeker',
  'CE Veiligheidsadvies',
  'Techniek Veilig Consult',
  'AsbestInzicht',
  'Materiaalscan Advies',
  'Prisma Veiligheidsbureau',
] as const

const professionalCategories: ProfessionalCategory[] = [
  ...Array.from({ length: 10 }, () => 'MVK' as const),
  ...Array.from({ length: 8 }, () => 'HVK' as const),
  ...Array.from({ length: 6 }, () => 'BEDRIJFSARTS' as const),
  ...Array.from({ length: 5 }, () => 'ARBEIDSHYGIENIST' as const),
  ...Array.from({ length: 4 }, () => 'ARBEIDSDESKUNDIGE' as const),
  ...Array.from({ length: 3 }, () => 'ERGONOOM' as const),
  ...Array.from({ length: 6 }, () => 'BHV_SPECIALIST' as const),
  ...Array.from({ length: 3 }, () => 'MACHINEVEILIGHEID' as const),
  ...Array.from({ length: 2 }, () => 'ASBEST' as const),
  ...Array.from({ length: 3 }, () => 'VEILIGHEIDSADVIES' as const),
]

const categoryServices: Record<ProfessionalCategory, ServiceCode[]> = {
  MVK: ['RISK_ASSESSMENT', 'IMPLEMENTATION_SUPPORT'],
  HVK: ['SAFETY_ADVICE', 'RISK_ASSESSMENT', 'AUDIT_AND_INSPECTION'],
  BEDRIJFSARTS: ['IMPLEMENTATION_SUPPORT'],
  ARBEIDSHYGIENIST: ['RISK_ASSESSMENT', 'SAFETY_ADVICE'],
  ARBEIDSDESKUNDIGE: ['IMPLEMENTATION_SUPPORT', 'SAFETY_ADVICE'],
  ERGONOOM: ['SAFETY_ADVICE', 'IMPLEMENTATION_SUPPORT'],
  BHV_SPECIALIST: ['TRAINING', 'AUDIT_AND_INSPECTION'],
  MACHINEVEILIGHEID: ['AUDIT_AND_INSPECTION', 'SAFETY_ADVICE'],
  ASBEST: ['RISK_ASSESSMENT', 'AUDIT_AND_INSPECTION'],
  VEILIGHEIDSADVIES: ['SAFETY_ADVICE', 'AUDIT_AND_INSPECTION', 'TRAINING'],
}

export const categorySpecialisms: Record<
  ProfessionalCategory,
  string
> = {
  MVK: 'middelbare-veiligheidskundige',
  HVK: 'hogere-veiligheidskundige',
  BEDRIJFSARTS: 'bedrijfsarts',
  ARBEIDSHYGIENIST: 'arbeidshygienist',
  ARBEIDSDESKUNDIGE: 'arbeidsdeskundige',
  ERGONOOM: 'ergonoom',
  BHV_SPECIALIST: 'brandveiligheid',
  MACHINEVEILIGHEID: 'machineveiligheid',
  ASBEST: 'asbest',
  VEILIGHEIDSADVIES: 'operationele-veiligheid',
}

const categoryFocusAreas: Record<ProfessionalCategory, string[]> = {
  MVK: ['RI&E', 'werkplekinspecties', 'incidentonderzoek'],
  HVK: ['RI&E', 'veiligheidsmanagement', 'ATEX'],
  BEDRIJFSARTS: ['PMO', 'verzuimadvies', 'duurzame inzetbaarheid'],
  ARBEIDSHYGIENIST: ['gevaarlijke stoffen', 'blootstellingsonderzoek', 'PGS'],
  ARBEIDSDESKUNDIGE: ['belastbaarheid', 're-integratie', 'werkvermogen'],
  ERGONOOM: ['fysieke belasting', 'werkplekinrichting', 'PSA'],
  BHV_SPECIALIST: ['BHV', 'ontruiming', 'brandveiligheid'],
  MACHINEVEILIGHEID: ['machineveiligheid', 'CE-markering', 'LOTO'],
  ASBEST: ['asbest', 'materiaalinventarisatie', 'blootstellingsbeheersing'],
  VEILIGHEIDSADVIES: ['audit', 'incidentonderzoek', 'veiligheidscultuur'],
}

const experienceValues = [3, 8, 15, 25] as const
const ratingValues = [4.2, 4.6, 4.8, 5] as const
const availabilityValues = ['DIRECT', 'TWO_WEEKS', 'ONE_MONTH'] as const
const hourlyRates = [75, 95, 110, 125, 145, 175] as const

function categoryFor(
  number: number,
  professionalCategory: ProfessionalCategory,
): ProviderCategory {
  if (professionalCategory === 'ERGONOOM') return 'FULLY_QUALIFIED'
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
  const professionalCategory = professionalCategories[index]
  const category = categoryFor(number, professionalCategory)
  const qualified = ['FULLY_QUALIFIED', 'OUTSIDE_WORK_AREA', 'WRONG_SERVICE', 'MULTI_PURPOSE', 'BLOCKED'].includes(category)
  const selectable = qualified && category !== 'BLOCKED'
  return {
    number,
    code: `${TEST_PROVIDER_PREFIX}${String(number).padStart(2, '0')}`,
    organizationName: `${TEST_PROVIDER_PREFIX}${providerNames[index]}`,
    organizationType: number % 4 === 0 ? 'BOTH' : 'PROVIDER',
    provinceCode,
    province,
    city,
    chamberOfCommerceNumber: `${TEST_PROVIDER_PREFIX}KVK-${String(number).padStart(4, '0')}`,
    phone: `+31 20 000 ${String(1000 + number).slice(-4)}`,
    website: `https://dienstverlener-${String(number).padStart(2, '0')}.example.invalid`,
    email: `contact@dienstverlener-${String(number).padStart(2, '0')}.example.invalid`,
    logoPlaceholder: providerNames[index].split(/[\s&]+/).map((part) => part[0]).join('').slice(0, 3).toUpperCase(),
    workAreaCodes: workAreasFor(number, provinceCode),
    serviceCodes: categoryServices[professionalCategory].slice(0, 1 + (number % categoryServices[professionalCategory].length)),
    focusAreas: categoryFocusAreas[professionalCategory],
    sectorCodes: [sectorCodes[index % sectorCodes.length], sectorCodes[(index + 3) % sectorCodes.length]],
    professionalCount: (index % 5) + 1,
    professionalCategory,
    experienceYears: experienceValues[index % experienceValues.length],
    rating: ratingValues[index % ratingValues.length],
    reviewCount: 4 + ((number * 7) % 83),
    availability: availabilityValues[index % availabilityValues.length],
    hourlyRate: hourlyRates[index % hourlyRates.length],
    category,
    verified: qualified || category === 'INSUFFICIENT_QUALIFICATION',
    qualified,
    selectable,
    blocked: category === 'BLOCKED',
    insured: category !== 'MISSING_INSURANCE',
  }
})

export type TestClientSpec = {
  number: number
  code: string
  organizationName: string
  sectorCode: string
  provinceCode: string
  province: string
  city: string
  chamberOfCommerceNumber: string
  phone: string
  website: string
  email: string
  employeeCount: number
}

const clientNames = [
  'Bouwgroep Horizon',
  'Noordkade Constructie',
  'Metaalwerk Delta',
  'Industriepark Nova',
  'TransLog Noord',
  'Rijnland Distributie',
  'Zorgcentrum Linde',
  'Welzijnshuis Kompas',
  'Gemeente Waterdam',
  'Gemeente Veenhoven',
  'Onderwijsgroep Atlas',
  'Praktijkschool Meridiaan',
  'MKB Collectief Veluwe',
  'Handelshuis Oranje',
  'Voedingsbedrijf Polder',
  'Techniekbedrijf IJssel',
  'Aannemerscombinatie Fortis',
  'InfraPartners Nederland',
  'Landbouwcoöperatie Morgen',
  'Hotelgroep Duinzicht',
] as const

const clientSectorCodes = [
  'bouw',
  'bouw',
  'industrie',
  'industrie',
  'logistiek',
  'logistiek',
  'zorg',
  'zorg',
  'overheid',
  'overheid',
  'onderwijs',
  'onderwijs',
  'zakelijke-dienstverlening',
  'detailhandel',
  'industrie',
  'zakelijke-dienstverlening',
  'bouw',
  'bouw',
  'landbouw',
  'horeca',
] as const

export const testClientSpecs: TestClientSpec[] = Array.from({ length: 20 }, (_, index) => {
  const number = index + 1
  const [provinceCode, province, city] = provinceFixtures[(index * 5) % provinceFixtures.length]
  return {
    number,
    code: `${TEST_PROVIDER_PREFIX}CLIENT-${String(number).padStart(2, '0')}`,
    organizationName: `${TEST_PROVIDER_PREFIX}${clientNames[index]}`,
    sectorCode: clientSectorCodes[index],
    provinceCode,
    province,
    city,
    chamberOfCommerceNumber: `${TEST_PROVIDER_PREFIX}KLANT-KVK-${String(number).padStart(4, '0')}`,
    phone: `+31 20 000 ${String(2000 + number).slice(-4)}`,
    website: `https://opdrachtgever-${String(number).padStart(2, '0')}.example.invalid`,
    email: `contact@opdrachtgever-${String(number).padStart(2, '0')}.example.invalid`,
    employeeCount: [8, 24, 55, 120, 280][index % 5],
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
