import { createHash } from 'node:crypto'
import { complianceV2DefinitionSchema, type ComplianceV2Definition } from './compliance-v2'
import type { Condition as ComplianceCondition } from './compliance-v2-conditions'
import { F4_BINDING, f4Catalog, f4Help, f4ModuleTitles, f4Options, f4Visibility } from './compliance-f4-catalog'

type Source = ComplianceV2Definition['modules'][number]['rules'][number]['sources'][number]
export type F4SourceBindings = Record<string, Source[]>
// Stable definition identities, not invented Knowledge Engine source/claim identities.
function id(value: string) {
  const h = createHash('sha256').update(`NL_ARBO_GUIDE/2.1/${value}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const eq = (question: string, equals: string): ComplianceCondition => ({ question, equals })

/** Requires reviewed, versioned sources for EACH assessed question. Never publishes a framework. */
export function buildF4Definition(bindings: F4SourceBindings): ComplianceV2Definition {
  return complianceV2DefinitionSchema.parse({ ...F4_BINDING,
    title: 'Compliance-wijzer — uitgebreide basisbeoordeling',
    disclaimer: 'Indicatieve beoordeling op basis van uw zelfverklaringen. Antwoorden zijn geen gecontroleerde bewijsstukken. Dit is geen compliance-certificaat of garantie dat u aan alle verplichtingen voldoet.',
    modules: Object.entries(f4ModuleTitles).map(([code, title]) => {
      const catalog = f4Catalog.filter(q => q.module === code)
      const questions = catalog.map(q => ({ id: id(q.code), code: q.code, prompt: q.prompt,
        required: q.kind === 'LEGAL' || q.kind === 'RECOMMENDATION', inputType: 'SINGLE_SELECT',
        helpText: f4Help(q.code), ...(f4Visibility(q) ? { visibleWhen: f4Visibility(q) } : {}),
        options: Object.entries(f4Options(q.code)).map(([value, label]) => ({ value, label, exclusive: true })),
      }))
      const rules: ComplianceV2Definition['modules'][number]['rules'] = catalog.filter(q => q.kind === 'LEGAL' || q.kind === 'RECOMMENDATION').flatMap(q => {
        const sources = bindings[q.code]
        if (!sources?.length) throw new Error(`Ontbrekende beoordeelde bronbinding: ${q.code}`)
        const basis = q.kind === 'LEGAL' ? 'LEGAL_REQUIREMENT' : 'PRACTICAL_RECOMMENDATION'
        const variants = ['YES', 'PARTIAL', 'NO', ...(q.code === 'CW2-BHV-03' ? ['NO_SHARED_WORKPLACE'] : q.code === 'CW2-PSA-02' ? ['NONE_IDENTIFIED'] : [])]
        return variants.map((answer): ComplianceV2Definition['modules'][number]['rules'][number] => {
          const positive = !['NO', 'PARTIAL'].includes(answer)
          const conditions: ComplianceCondition[] = [eq('HASEMPLOYEES', 'YES'), eq(q.code, answer)]
          // A conditional assertion cannot establish that testing is required.
          // Recognition/40-hour exceptions stay unassessed until evidenced.
          if (q.code === 'RIETESTING' && !positive) conditions.push(eq('CW2-RIE-04', 'NO'), { any: [eq('EMPLOYEECOUNT', 'MORE_THAN_25'), eq('CW2-RIE-05', 'OTHER')] })
          if (answer === 'NONE_IDENTIFIED') conditions.push(eq('CW2-PSA-01', 'YES'))
          const ruleCode = `${q.code}-${answer}`
          return { id: id(ruleCode), code: ruleCode, condition: { all: conditions },
            applicability: 'RELEVANT', status: positive ? 'IN_ORDER' : basis === 'LEGAL_REQUIREMENT' ? 'ACTION_REQUIRED' : 'ATTENTION_REQUIRED',
            mode: 'FULL', basis, sources,
            explanation: `${q.prompt} — ${f4Options(q.code)[answer]}. ${positive ? 'Vastgelegd als zelfverklaring; de bewijsstukken zijn niet gecontroleerd.' : basis === 'LEGAL_REQUIREMENT' ? 'De beschreven maatregel ontbreekt of is nog niet volledig geregeld.' : 'Dit is een praktisch verbeterpunt.'}`,
            nextStep: positive ? 'Controleer periodiek of deze afspraak nog past bij het werk en de risico’s.' : `Bespreek en regel dit onderdeel: ${q.prompt}`,
          }
        })
      })
      rules.push({ id: id(`${code}-SCOPE-UNCERTAIN`), code: `${code}-SCOPE-UNCERTAIN`,
        condition: { all: [{ any: [eq('HASEMPLOYEES', 'NO'), eq('HASEMPLOYEES', 'OTHERS'), eq('HASEMPLOYEES', 'VOLUNTEERS'), eq('EMPLOYEECOUNT', 'ZERO')] }] },
        applicability: 'POSSIBLY_RELEVANT', status: 'NOT_ASSESSED', mode: 'SPECIALIST_REQUIRED', basis: 'LEGAL_REQUIREMENT',
        sources: rules.find(r => r.basis === 'LEGAL_REQUIREMENT')!.sources,
        explanation: 'De werkgeversstatus of personeelsomvang vraagt nadere verificatie. Er wordt geen algemene vrijstelling toegekend.',
        nextStep: 'Controleer wie onder uw gezag werkt en welke verplichtingen op uw situatie van toepassing zijn.',
      })
      return { code, title, questions, rules }
    }),
  })
}
