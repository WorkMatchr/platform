import { randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { normalizeKnowledgeSourceText } from './knowledge-extractor'

type DatabaseClient = ReturnType<typeof getPrisma>

export const BHV_CHECKLIST_CODE = 'BHV_MAATGEVENDE_FACTOREN'
export const BHV_PROCEDURE_CODE = 'BHV_SCENARIO_BEOORDELING'
export const AI10_CHECKSUM = 'a414107c8b11d0351311552e344fb0e1a95db171c7654c89fa5e083a1a60cae7'

export class KnowledgeBhvComponentError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'KnowledgeBhvComponentError'
  }
}

type EvidenceSelector = { pages: number[]; terms: string[]; rationale: string }
type ChecklistDefinition = { question: string; selector: EvidenceSelector }
type ProcedureDefinition = { title: string; instruction: string; selector: EvidenceSelector }

const checklist: ChecklistDefinition[] = [
  { question: 'Welke relevante gevaren en restrisico’s volgen uit de RI&E?', selector: { pages: [9], terms: ['gevaren', 'risico-inventarisatie'], rationale: 'AI-10 noemt aanwezige gevaren en de RI&E als maatgevende basis.' } },
  { question: 'Wat zijn de aard, grootte en ligging van het bedrijf of de inrichting?', selector: { pages: [9], terms: ['aard', 'grootte', 'ligging'], rationale: 'AI-10 benoemt aard, grootte en ligging als maatgevende factor.' } },
  { question: 'Hoeveel werknemers en andere personen zijn wanneer aanwezig?', selector: { pages: [9], terms: ['aantal aanwezige werknemers', 'tijdstippen'], rationale: 'AI-10 verlangt zicht op aantallen aanwezigen en aanwezigheidstijden.' } },
  { question: 'Welke personen kunnen zich bij een incident niet zelfstandig in veiligheid brengen?', selector: { pages: [9], terms: ['niet zelfstandig', 'veiligheid'], rationale: 'AI-10 benoemt niet-zelfredzame aanwezigen als maatgevende factor.' } },
  { question: 'Wat zijn de opkomsttijd en mogelijkheden van brandweer en andere hulpverleningsorganisaties?', selector: { pages: [9], terms: ['externe hulpdienst', 'aanrijtijd'], rationale: 'AI-10 koppelt de voorpostfunctie aan opkomsttijd en mogelijkheden van externe hulp.' } },
  { question: 'Welke werknemers van andere organisaties kunnen risico lopen en welke samenwerking is nodig?', selector: { pages: [10], terms: ['samenwerking verplicht', 'schriftelijk'], rationale: 'AI-10 verlangt afstemming bij risico’s voor werknemers van andere bedrijven.' } },
  { question: 'Welke externe deskundigen of diensten worden ingeschakeld en welke afspraken gelden?', selector: { pages: [10], terms: ['inschakeling van externe deskundigen'], rationale: 'AI-10 benoemt externe deskundigen en schriftelijke afspraken.' } },
  { question: 'Welke technische voorzieningen, alarmering en middelen zijn relevant voor de scenario’s?', selector: { pages: [14], terms: ['plattegronden van het bedrijf'], rationale: 'AI-10 koppelt technische voorzieningen en middelen aan het BHV-plan.' } },
  { question: 'Welke bezoekers, derden of wisselende bezetting moeten in de beoordeling worden meegenomen?', selector: { pages: [9], terms: ['bezoekers', 'andere aanwezigen', 'toename'], rationale: 'AI-10 verlangt rekening te houden met bezoekers, derden en voorspelbare bezettingswisselingen.' } },
]

const procedure: ProcedureDefinition[] = [
  { title: 'RI&E en restrisico’s vaststellen', instruction: 'Neem uitsluitend relevante gevaren en restrisico’s uit de RI&E als uitgangspunt.', selector: checklist[0].selector },
  { title: 'Maatgevende factoren inventariseren', instruction: 'Breng de bronondersteunde maatgevende factoren met de checklist in kaart.', selector: { pages: [9], terms: ['maatgevende factoren', 'vorm en omvang'], rationale: 'AI-10 introduceert maatgevende factoren als basis voor vorm en omvang.' } },
  { title: 'Geloofwaardige incidentscenario’s uitwerken', instruction: 'Beschrijf incidenten en calamiteiten die naar redelijkheid in de organisatie kunnen voorkomen.', selector: { pages: [9], terms: ['incidentscenario', 'naar alle redelijkheid'], rationale: 'AI-10 definieert incidentscenario’s als redelijkerwijs mogelijke incidenten en calamiteiten.' } },
  { title: 'Acties, taken en gelijktijdige inzet bepalen', instruction: 'Bepaal per scenario welke BHV-acties en taken gelijktijdig nodig kunnen zijn, zonder een vaste aantalsnorm toe te passen.', selector: { pages: [9, 10], terms: ['incidentscenario', 'tegelijkertijd nodig'], rationale: 'AI-10 verbindt scenario’s met gelijktijdig benodigde BHV-inzet en taken.' } },
  { title: 'Beschikbaarheid en vervanging borgen', instruction: 'Borg per noodzakelijke taak de aanwezigheid en vervanging bij afwezigheid, zonder historische vaste aantallen over te nemen.', selector: { pages: [11], terms: ['vervanging nodig'], rationale: 'AI-10 verlangt vervanging wanneer aangewezen inzet niet beschikbaar is.' } },
  { title: 'BHV-plan en procedures vastleggen', instruction: 'Leg scenario’s, taakverdeling, verantwoordelijkheden, bereikbaarheid en relevante procedures vast in het BHV-plan.', selector: { pages: [14], terms: ['van belang', 'vast te leggen'], rationale: 'AI-10 beschrijft de inhoudelijke vastlegging in het BHV-plan.' } },
  { title: 'Opleiding op risico’s en scenario’s afstemmen', instruction: 'Stem de opleiding af op de risico’s uit de RI&E en de uitgewerkte incidentscenario’s.', selector: { pages: [17], terms: ['opleiding', 'past bij de risico', 'incidentscenario'], rationale: 'AI-10 verbindt opleiding aan RI&E-risico’s en incidentscenario’s.' } },
  { title: 'Scenario’s oefenen', instruction: 'Gebruik passende incidentscenario’s als basis voor realistische oefeningen.', selector: { pages: [19], terms: ['incidentscenario', 'oefeningen'], rationale: 'AI-10 benoemt incidentscenario’s als basis voor oefenscenario’s.' } },
  { title: 'Evalueren en bijstellen', instruction: 'Evalueer iedere oefening met betrokkenen en leg vast wat moet worden verbeterd.', selector: { pages: [20], terms: ['na iedere oefening', 'evaluatie', 'beter moet'], rationale: 'AI-10 verlangt nabespreking en vastlegging van verbeterpunten.' } },
]

function validateSafeContent() {
  const content = JSON.stringify({ checklist, procedure }).toLowerCase()
  for (const forbidden of ['1-op-50', '1 op 50', 'zestien uur', 'acht uur per twee jaar', 'een keer per jaar']) {
    if (content.includes(forbidden)) throw new KnowledgeBhvComponentError('BHV_HISTORICAL_RULE_INCLUDED', 'Een historische vaste norm is uitvoerbaar gemodelleerd.')
  }
}

async function resolveEvidence(tx: Prisma.TransactionClient, extractionRunId: string, selector: EvidenceSelector) {
  const candidates = await tx.knowledgeSourceBlock.findMany({
    where: { extractionRunId, sourcePage: { pageNumber: { in: selector.pages } }, blockType: { not: 'HEADER_FOOTER' } },
    select: { id: true, exactText: true, sourcePage: { select: { pageNumber: true } } },
  })
  const matches = candidates.filter((block) => {
    const normalized = normalizeKnowledgeSourceText(block.exactText)
    return selector.terms.every((term) => normalized.includes(normalizeKnowledgeSourceText(term)))
  })
  if (matches.length !== 1) throw new KnowledgeBhvComponentError('BHV_EVIDENCE_NOT_UNIQUE', `Bewijs is niet exact één keer gevonden voor pagina ${selector.pages.join('/')} en termen ${selector.terms.join(', ')} (${matches.length} matches).`)
  return matches[0]
}

async function loadAi10Context(tx: Prisma.TransactionClient) {
  const versions = await tx.knowledgeSourceVersion.findMany({
    where: { checksum: AI10_CHECKSUM, source: { code: 'AI-10', temporalStatus: 'HISTORICAL' } },
    select: { id: true, source: { select: { id: true } }, extractionRuns: { where: { status: 'COMPLETED' }, select: { id: true, pageCount: true, _count: { select: { pages: true } } } }, citations: { select: { claim: { select: { topicId: true } } } } },
  })
  if (versions.length !== 1 || versions[0].extractionRuns.length !== 1) throw new KnowledgeBhvComponentError('AI10_CONTEXT_INVALID', 'De unieke voltooide AI-10-bronversie ontbreekt.')
  const version = versions[0]
  const run = version.extractionRuns[0]
  const blockCount = await tx.knowledgeSourceBlock.count({ where: { extractionRunId: run.id } })
  if (run.pageCount !== 33 || run._count.pages !== 33 || blockCount !== 1041) throw new KnowledgeBhvComponentError('AI10_EXTRACTION_INVALID', 'De AI-10-extractie wijkt af van 33 pagina’s en 1.041 blokken.')
  const topics = [...new Set(version.citations.map((citation) => citation.claim.topicId))]
  if (topics.length !== 1) throw new KnowledgeBhvComponentError('AI10_TOPIC_INVALID', 'AI-10 heeft geen unieke gecontroleerde topicrelatie.')
  return { sourceId: version.source.id, sourceVersionId: version.id, extractionRunId: run.id, topicId: topics[0] }
}

async function loadStored(tx: Prisma.TransactionClient) {
  const [storedChecklist, storedProcedure] = await Promise.all([
    tx.knowledgeChecklist.findUnique({ where: { code_version: { code: BHV_CHECKLIST_CODE, version: 1 } }, include: { items: { orderBy: { order: 'asc' }, include: { evidence: { orderBy: { sequence: 'asc' } } } } } }),
    tx.knowledgeProcedure.findUnique({ where: { code_version: { code: BHV_PROCEDURE_CODE, version: 1 } }, include: { steps: { orderBy: { order: 'asc' }, include: { evidence: { orderBy: { sequence: 'asc' } } } } } }),
  ])
  return { checklist: storedChecklist, procedure: storedProcedure }
}

function assertStoredShape(stored: Awaited<ReturnType<typeof loadStored>>) {
  if (!stored.checklist || !stored.procedure) throw new KnowledgeBhvComponentError('BHV_COMPONENT_PARTIAL_CONFLICT', 'Slechts één van de twee BHV-componenten bestaat.')
  if (stored.checklist.temporalStatus !== 'HISTORICAL' || stored.checklist.validationStatus !== 'UNVALIDATED' || stored.checklist.publicationStatus !== 'DRAFT' || stored.checklist.audience !== 'INTERNAL_REVIEWER') throw new KnowledgeBhvComponentError('BHV_CHECKLIST_STATUS_CONFLICT', 'De bestaande checklist heeft een onveilige status.')
  if (stored.procedure.temporalStatus !== 'HISTORICAL' || stored.procedure.validationStatus !== 'UNVALIDATED' || stored.procedure.publicationStatus !== 'DRAFT' || stored.procedure.audience !== 'INTERNAL_REVIEWER') throw new KnowledgeBhvComponentError('BHV_PROCEDURE_STATUS_CONFLICT', 'De bestaande procedure heeft een onveilige status.')
  if (stored.checklist.items.length !== checklist.length || stored.procedure.steps.length !== procedure.length || stored.checklist.items.some((item) => item.evidence.length === 0) || stored.procedure.steps.some((step) => step.evidence.length === 0)) throw new KnowledgeBhvComponentError('BHV_COMPONENT_CONTENT_CONFLICT', 'De bestaande componentinhoud of evidence is onvolledig.')
}

export async function preflightBhvKnowledgeComponents(database: DatabaseClient = getPrisma()) {
  return database.$transaction(async (tx) => {
    validateSafeContent()
    const context = await loadAi10Context(tx)
    const selectors = [...checklist.map((item) => item.selector), ...procedure.map((step) => step.selector)]
    const evidence = await Promise.all(selectors.map((selector) => resolveEvidence(tx, context.extractionRunId, selector)))
    const stored = await loadStored(tx)
    if (Boolean(stored.checklist) !== Boolean(stored.procedure)) throw new KnowledgeBhvComponentError('BHV_COMPONENT_PARTIAL_CONFLICT', 'Slechts één van de twee BHV-componenten bestaat.')
    if (stored.checklist) assertStoredShape(stored)
    return { ...context, sourceBlockIds: [...new Set(evidence.map((item) => item.id))], sourceExists: Boolean(stored.checklist), checklistItems: checklist.length, procedureSteps: procedure.length }
  }, { isolationLevel: 'Serializable' })
}

export async function storeBhvKnowledgeComponents(database: DatabaseClient = getPrisma()) {
  validateSafeContent()
  return database.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext('BHV_MAATGEVENDE_SCENARIOS_COMPONENTS'))`)
    const context = await loadAi10Context(tx)
    const existing = await loadStored(tx)
    if (existing.checklist || existing.procedure) {
      assertStoredShape(existing)
      return { created: false, checklistId: existing.checklist!.id, procedureId: existing.procedure!.id }
    }
    const checklistRecord = await tx.knowledgeChecklist.create({ data: { id: randomUUID(), code: BHV_CHECKLIST_CODE, version: 1, title: 'Maatgevende factoren voor de BHV-organisatie', description: 'Historische AI-10-checklist voor de context die een scenario-gebaseerde BHV-beoordeling nodig heeft.', topicId: context.topicId, audience: 'INTERNAL_REVIEWER', scoringMethod: 'NONE', temporalStatus: 'HISTORICAL', validationStatus: 'UNVALIDATED', publicationStatus: 'DRAFT' } })
    for (const [index, definition] of checklist.entries()) {
      const block = await resolveEvidence(tx, context.extractionRunId, definition.selector)
      const itemId = randomUUID()
      await tx.knowledgeChecklistItem.create({ data: { id: itemId, checklistId: checklistRecord.id, order: index + 1, question: definition.question, answerType: 'TEXT', required: true } })
      await tx.knowledgeStructuredComponentEvidence.create({ data: { checklistItemId: itemId, sourceBlockId: block.id, evidenceRole: 'INPUT', sequence: 1, rationale: definition.selector.rationale } })
    }
    const procedureRecord = await tx.knowledgeProcedure.create({ data: { id: randomUUID(), code: BHV_PROCEDURE_CODE, version: 1, title: 'Scenario-gebaseerde BHV-beoordelingsketen', description: 'Historische AI-10-procedure van RI&E en maatgevende factoren naar scenario’s, plan, opleiding, oefenen en bijstellen.', topicId: context.topicId, audience: 'INTERNAL_REVIEWER', prerequisites: { required: [BHV_CHECKLIST_CODE], excludes: ['fixedHeadcount', 'historicalOneToFifty', 'fixedCourseHours', 'fixedExerciseFrequency'] }, temporalStatus: 'HISTORICAL', validationStatus: 'UNVALIDATED', publicationStatus: 'DRAFT' } })
    for (const [index, definition] of procedure.entries()) {
      const block = await resolveEvidence(tx, context.extractionRunId, definition.selector)
      const stepId = randomUUID()
      await tx.knowledgeProcedureStep.create({ data: { id: stepId, procedureId: procedureRecord.id, order: index + 1, title: definition.title, instruction: definition.instruction } })
      await tx.knowledgeStructuredComponentEvidence.create({ data: { procedureStepId: stepId, sourceBlockId: block.id, evidenceRole: 'STEP', sequence: 1, rationale: definition.selector.rationale } })
    }
    return { created: true, checklistId: checklistRecord.id, procedureId: procedureRecord.id }
  }, { isolationLevel: 'Serializable' })
}

export async function getBhvKnowledgeComponents(database: DatabaseClient = getPrisma()) {
  const stored = await database.$transaction((tx) => loadStored(tx), { isolationLevel: 'Serializable' })
  if (stored.checklist || stored.procedure) assertStoredShape(stored)
  return stored
}
