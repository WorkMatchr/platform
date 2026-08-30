import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { getPrisma } from '../src/lib/prisma'
import { parseCaseUnderstandingKnowledgeReview } from '../src/lib/knowledge/case-understanding-review-schema'
import { INTAKE_ROUTING_KNOWLEDGE_SCOPE } from '../src/lib/public-intake/case-understanding'

const REVIEW_PATH = new URL('../data/knowledge/review/case-understanding-10-scenario-review-v1.json', import.meta.url)
const DECISION_PATH = new URL('../data/knowledge/review/case-understanding-10-scenario-review-v2-decision.json', import.meta.url)
const PREVIEW_ENVIRONMENTS = new Set(['preview', 'development'])

function failClosedPreview() {
  const environment = process.env.VERCEL_ENV?.trim().toLowerCase()
    ?? process.env.KNOWLEDGE_PUBLICATION_ENVIRONMENT?.trim().toLowerCase()
  if (!environment || !PREVIEW_ENVIRONMENTS.has(environment)) {
    throw new Error('CASE_UNDERSTANDING_PUBLICATION_PREVIEW_ONLY')
  }
  const url = new URL(process.env.DATABASE_URL ?? '')
  const expectedPreviewProjectId = process.env.KNOWLEDGE_PUBLICATION_EXPECTED_NEON_PROJECT_ID?.trim()
  const actualProjectId = process.env.NEON_PROJECT_ID?.trim()
  if (!expectedPreviewProjectId || !actualProjectId || actualProjectId !== expectedPreviewProjectId) {
    throw new Error('PREVIEW_DATABASE_PROJECT_IDENTITY_MISMATCH')
  }
  const configuredHost = (process.env.PGHOST ?? process.env.POSTGRES_HOST)?.trim().toLowerCase()
  if (!configuredHost || url.hostname.toLowerCase() !== configuredHost) {
    throw new Error('PREVIEW_DATABASE_HOST_IDENTITY_MISMATCH')
  }
}

function topicDomain(conceptCode: string) {
  if (/MACHINE/.test(conceptCode)) return 'MACHINERY' as const
  if (/EXPOSURE|WELD|PROCESS|CONTRACTOR|SIMULTANEOUS/.test(conceptCode)) return 'HAZARDOUS_SUBSTANCES' as const
  if (/PHYSICAL/.test(conceptCode)) return 'ERGONOMICS' as const
  if (/BHV/.test(conceptCode)) return 'EMERGENCY_RESPONSE' as const
  if (/MEDICAL|WORK_ABILITY/.test(conceptCode)) return 'OCCUPATIONAL_HEALTH' as const
  return 'POLICY_AND_MANAGEMENT' as const
}

function sourceType(documentType: string) {
  if (documentType === 'LAW') return 'LEGISLATION' as const
  if (documentType.includes('ENFORCEMENT') || documentType.includes('INSPECTION')) return 'INSPECTORATE_GUIDANCE' as const
  if (documentType === 'ARBOCATALOGUE') return 'ARBOCATALOGUE' as const
  if (documentType === 'RESEARCH') return 'RESEARCH' as const
  if (documentType.includes('PROFESSIONAL')) return 'PROFESSIONAL_GUIDANCE' as const
  if (documentType.includes('WORKMATCHR')) return 'INTERNAL_EXPERTISE' as const
  return 'OTHER' as const
}

function authorityLevel(authority: string) {
  if (authority === 'OFFICIAL_LEGISLATION') return 'PRIMARY_LEGAL' as const
  if (authority.includes('OFFICIAL')) return 'OFFICIAL_GUIDANCE' as const
  if (authority === 'RESEARCH') return 'RESEARCH' as const
  if (authority.includes('PROFESSIONAL')) return 'PROFESSIONAL_GUIDANCE' as const
  if (authority.includes('WORKMATCHR')) return 'INTERNAL' as const
  return 'UNKNOWN' as const
}

function parseDate(value: string | null) {
  const match = value?.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  return match ? new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`) : null
}

function category(goal: string) {
  if (/MEASURE|ASSESSMENT|CONTROL|COORDINATION|RESPONSE/.test(goal)) return 'EXISTING_CONTROL' as const
  if (/EXPOSURE|PROCESS_INTEGRITY/.test(goal)) return 'EXPOSURE' as const
  if (/LOCATION|OCCUPANCY|AFFECTED|CONTRACTOR|SIMULTANEOUS|LIVE_PROCESS/.test(goal)) return 'SCOPE' as const
  if (/TIME|DURATION|SHIFT/.test(goal)) return 'WORK' as const
  return 'WORK' as const
}

async function main() {
  failClosedPreview()
  const review = parseCaseUnderstandingKnowledgeReview(JSON.parse(await readFile(REVIEW_PATH, 'utf8')))
  const decision = JSON.parse(await readFile(DECISION_PATH, 'utf8')) as {
    packageId?: string
    usageScope?: string
    scenarioDecisions?: Array<{ number: number; decision: string }>
    routingAmendments?: Array<{
      routingRuleId: string
      conditionalExpertise: Array<{ code: string; when: string }>
      removeFromMatchingCodes: string[]
    }>
  }
  if (
    decision.packageId !== review.packageId
    || decision.usageScope !== INTAKE_ROUTING_KNOWLEDGE_SCOPE
    || decision.scenarioDecisions?.length !== 10
    || decision.scenarioDecisions.some((item) => !item.decision.startsWith('APPROVED'))
  ) throw new Error('HUMAN_REVIEW_DECISION_NOT_APPROVED')
  const prisma = getPrisma()
  const actor = await prisma.user.findFirst({
    where: { platformRole: 'ADMIN', status: 'ACTIVE' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!actor) throw new Error('KNOWLEDGE_REVIEW_ACTOR_UNAVAILABLE')

  const result = await prisma.$transaction(async (transaction) => {
    const sourceVersionIds = new Map<string, string>()
    for (const source of review.sources) {
      if (source.governanceStatus === 'INSUFFICIENTLY_TRACEABLE') continue
      const locatorIsUrl = /^https:\/\//.test(source.locator)
      const record = await transaction.knowledgeSource.upsert({
        where: { code: `CASE-${source.sourceId}`.slice(0, 80) },
        create: {
          sourceType: sourceType(source.documentType),
          sourceFormat: source.locator.endsWith('.pdf') ? 'PDF' : 'HTML',
          code: `CASE-${source.sourceId}`.slice(0, 80),
          title: source.title,
          publisher: source.authority.replaceAll('_', ' '),
          publicationDate: parseDate(source.dateOrVersion),
          sourceModifiedDate: parseDate(source.publicationDate),
          edition: source.dateOrVersion,
          applicabilityScope: source.scope,
          metadataStatus: 'COMPLETE',
          sourceUrl: locatorIsUrl ? source.locator : null,
          localReference: locatorIsUrl ? null : `manifest:${source.locator}`.slice(0, 200),
          copyrightClassification: locatorIsUrl ? 'PUBLIC_DOMAIN' : 'RESTRICTED_REFERENCE_ONLY',
          authorityLevel: authorityLevel(source.authority),
          temporalStatus: source.currentness === 'HISTORICAL' ? 'HISTORICAL' : 'CURRENT',
          sourceFamily: source.sourceId.slice(0, 120),
          authorityStatus: source.authority.includes('OFFICIAL') ? 'OFFICIAL_GUIDANCE' : 'PROFESSIONAL_REFERENCE',
          independenceGroup: source.sourceId.slice(0, 120),
          isPrimarySource: source.authority === 'OFFICIAL_LEGISLATION',
          notes: `Menselijk beoordeeld voor ${INTAKE_ROUTING_KNOWLEDGE_SCOPE}; niet voor autonoom advies.`,
        },
        update: {},
      })
      const version = await transaction.knowledgeSourceVersion.upsert({
        where: { sourceId_versionLabel_importRevision: { sourceId: record.id, versionLabel: source.dateOrVersion ?? 'review-v2', importRevision: 1 } },
        create: {
          sourceId: record.id,
          versionLabel: source.dateOrVersion ?? 'review-v2',
          publicationDate: parseDate(source.dateOrVersion),
          extractionStatus: 'READY',
          reviewStatus: 'REVIEWED',
          importedAt: new Date(),
        },
        update: {},
      })
      sourceVersionIds.set(source.sourceId, version.id)
    }

    const claimIds = new Map<string, string>()
    for (const candidate of review.candidateClaims) {
      const usableSourceIds = candidate.sourceIds.filter((id) => sourceVersionIds.has(id))
      if (usableSourceIds.length === 0) throw new Error(`NO_CONTROLLED_SOURCE:${candidate.candidateId}`)
      const topic = await transaction.knowledgeTopic.upsert({
        where: { slug: `intake-routing-${candidate.conceptCode.toLowerCase().replaceAll('_', '-')}` },
        create: {
          slug: `intake-routing-${candidate.conceptCode.toLowerCase().replaceAll('_', '-')}`,
          title: candidate.conceptCode.replaceAll('_', ' '),
          description: `Gecontroleerde context voor intake-routing; geen autonoom advies.`,
          domain: topicDomain(candidate.conceptCode),
          status: 'ACTIVE',
        },
        update: {},
      })
      const claim = await transaction.knowledgeClaim.upsert({
        where: { externalKey: `CASE-${candidate.candidateId}` },
        create: {
          externalKey: `CASE-${candidate.candidateId}`,
          topicId: topic.id,
          claimType: candidate.claimType as never,
          statement: candidate.proposedClaim,
          normalizedStatement: candidate.proposedClaim.toLowerCase(),
          applicability: `${candidate.applicability.join('; ')} Exclusions: ${candidate.exclusions.join('; ')}`.slice(0, 1000),
          temporalStatus: 'CURRENT',
          validationStatus: 'VALIDATED',
          publicationStatus: 'PUBLISHED',
          confidenceLevel: 'HIGH',
          accessTier: 'PUBLIC_BASIC',
          usageScopes: [INTAKE_ROUTING_KNOWLEDGE_SCOPE],
          copyrightCheckPassed: true,
          controlRisk: 'HIGH',
          sourceControlStatus: 'CONTROL_COMPLETE',
          lastSourceCheckedAt: new Date(),
          createdByActor: 'HUMAN_KNOWLEDGE_REVIEW_V2',
          reviewedByUserId: actor.id,
          reviewedAt: new Date(),
        },
        update: {},
      })
      claimIds.set(candidate.candidateId, claim.id)
      for (const sourceId of usableSourceIds) {
        const versionId = sourceVersionIds.get(sourceId)!
        const excerpt = candidate.sourceEvidence.find((item) => item.length > 0)?.slice(0, 500) ?? candidate.proposedClaim.slice(0, 500)
        const fragment = await transaction.knowledgeFragment.upsert({
          where: { externalKey: `CASE-${candidate.candidateId}-${sourceId}`.slice(0, 160) },
          create: {
            externalKey: `CASE-${candidate.candidateId}-${sourceId}`.slice(0, 160),
            sourceVersionId: versionId,
            sectionPath: 'Human Knowledge Review v2',
            fragmentType: 'HUMAN_REVIEWED_CONTEXT',
            internalExcerpt: excerpt,
            excerptHash: createHash('sha256').update(excerpt).digest('hex'),
            extractionMethod: 'HUMAN_KNOWLEDGE_REVIEW_V2',
            requiresReview: false,
          },
          update: {},
        })
        await transaction.knowledgeCitation.upsert({
          where: { claimId_sourceVersionId_fragmentId_supportType: { claimId: claim.id, sourceVersionId: versionId, fragmentId: fragment.id, supportType: 'DIRECT_SUPPORT' } },
          create: { claimId: claim.id, sourceVersionId: versionId, fragmentId: fragment.id, supportType: 'DIRECT_SUPPORT', citationNote: `Alleen voor ${INTAKE_ROUTING_KNOWLEDGE_SCOPE}.` },
          update: {},
        })
      }
      const existingValidation = await transaction.knowledgeValidation.findFirst({ where: { claimId: claim.id, status: 'VALIDATED' } })
      if (!existingValidation) await transaction.knowledgeValidation.create({
        data: {
          claimId: claim.id,
          validationMethod: 'HUMAN_EXPERT_REVIEW',
          status: 'VALIDATED',
          validatorType: 'HUMAN',
          validatorUserId: actor.id,
          rationale: `Goedgekeurd voor de beperkte scope ${INTAKE_ROUTING_KNOWLEDGE_SCOPE}; expliciet uitgesloten voor autonoom juridisch, medisch, compliance- of veiligheidsadvies.`,
          validatedAt: new Date(),
        },
      })
    }

    let goalRuleCount = 0
    // Supersede the old cross-domain aggregate rules without mutating their
    // immutable history. The latest generic rule becomes non-askable; the
    // reviewed domain variants below carry their own wording and provenance.
    for (const goal of review.contextGoals) {
      await transaction.knowledgeRule.upsert({
        where: { code_ruleVersion: { code: `CASE_GOAL_${goal.code}`.slice(0, 120), ruleVersion: 2 } },
        create: {
          code: `CASE_GOAL_${goal.code}`.slice(0, 120),
          title: goal.informationNeed.slice(0, 240),
          description: `Declaratief Context Goal voor ${INTAKE_ROUTING_KNOWLEDGE_SCOPE}.`,
          ruleType: 'ROUTING_RULE',
          ruleVersion: 2,
          inputSchema: { scope: INTAKE_ROUTING_KNOWLEDGE_SCOPE },
          expression: { appliesWhen: goal.appliesWhen, exclusions: goal.doNotApplyWhen },
          outputSchema: {
            kind: 'CONTEXT_GOAL_DEFINITION', scope: INTAKE_ROUTING_KNOWLEDGE_SCOPE,
            code: goal.code, purpose: goal.informationNeed,
            appliesWhen: goal.appliesWhen, exclusions: goal.doNotApplyWhen,
            satisfiesFactCodes: goal.resolvesWithFactCodes,
            askable: false,
          },
          validationStatus: 'VALIDATED', publicationStatus: 'PUBLISHED', accessTier: 'PUBLIC_BASIC',
          usageScopes: [INTAKE_ROUTING_KNOWLEDGE_SCOPE],
        },
        update: {},
      })
      goalRuleCount += 1
    }
    for (const scenario of review.scenarios) {
      for (const example of scenario.questionExamples) {
        const goal = review.contextGoals.find((item) => item.code === example.contextGoal)!
        const scenarioClaims = review.candidateClaims.filter((claim) =>
          scenario.candidateClaimIds.includes(claim.candidateId) && claim.contextGoals.includes(goal.code))
        const candidates = scenarioClaims.length > 0 ? scenarioClaims : review.candidateClaims.filter((claim) =>
          scenario.candidateClaimIds.includes(claim.candidateId))
        const supportIds = [...new Set(candidates.map((claim) => claimIds.get(claim.candidateId)).filter((id): id is string => Boolean(id)))]
        if (supportIds.length === 0) continue
        const variantCode = `CASE_GOAL_${goal.code}_S${scenario.number}`.slice(0, 120)
        const variantKey = `CASE:S${scenario.number}:${goal.code}`
        await transaction.knowledgeRule.upsert({
          where: { code_ruleVersion: { code: variantCode, ruleVersion: 1 } },
          create: {
            code: variantCode, title: goal.informationNeed.slice(0, 240),
            description: `Domeinvariant met afzonderlijke provenance voor ${INTAKE_ROUTING_KNOWLEDGE_SCOPE}.`,
            ruleType: 'ROUTING_RULE', ruleVersion: 1,
            inputSchema: { scope: INTAKE_ROUTING_KNOWLEDGE_SCOPE },
            expression: { appliesWhen: goal.appliesWhen, exclusions: goal.doNotApplyWhen },
            outputSchema: {
              kind: 'CONTEXT_GOAL', scope: INTAKE_ROUTING_KNOWLEDGE_SCOPE,
              code: goal.code, variantKey,
              questionKey: `context_s${scenario.number}_${goal.code.toLowerCase()}`.slice(0, 100),
              purpose: goal.informationNeed, text: example.question, answerType: 'TEXT', options: [], category: category(goal.code),
              relevantConceptCodes: [...new Set([
                ...scenario.conceptCodes,
                scenario.primaryExpertise,
                ...scenario.requiredSpecialisms,
                ...candidates.map((claim) => claim.conceptCode),
              ])],
              // A broad extracted fact cannot prove that this exact information
              // need is complete. Only an answer to this variant resolves it.
              satisfiesFactCodes: [`CONTEXT_ANSWERED_S${scenario.number}_${goal.code}`.slice(0, 120)],
              equivalentGoalCodes: [], groundingPolicy: 'DOMAIN_SPECIFIC',
              applicability: { requiredFactCodes: [], requiredAnyFactCodes: [], excludedFactValues: [] },
              mandatory: false, universal: false,
              weights: { relevance: 0.9, informationGain: 0.85, matchingValue: 0.9, userBurden: 0.35 },
              supportingKnowledgeIds: supportIds,
            },
            validationStatus: 'VALIDATED', publicationStatus: 'PUBLISHED', accessTier: 'PUBLIC_BASIC',
            usageScopes: [INTAKE_ROUTING_KNOWLEDGE_SCOPE],
          },
          update: {},
        })
        goalRuleCount += 1
      }
    }

    let routingRuleCount = 0
    for (const rule of review.routingRules) {
      const scenario = review.scenarios.find((item) => item.routingRuleIds.includes(rule.candidateId))!
      const amendment = decision.routingAmendments?.find((item) => item.routingRuleId === rule.candidateId)
      const conditionalExpertise = amendment?.conditionalExpertise ?? rule.conditionalExpertise.map((item) => ({ code: item.discipline, when: item.when }))
      const removedMatchingCodes = new Set(amendment?.removeFromMatchingCodes ?? [])
      const supportingKnowledgeIds = rule.supportingClaimIds.map((id) => claimIds.get(id)).filter((id): id is string => Boolean(id))
      const requiredConceptCodes = rule.candidateId === 'ROUTE_CHEMICAL_LEAK_MULTIDISCIPLINARY'
        ? ['PROCESS_SAFETY_MAJOR_HAZARDS', 'EXPOSURE_ASSESSMENT']
        : [scenario.requiredSpecialisms[0] ?? scenario.primaryExpertise]
      await transaction.knowledgeRule.upsert({
        where: { code_ruleVersion: { code: rule.candidateId, ruleVersion: 2 } },
        create: {
          code: rule.candidateId, title: rule.routingIntent.slice(0, 240), description: rule.routingIntent.slice(0, 1000),
          ruleType: 'ROUTING_RULE', ruleVersion: 2,
          inputSchema: { scope: INTAKE_ROUTING_KNOWLEDGE_SCOPE },
          expression: { appliesWhen: rule.appliesWhen, exclusions: rule.doNotApplyWhen },
          outputSchema: {
            kind: 'EXPERT_ROUTING', scope: INTAKE_ROUTING_KNOWLEDGE_SCOPE,
            requiredConceptCodes, requiredFactCodes: [], excludedFactCodes: [],
            primaryExpertise: rule.primaryExpertise,
            conditionalExpertise,
            requiredSpecialisms: rule.requiredSpecialisms,
            assignmentType: 'INVESTIGATION_AND_ADVICE',
            relevantSectorExperience: rule.primaryExpertise === 'PROCESS_SAFETY_MAJOR_HAZARDS'
              ? ['Aantoonbare ervaring met procesveiligheid en majeure-gevarensituaties in een vergelijkbare industriële context.']
              : [],
            multidisciplinary: rule.multidisciplinary !== 'NO',
            matchingCodes: [rule.primaryExpertise, ...rule.requiredSpecialisms, ...rule.secondaryDisciplines]
              .filter((code) => !removedMatchingCodes.has(code)),
            supportingKnowledgeIds, priority: rule.candidateId === 'ROUTE_CHEMICAL_LEAK_MULTIDISCIPLINARY' ? 100 : 80,
          },
          validationStatus: 'VALIDATED', publicationStatus: 'PUBLISHED', accessTier: 'PUBLIC_BASIC',
          usageScopes: [INTAKE_ROUTING_KNOWLEDGE_SCOPE],
        },
        update: {},
      })
      routingRuleCount += 1
    }

    await transaction.knowledgeAuditEvent.create({
      data: {
        eventType: 'IMPORT_COMPLETED', entityType: 'CaseUnderstandingReviewPackage', actorUserId: actor.id,
        actorType: 'HUMAN_REVIEWER', result: 'PUBLISHED_PREVIEW',
        reason: `Human Knowledge Review v2 beperkt tot ${INTAKE_ROUTING_KNOWLEDGE_SCOPE}.`,
        metadata: { packageId: review.packageId, claimCount: claimIds.size, contextGoalCount: goalRuleCount, routingRuleCount },
      },
    })
    return { sources: sourceVersionIds.size, claims: claimIds.size, contextGoals: goalRuleCount, routingRules: routingRuleCount }
  }, { isolationLevel: 'Serializable', timeout: 120_000 })

  console.info('[case-understanding-preview-publication]', result)
}

await main().finally(async () => getPrisma().$disconnect())
