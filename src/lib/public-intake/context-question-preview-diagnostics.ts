import { createHash } from 'node:crypto'
import { isReliablePresentFact } from './context-goal-applicability'
import { applicabilitySupportCodes, questionEvidenceContract } from './context-question-evidence-contract'
import type { ContextQuestionFormulationInput } from './context-question-formulator'

const syntheticInputDigest = 'c4f5b271757e3cedeb42ac1fc4a5e690f40fb3be922bb07c686a76bd0239b286'
const branch = 'codex/ai-help-request-intake-v2'
// Temporary diagnostic vocabulary, never used for selection or verification.
// Unknown words are redacted, rather than logging arbitrary model/user text.
const safeWords = new Set(`sinds we drie maanden geleden naar een nieuw kantoor zijn verhuisd hebben meerdere medewerkers aan het einde van de middag last hoofdpijn droge ogen en vermoeidheid weten niet waar door komt kan iemand dit onderzoeken
is bekend of beschreven signalen verschillen tussen werkplekken zo ja welke opgevallen welke kenmerken werk werkomgeving kunnen belang uw onderzoeksvraag af bakenen
u uw er in op bij met om voor over onder zonder wel ook dan dat deze die dit als wat hoe wanneer wie waarom waardoor heeft wordt worden was waren zijn het ze hun hen per tijdens buiten binnen na voor sinds juist alleen al nog soms steeds vooral meer minder bepaalde verschillende dezelfde andere
klachten plekken ruimtes ruimten delen gebouw verdieping verdiepingen locatie locaties werkplek werkplekken kantooromgeving omgeving kantoorgebouw binnenklimaat binnenmilieu lucht ventilatie temperatuur verlichting luchtvochtigheid luchtkwaliteit tocht dag dagen tijd tijdstip tijdstippen moment momenten optreden ontstaan voorkomen verdwijnen veranderen veranderingen samenhangen samenhang oorzaak oorzaken mogelijk mogelijke vermoeden vermoedens onderzoeken onderzocht onderzoek vastgesteld bekend onbekend beschikbaar informatie gegevens inzicht medewerkers medewerker mensen betrokken betrokkenen iedereen aantal werkzaamheden activiteiten werkuren pauzes weekend thuis thuiswerken
merkt merken gemerkt valt vallen opvallen ziet zien gezien ervaart ervaren waargenomen verschillen verschil patroon patronen beschreven genoemde aangeven toelichten vertellen beschrijven kunt kunnen willen wilt zou zouden mag moet nodig relevant relevante omstandigheden factoren betrekking bijvoorbeeld zoals eventuele eventueel specifiek specifieke vraag vragen onderzoeksvraag afbakening afbakenen indruk aanwijzingen aanwijzing metingen meten gemeten resultaten resultaat gedaan verricht vergeleken vergelijking gecontroleerd controle vastgesteld preciezer nader graag kort iets verder hiervan hierbij daarbij daar hier elders plekken ruimte ruimtegebruik bezetting apparaten ramen schoonmaak geuren geur geluid geluiden veel weinig vaker even sterk sterker minder ernstig ernst`.split(/\s+/))

type Verdict = Readonly<{
  informationNeedPreserved: boolean
  oneDutchQuestion: boolean
  unsupportedPresuppositions: readonly string[]
  supportingFactCodes: readonly string[]
  evidenceQuotes: readonly string[]
}>

function safeQuestion(text: string): string {
  return text.replace(/[\p{L}\p{N}_@.:/+=-]+/gu, (word) =>
    safeWords.has(word.toLowerCase()) ? word : '[REDACTED]')
}

/** Preview synthetic-case observability only. Never changes the verifier result. */
export function tracePreviewQuestionVerification(input: ContextQuestionFormulationInput, question: string,
  verdict: Verdict | null): void {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== branch) return
  if (createHash('sha256').update(input.originalInput).digest('hex') !== syntheticInputDigest) return
  try {
    const known = input.facts.filter(isReliablePresentFact)
    const { applicabilityEvidence, targetAnswerSlots } = questionEvidenceContract(input.goal, input.facts)
    const codes = new Set(applicabilityEvidence.map((fact) => fact.code))
    const sources = [input.originalInput, ...known.filter((fact) => fact.status === 'USER_CONFIRMED')
      .flatMap((fact) => Array.isArray(fact.value) ? fact.value : [String(fact.value)])]
    const checks = verdict ? {
      informationNeedPreserved: verdict.informationNeedPreserved,
      oneDutchQuestion: verdict.oneDutchQuestion,
      noUnsupportedPresuppositions: verdict.unsupportedPresuppositions.length === 0,
      supportingFactCodesKnown: applicabilitySupportCodes(verdict.supportingFactCodes, targetAnswerSlots).every((code) => codes.has(code)),
      evidenceQuotesLiteral: verdict.evidenceQuotes.every((quote) => sources.some((source) => source.includes(quote))),
    } : null
    const safeCode = (code: string) => /^[A-Z][A-Z0-9_:]{0,119}$/.test(code) ? code : '[REDACTED]'
    const safeId = (id: string | undefined) => id && /^[a-f0-9-]{36}$/.test(id) ? id : null
    console.info(JSON.stringify({
      event: 'PREVIEW_SYNTHETIC_QUESTION_VERIFIER',
      selectedContextRuleId: safeId(input.goal.selectedContextRuleId), ruleVersion: input.goal.ruleVersion,
      goalCode: safeCode(input.goal.code), variantKey: safeCode(input.goal.variantKey ?? ''),
      targetAnswerSlots: [...targetAnswerSlots].map(safeCode),
      generatedQuestion: safeQuestion(question), questionTextRedacted: safeQuestion(question) !== question,
      verifiedCaseFacts: known.map((fact) => ({ code: safeCode(fact.code), status: fact.status })),
      hypotheses: input.facts.filter((fact) => fact.status === 'HYPOTHESIS').map((fact) => safeCode(fact.code)),
      supportingClaims: input.evidence.filter((item) => item.source === 'PUBLISHED_CLAIM').map((item) => safeId(item.knowledgeId)),
      checks,
      rejectedChecks: checks ? Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name) : ['VERIFICATION_NOT_AUTHORIZED'],
      presuppositionChecks: verdict?.unsupportedPresuppositions.map(safeCode),
      supportingFactChecks: verdict?.supportingFactCodes.map((code) => ({ code: safeCode(code), known: codes.has(code), targetAnswerSlot: targetAnswerSlots.has(code) })),
      quoteChecks: verdict?.evidenceQuotes.map((quote) => ({
        literal: sources.some((source) => source.includes(quote)),
        caseInsensitive: sources.some((source) => source.toLowerCase().includes(quote.toLowerCase())),
        // No arbitrary quotes or fact values enter the logs.
        quote: safeQuestion(quote),
      })),
    }))
  } catch {
    // Diagnostics must never affect generation, authorization, or verification.
  }
}
