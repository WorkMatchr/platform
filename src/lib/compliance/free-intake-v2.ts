import { sectors } from '@/content/sectors'
import { complianceFreeIntakeModuleTitles, type ComplianceModuleCode } from './free-intake'

export const FREE_INTAKE_V2 = { product: 'FREE_INTAKE', questionnaireVersion: '2.0', applicabilityVersion: '2.0' } as const
export type IntakeAnswers = Record<string, string | string[]>
type Option = { value: string; label: string; group?: string }
type Question = { code: string; prompt: string; help: string; multiple: boolean; options: readonly Option[]; exclusive?: readonly string[] }
const options = (values: Record<string, string>, group?: string): Option[] => Object.entries(values).map(([value, label]) => ({ value, label, group }))
export const freeIntakeV2Questions: readonly Question[] = [
  { code: 'FI2-01', prompt: 'Heeft uw organisatie personeel?', help: 'Denk ook aan uitzendkrachten en stagiairs. Vul geen namen in.', multiple: false, options: options({ EMPLOYEES: 'Ja, werknemers in dienst', OTHERS_UNDER_AUTHORITY: 'Geen werknemers in dienst, wel andere mensen die onder onze leiding werken', VOLUNTEERS_ONLY: 'Alleen vrijwilligers', NONE: 'Nee, ook geen andere mensen onder onze leiding', UNKNOWN: 'Dat weet ik niet' }) },
  { code: 'FI2-02', prompt: 'In welke sector is uw organisatie actief?', help: 'U kunt meerdere sectoren kiezen. Dit zijn brede oriëntatiecategorieën.', multiple: true, exclusive: ['UNKNOWN'], options: [...sectors.map(s => ({ value: s.id, label: s.title })), ...options({ OTHER: 'Andere sector', UNKNOWN: 'Dat weet ik niet' })] },
  { code: 'FI2-03', prompt: 'Hoeveel werknemers heeft uw organisatie?', help: 'Tel personen, niet voltijdbanen (FTE). Andere mensen onder uw leiding blijven afzonderlijk bekend. De grens van 25 bepaalt op zichzelf geen vrijstelling.', multiple: false, options: options({ ZERO: '0', ONE_TO_25: '1–25', MORE_THAN_25: '26 of meer', UNKNOWN: 'Dat weet ik niet' }) },
  { code: 'FI2-04', prompt: "Welke werkzaamheden en arbeidsrisico's komen voor?", help: 'Kies wat u herkent. U hoeft niet zeker te weten of een situatie een risico oplevert. De keuzes gaan over het werk; vermeld geen medische omstandigheden of persoonsgegevens.', multiple: true, exclusive: ['NONE_RECOGNIZED', 'UNKNOWN'], options: [
    ...options({ HOME: 'Thuiswerk', MULTIPLE_LOCATIONS: 'Meerdere locaties', THIRD_PARTY_LOCATIONS: 'Werken bij anderen', DISPLAY_SCREEN: 'Beeldschermwerk', WORKPLACE_SETUP: 'Bijzondere inrichting van de werkplek' }, 'Werkplekken'),
    ...options({ MACHINES: 'Machines', WORK_EQUIPMENT: 'Andere arbeidsmiddelen', VEHICLES: 'Voertuigen/mobiele werktuigen', HEIGHT: 'Werken op hoogte', ELECTRICAL: 'Elektrische werkzaamheden', PRESSURE: 'Drukapparatuur/perslucht', RADIATION: 'Straling', FIRE: 'Werkzaamheden met brandgevaar' }, 'Fysieke veiligheid'),
    ...options({ HAZARDOUS_SUBSTANCES: 'Gevaarlijke stoffen', BIOLOGICAL_AGENTS: 'Biologische blootstelling', ATEX: 'Mogelijk ontplofbare atmosfeer', PHYSICAL_LOAD: 'Tillen/duwen/repetitief werk', NOISE: 'Lawaai', VIBRATION: 'Trillingen', CLIMATE: 'Hitte/kou' }, 'Blootstelling/belasting'),
    ...options({ PSA: 'Werkdruk of ongewenst gedrag', LONE_WORK: 'Alleenwerk', NIGHT_OR_SHIFT: 'Nacht-/ploegendienst of afwijkende tijden', YOUNG_WORKERS: 'Werk door jongeren onder 18', PREGNANCY_WORK_RISK: 'Werk dat extra aandacht vraagt bij zwangerschap/borstvoeding' }, 'Organisatie van werk'),
    ...options({ NONE_RECOGNIZED: 'Ik herken geen van deze situaties', UNKNOWN: 'Dat weet ik nog niet', OTHER: 'Er kunnen nog andere situaties spelen' }, 'Overige keuzes'),
  ] },
  { code: 'FI2-05', prompt: 'Waarover wilt u vooral inzicht krijgen?', help: 'Uw interesse bepaalt de volgorde van de onderwerpen, niet welke verplichtingen gelden.', multiple: true, exclusive: ['GENERAL', 'UNKNOWN'], options: options({ RIE: 'RI&E en plan van aanpak', PREVENTION: 'Preventiemedewerker', BHV: 'BHV', OCCUPATIONAL_HEALTH: 'Bedrijfsarts en basiscontract', PAGO: 'PAGO', INSTRUCTION: 'Voorlichting en veilig werken', PSA: 'Werkdruk en ongewenst gedrag', ACCIDENTS: 'Arbeidsongevallen', PARTICIPATION: 'Betrokkenheid van werknemers', OTHER_RISKS: "Andere arbeidsrisico's", GENERAL: 'Ik wil een algemeen overzicht', UNKNOWN: 'Dat weet ik nog niet' }) },
]

// Unknown codes, invalid values and contradictory exclusive choices are never positive evidence.
export function normalizeFreeIntakeV2(raw: Readonly<Record<string, unknown>>): IntakeAnswers {
  const answers: IntakeAnswers = {}
  for (const q of freeIntakeV2Questions) {
    const v = raw[q.code], allowed = new Set(q.options.map(o => o.value))
    if (q.multiple) {
      if (!Array.isArray(v) || !v.length || !v.every(x => typeof x === 'string' && allowed.has(x))) continue
      const unique = [...new Set(v as string[])].sort()
      if (unique.length > 1 && unique.some(x => q.exclusive?.includes(x))) continue
      answers[q.code] = unique
    } else if (typeof v === 'string' && allowed.has(v)) answers[q.code] = v
  }
  return answers
}

export function employeeScopeConflict(answers: IntakeAnswers) {
  const scope = answers['FI2-01'], count = answers['FI2-03']
  return (scope === 'EMPLOYEES' && count === 'ZERO') ||
    (['NONE', 'VOLUNTEERS_ONLY', 'OTHERS_UNDER_AUTHORITY'].includes(String(scope)) && ['ONE_TO_25', 'MORE_THAN_25'].includes(String(count)))
}

export function freeIntakeV2Error(raw: IntakeAnswers, code: string): string | null {
  if (!normalizeFreeIntakeV2(raw)[code]) return 'Kies een antwoord. Als u het niet weet, kunt u dat aangeven.'
  if ((code === 'FI2-01' || code === 'FI2-03') && employeeScopeConflict(raw)) return 'Uw personeelskeuze en het aantal werknemers spreken elkaar tegen. Controleer beide antwoorden; andere mensen onder uw leiding tellen hier niet als werknemers in dienst.'
  return null
}

export function toggleFreeIntakeV2(q: Question, current: string[], value: string): string[] {
  if (q.exclusive?.includes(value)) return current.includes(value) ? [] : [value]
  const rest = current.filter(x => !q.exclusive?.includes(x))
  return rest.includes(value) ? rest.filter(x => x !== value) : [...rest, value]
}

const signals: Partial<Record<ComplianceModuleCode, readonly string[]>> = {
  R01: ['MACHINES', 'WORK_EQUIPMENT'], R03: ['HAZARDOUS_SUBSTANCES'], R04: ['PHYSICAL_LOAD'], R05: ['DISPLAY_SCREEN', 'HOME'], R06: ['PSA'], R07: ['NOISE'], R08: ['VIBRATION'], R09: ['HEIGHT'], R10: ['YOUNG_WORKERS'], R11: ['PREGNANCY_WORK_RISK'], R12: ['BIOLOGICAL_AGENTS'], R13: ['LONE_WORK'], R14: ['NIGHT_OR_SHIFT'], R15: ['THIRD_PARTY_LOCATIONS'], R16: ['VEHICLES'], R17: ['CLIMATE'], R18: ['WORKPLACE_SETUP', 'DISPLAY_SCREEN', 'HOME'], R19: ['FIRE', 'ATEX'], R20: ['ELECTRICAL'], R21: ['RADIATION'], R22: ['PRESSURE'], R23: ['ATEX'],
}
const interests: Record<string, readonly ComplianceModuleCode[]> = { RIE: ['C01', 'C02'], PREVENTION: ['C03'], BHV: ['C05'], OCCUPATIONAL_HEALTH: ['C04', 'C07'], PAGO: ['C06'], INSTRUCTION: ['C08'], PSA: ['R06'], ACCIDENTS: ['C09'], PARTICIPATION: ['C10'] }

export function orientFreeIntakeV2(raw: IntakeAnswers) {
  const answers = normalizeFreeIntakeV2(raw)
  const risks = Array.isArray(answers['FI2-04']) ? answers['FI2-04'] : []
  const priorities = Array.isArray(answers['FI2-05']) ? answers['FI2-05'] : []
  const preferred = new Set(priorities.flatMap(x => interests[x] ?? []))
  const employer = answers['FI2-01'] === 'EMPLOYEES' && !employeeScopeConflict(answers)
  const modules = (Object.keys(complianceFreeIntakeModuleTitles) as ComplianceModuleCode[]).map(code => {
    const positive = code.startsWith('C') ? employer : !!signals[code]?.some(x => risks.includes(x))
    const multipleLocations = (code === 'C01' || code === 'C05') && risks.includes('MULTIPLE_LOCATIONS')
    return { code, title: complianceFreeIntakeModuleTitles[code], applicability: positive ? 'RELEVANT' as const : 'POSSIBLY_RELEVANT' as const,
      explanation: multipleLocations ? 'Neem de dekking en organisatie op meerdere locaties mee in uw verdere verkenning.' : positive ? 'Uw personeelskeuze of een herkende werksituatie geeft aanleiding dit onderwerp verder te verkennen.' : 'Uw antwoorden sluiten dit onderwerp niet uit. Bepaal nader of het voor uw situatie relevant is.',
    }
  }).sort((a, b) => Number(preferred.has(b.code) || (priorities.includes('OTHER_RISKS') && b.code.startsWith('R'))) - Number(preferred.has(a.code) || (priorities.includes('OTHER_RISKS') && a.code.startsWith('R'))) || a.code.localeCompare(b.code))
  return { ...FREE_INTAKE_V2, modules, relevant: modules.filter(m => m.applicability === 'RELEVANT').length, possiblyRelevant: modules.filter(m => m.applicability === 'POSSIBLY_RELEVANT').length }
}
