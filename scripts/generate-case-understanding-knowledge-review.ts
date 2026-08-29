import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { parseCaseUnderstandingKnowledgeReview } from '../src/lib/knowledge/case-understanding-review-schema'

const root = process.cwd()
const inputPath = path.join(root, 'data/knowledge/review/case-understanding-10-scenario-review-v1.json')
const outputPath = path.join(root, 'docs/knowledge-review/case-understanding-10-scenario-review-v1.md')
const review = parseCaseUnderstandingKnowledgeReview(JSON.parse(await readFile(inputPath, 'utf8')))

const list = (values: readonly string[]) => values.length > 0 ? values.map((value) => `- ${value}`).join('\n') : '- Geen.'
const inline = (values: readonly string[]) => values.length > 0 ? values.map((value) => `\`${value}\``).join(', ') : 'Geen'
const sourceLocator = (locator: string) => locator.startsWith('https://') ? `[Open officiële bron](${locator})` : `\`${locator}\``
const decision = '**Menselijke beslissing:** [ ] APPROVE  [ ] CHANGE: ____________________  [ ] REJECT\n\n**Reviewer notes:** ________________________________________________'

const lines: string[] = [
  '# Case Understanding — definitief menselijk reviewpakket v2',
  '',
  '> Status: **PENDING_HUMAN_REVIEW**. Dit document bevat uitsluitend kandidaten. Niets hierin is inhoudelijk gevalideerd, goedgekeurd of gepubliceerd.',
  '',
  '## Reviewinstructie',
  '',
  'Beoordeel iedere kandidaatclaim en routingregel afzonderlijk. Kies `APPROVE`, `CHANGE` of `REJECT`. Goedkeuring in dit document publiceert niets; verwerking in de Knowledge Engine vereist een afzonderlijke gecontroleerde workset.',
  '',
  '## Bronnenaudit',
  '',
  '| Source ID | Titel | Authority | Publicatie/versie | Actualiteit | Scope | Scenario’s | Claims ondersteund | Claims NIET ondersteund | Bron | Review |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  ...review.sources.map((source) => `| \`${source.sourceId}\` | ${source.title} | ${source.authority} | ${source.publicationDate} | ${source.currentness} | ${source.scope} | ${source.applicableScenarios.join(', ') || '—'} | ${source.claimsSupported.join('; ') || 'Nog geen'} | ${source.claimsNotSupported.join('; ')} | ${sourceLocator(source.locator)} | ${source.reviewStatus} |`),
  '',
  '## Herbruikbare Context Goals',
  '',
  '| Code | Informatiebehoefte | Toepassen wanneer | Niet toepassen wanneer | Opgelost door feiten | Review |',
  '|---|---|---|---|---|---|',
  ...review.contextGoals.map((goal) => `| \`${goal.code}\` | ${goal.informationNeed} | ${goal.appliesWhen.join('; ')} | ${goal.doNotApplyWhen.join('; ')} | ${goal.resolvesWithFactCodes.join(', ')} | ${goal.reviewStatus} |`),
  '',
  '### Menselijke beslissing per Context Goal', '',
  ...review.contextGoals.flatMap((goal) => [`**${goal.code}**`, '', decision, '']),
  '## Kandidaatclaims',
  '',
]

for (const claim of review.candidateClaims) {
  lines.push(
    `### ${claim.candidateId}`,
    '',
    `- Scenario’s: ${claim.scenarioCoverage.join(', ')}`,
    `- Concept: \`${claim.conceptCode}\``,
    `- Kandidaatclaim: ${claim.proposedClaim}`,
    `- Type: ${claim.claimType}`,
    `- Bronnen: ${inline(claim.sourceIds)}`,
    `- Bronevidence: ${claim.sourceEvidence.join(' ')}`,
    `- Authority/actualiteit: ${claim.authorityStatus} / ${claim.currencyStatus}`,
    `- Expertise: ${inline(claim.expertiseRequirements)}`,
    `- Routingintentie: ${claim.routingIntent}`,
    '',
    '**Applicability**', '', list(claim.applicability), '',
    '**Exclusions / do-not-apply**', '', list(claim.exclusions), '',
    `**Context Goals:** ${inline(claim.contextGoals)}`,
    '', decision, '',
  )
}

lines.push('## Kandidaat-routingregels', '')
for (const rule of review.routingRules) {
  lines.push(
    `### ${rule.candidateId}`,
    '',
    `- Scenario’s: ${rule.scenarioCoverage.join(', ')}`,
    `- Routingintentie: ${rule.routingIntent}`,
    `- Primaire expertise: \`${rule.primaryExpertise}\` (${rule.primaryExpertiseKind})`,
    `- Secundaire disciplines: ${inline(rule.secondaryDisciplines)}`,
    `- Vereiste specialismen: ${inline(rule.requiredSpecialisms)}`,
    `- Multidisciplinair: ${rule.multidisciplinary}`,
    `- Conditionele expertise: ${rule.conditionalExpertise.length > 0 ? rule.conditionalExpertise.map((item) => `${item.discipline} indien ${item.when}`).join('; ') : 'Geen'}`,
    `- Ondersteunende claims: ${inline(rule.supportingClaimIds)}`,
    '', '**Toepassen wanneer**', '', list(rule.appliesWhen), '',
    '**Niet toepassen wanneer**', '', list(rule.doNotApplyWhen), '',
    decision, '',
  )
}

lines.push(
  '## Voorstel beheerd specialisme', '',
  `### ${review.specialismProposal.code} — ${review.specialismProposal.label}`, '',
  `- Type: ${review.specialismProposal.kind}`,
  `- Bovenliggende discipline: ${inline(review.specialismProposal.parentDisciplines)}`,
  `- Passende professionele achtergronden: ${review.specialismProposal.compatibleProfessionalBackgrounds.join('; ')}`,
  `- Aanbevolen model: ${review.specialismProposal.recommendedModel}`,
  `- Huidige beperking: ${review.specialismProposal.currentLimitation}`,
  `- Migratie-impact: ${review.specialismProposal.migrationImpact}`,
  `- Matchingimpact: ${review.specialismProposal.matchingImpact}`,
  `- Betekenis: ${review.specialismProposal.meaning}`,
  `- Reden: ${review.specialismProposal.rationale}`,
  '', '**Inclusies**', '', list(review.specialismProposal.inclusions), '',
  '**Exclusies**', '', list(review.specialismProposal.exclusions), '',
  '**Verwacht bewijs van professionals**', '', list(review.specialismProposal.evidenceExpected), '',
  decision, '',
  '## Scenarioreviewbladen', '',
)

for (const scenario of review.scenarios) {
  const claims = scenario.candidateClaimIds.map((id) => review.candidateClaims.find((claim) => claim.candidateId === id)!)
  const rules = scenario.routingRuleIds.map((id) => review.routingRules.find((rule) => rule.candidateId === id)!)
  const goalRationales = new Map(scenario.goalValueRationale.map((item) => [item.goalCode, item.rationale]))
  lines.push(
    `### Scenario ${scenario.number} — ${scenario.title}`, '',
    '**SCENARIO**', scenario.originalInput, '',
    '**A. Expliciete feiten uit de hulpvraag**', '', list(scenario.explicitFacts), '',
    '**B. Feiten die NIET mogen worden aangenomen**', '', list(scenario.prohibitedAssumptions), '',
    `**C. Relevante Knowledge Concepts:** ${inline(scenario.conceptCodes)}`, '',
    '**D–H. Kandidaatclaims, bronnen, authority, applicability en exclusions**', '',
    ...claims.flatMap((claim) => [
      `- **${claim.candidateId}** — ${claim.proposedClaim}`,
      `  - Bronnen: ${claim.sourceIds.join(', ')}`,
      `  - Authority/actualiteit: ${claim.authorityStatus} / ${claim.currencyStatus}`,
      `  - Toepassen: ${claim.applicability.join('; ')}`,
      `  - Niet toepassen: ${claim.exclusions.join('; ')}`,
    ]),
    '', '**I–K. Context Goals, informatiewaarde en reeds opgeloste doelen**', '',
    ...scenario.contextGoals.map((goal) => `- \`${goal}\` — ${goalRationales.get(goal) ?? 'Informatiewaarde moet door reviewer worden bevestigd.'}${scenario.goalsAlreadyResolvedByFacts.includes(goal) ? ' **Reeds opgelost door expliciete feiten.**' : ''}`),
    '', `**L. Primaire expertise:** \`${scenario.primaryExpertise}\``, '',
    `**M. Secundaire expertise:** ${inline(scenario.secondaryExpertise)}`, '',
    `**N. Vereiste specialismen:** ${inline(scenario.requiredSpecialisms)}`, '',
    `**O. Multidisciplinair:** ${scenario.multidisciplinary} — ${scenario.multidisciplinaryReason}`, '',
    `**Conditionele expertise:** ${scenario.conditionalExpertise.length > 0 ? scenario.conditionalExpertise.map((item) => `${item.discipline} indien ${item.when}`).join('; ') : 'Geen'}`, '',
    '**P. Mogelijke routingregels**', '',
    ...rules.map((rule) => `- \`${rule.candidateId}\` — ${rule.routingIntent}`),
    '', '**Q. Kennishiaten**', '', list(scenario.knowledgeGaps), '',
    '**Voorbeeldvragen voor menselijke review**', '',
    ...scenario.questionExamples.flatMap((example) => [
      `#### ${example.contextGoal}`,
      '',
      `- Type: \`${example.type}\``,
      `- Voorbeeldvraag: “${example.question}”`,
      `- Waarom deze vraag: ${example.whyThisQuestion}`,
      `- Welke beslissing verandert: ${example.whatDecisionItChanges}`,
      `- Onderdrukken wanneer: ${example.whatExistingFactWouldSuppressIt}`,
      '', decision, '',
    ]),
    '**R. HUMAN REVIEW DECISION**', '', decision, '',
  )
}

lines.push(
  '## Coverage-matrix', '',
  '| Scenario | Facts understood | Claims | Source confidence | Missing Context Goals | Primary expertise | Conditional expertise | Multidisciplinary | Remaining knowledge gaps | Human-review ready |',
  '|---:|---|---:|---|---|---|---|---|---|---|',
  ...review.scenarios.map((scenario) => {
    const claims = scenario.candidateClaimIds.map((id) => review.candidateClaims.find((claim) => claim.candidateId === id)!)
    const sourceBacked = claims.filter((claim) => claim.authorityStatus !== 'INSUFFICIENT').length
    const confidence = claims.every((claim) => claim.authorityStatus === 'AUTHORITATIVE_CANDIDATE')
      ? 'Hoog als kandidaat; review vereist'
      : sourceBacked === claims.length
        ? 'Gemengd maar brongedragen; review vereist'
        : 'Onvoldoende voor deelclaim; hiaat expliciet'
    const reviewReady = scenario.questionExamples.length === scenario.contextGoals.length && claims.every((claim) => claim.applicability.length > 0 && claim.exclusions.length > 0)
    return `| ${scenario.number} | ${scenario.explicitFacts.length} expliciete feiten; ${scenario.goalsAlreadyResolvedByFacts.length} goals satisfied | ${claims.length} | ${confidence} | ${scenario.contextGoals.join(', ') || 'Geen'} | ${scenario.primaryExpertise} | ${scenario.conditionalExpertise.map((item) => `${item.discipline}: ${item.when}`).join('; ') || 'Geen'} | ${scenario.multidisciplinary} | ${scenario.knowledgeGaps.join('; ') || 'Geen expliciet'} | ${reviewReady ? 'YES' : 'NO'} |`
  }),
  '',
  '## Publicatiegrens', '',
  '- Alle kandidaatclaims en routingregels staan op `PENDING_HUMAN_REVIEW`.',
  '- Er zijn geen Knowledge Claims gevalideerd of gepubliceerd.',
  '- Er zijn geen Routing Rules geactiveerd.',
  '- Het specialismevoorstel is niet aan de beheerde taxonomie toegevoegd.',
  '- De publieke intake-, vraagplanning-, Case Understanding- en matchingruntime zijn niet gewijzigd.',
  '- Production is niet benaderd of gewijzigd.',
)

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8')
console.log(`Reviewdocument gegenereerd: ${path.relative(root, outputPath)}`)
