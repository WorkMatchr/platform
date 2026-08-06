import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { KNOWLEDGE_IMPORT_MAX_BYTES } from './knowledge-import-schema'
import { validateKnowledgeImport } from './knowledge-import-validation'
import { loadKnowledgeSourceManifest, verifyManifestSource } from './knowledge-source-manifest'

export class KnowledgeImportError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'KnowledgeImportError'
  }
}

async function readPackage(fileName: string) {
  const filePath = path.resolve(fileName)
  const size = (await stat(filePath)).size
  if (size > KNOWLEDGE_IMPORT_MAX_BYTES) throw new KnowledgeImportError('PACKAGE_TOO_LARGE', 'Het importpakket is groter dan 5 MB.')
  let input: unknown
  try {
    input = JSON.parse(await readFile(filePath, 'utf8'))
  } catch {
    throw new KnowledgeImportError('PACKAGE_INVALID', 'Het importpakket bevat geen geldige JSON.')
  }
  const validation = validateKnowledgeImport(input)
  if (!validation.valid || !validation.package) throw new KnowledgeImportError('VALIDATION_FAILED', validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
  return { package: validation.package, validation }
}

async function verifyPackageSource(code: string, checksum: string) {
  const manifest = await loadKnowledgeSourceManifest()
  const source = manifest.sources.find((entry) => entry.code === code)
  if (!source) throw new KnowledgeImportError('SOURCE_NOT_CONFIGURED', `Bron ${code} staat niet in het lokale manifest.`)
  if (source.format !== 'PDF') throw new KnowledgeImportError('SOURCE_UNSUPPORTED', `Bron ${code} is niet beschikbaar voor betrouwbare extractie.`)
  if (source.sha256 !== checksum) throw new KnowledgeImportError('CHECKSUM_MISMATCH', `Checksum van ${code} wijkt af van het importpakket.`)
  await verifyManifestSource(source)
}

export async function previewKnowledgeImport(fileName: string) {
  const { package: data, validation } = await readPackage(fileName)
  await verifyPackageSource(data.source.code, data.sourceVersion.checksum)
  const database = getPrisma()
  const [source, claims, topics] = await Promise.all([
    database.knowledgeSource.findUnique({ where: { code: data.source.code }, select: { id: true } }),
    database.knowledgeClaim.count({ where: { externalKey: { in: data.claims.map((entry) => entry.externalKey) } } }),
    database.knowledgeTopic.count({ where: { slug: { in: data.topics.map((entry) => entry.slug) } } }),
  ])
  return {
    sourceCode: data.source.code,
    schemaVersion: data.schemaVersion,
    counts: validation.counts,
    conflicts: validation.conflicts,
    databaseConflicts: { sourceExists: Boolean(source), claimKeys: claims, topicSlugs: topics },
    writable: !source && claims === 0 && topics === 0,
    warnings: [
      'De bron is historisch en auteursrechtelijk beperkt.',
      'Alle claims blijven DRAFT en UNVALIDATED.',
      ...data.importMetadata.uncertainties,
    ],
  }
}

export async function importKnowledgePackage(fileName: string, options: { confirm: boolean; actorUserId?: string }) {
  if (!options.confirm) throw new KnowledgeImportError('CONFIRMATION_REQUIRED', 'Import vereist expliciet --confirm.')
  const preview = await previewKnowledgeImport(fileName)
  if (!preview.writable) throw new KnowledgeImportError('DUPLICATE_IMPORT', 'Import geweigerd omdat bron, claims of topics al bestaan.')
  const { package: data } = await readPackage(fileName)
  const database = getPrisma()

  return database.$transaction(async (tx) => {
    const source = await tx.knowledgeSource.create({
      data: {
        sourceType: data.source.sourceType,
        sourceFormat: data.source.sourceFormat,
        code: data.source.code,
        title: data.source.title,
        publisher: data.source.publisher,
        publicationDate: data.source.publicationDate ? new Date(data.source.publicationDate) : undefined,
        edition: data.source.edition,
        language: data.source.language,
        jurisdiction: data.source.jurisdiction,
        localReference: `manifest:${data.source.code}`,
        copyrightClassification: data.source.copyrightClassification,
        authorityLevel: data.source.authorityLevel,
        temporalStatus: data.source.temporalStatus,
        sourceFamily: data.source.sourceFamily,
        independenceGroup: data.source.independenceGroup,
        isPrimarySource: data.source.isPrimarySource,
        notes: data.source.notes,
      },
    })
    const sourceVersion = await tx.knowledgeSourceVersion.create({
      data: {
        sourceId: source.id,
        versionLabel: data.sourceVersion.versionLabel,
        publicationDate: data.sourceVersion.publicationDate ? new Date(data.sourceVersion.publicationDate) : undefined,
        validFrom: data.sourceVersion.validFrom ? new Date(data.sourceVersion.validFrom) : undefined,
        validUntil: data.sourceVersion.validUntil ? new Date(data.sourceVersion.validUntil) : undefined,
        checksum: data.sourceVersion.checksum,
        extractionStatus: data.sourceVersion.extractionStatus,
        reviewStatus: data.sourceVersion.reviewStatus,
        importedAt: new Date(),
      },
    })
    await tx.knowledgeAuditEvent.createMany({ data: [
      { eventType: 'SOURCE_REGISTERED', entityType: 'KnowledgeSource', entityId: source.id, actorUserId: options.actorUserId, actorType: options.actorUserId ? 'PLATFORM_ADMIN' : 'LOCAL_CLI', result: 'SUCCESS', metadata: { sourceCode: data.source.code } },
      { eventType: 'SOURCE_VERSION_ADDED', entityType: 'KnowledgeSourceVersion', entityId: sourceVersion.id, actorUserId: options.actorUserId, actorType: options.actorUserId ? 'PLATFORM_ADMIN' : 'LOCAL_CLI', result: 'SUCCESS', metadata: { sourceCode: data.source.code, versionLabel: data.sourceVersion.versionLabel } },
    ] })

    const topicIds = new Map<string, string>()
    for (const topic of data.topics.filter((entry) => !entry.parentTopicKey)) {
      const created = await tx.knowledgeTopic.create({ data: { slug: topic.slug, title: topic.title, description: topic.description, domain: topic.domain } })
      topicIds.set(topic.externalKey, created.id)
    }
    for (const topic of data.topics.filter((entry) => entry.parentTopicKey)) {
      const parentTopicId = topicIds.get(topic.parentTopicKey!)
      if (!parentTopicId) throw new KnowledgeImportError('TOPIC_ORDER_INVALID', 'Bovenliggend topic ontbreekt.')
      const created = await tx.knowledgeTopic.create({ data: { slug: topic.slug, title: topic.title, description: topic.description, domain: topic.domain, parentTopicId } })
      topicIds.set(topic.externalKey, created.id)
    }

    const roleIds = new Map<string, string>()
    for (const role of data.roles) {
      const created = await tx.knowledgeRole.create({ data: role })
      roleIds.set(role.code, created.id)
    }
    const fragmentIds = new Map<string, string>()
    for (const fragment of data.fragments) {
      const created = await tx.knowledgeFragment.create({ data: {
        externalKey: fragment.externalKey, sourceVersionId: sourceVersion.id,
        pageFrom: fragment.pageFrom, pageTo: fragment.pageTo, sectionPath: fragment.sectionPath,
        fragmentType: fragment.fragmentType, internalExcerpt: fragment.internalExcerpt,
        excerptHash: fragment.excerptHash, extractionMethod: fragment.extractionMethod,
        requiresReview: fragment.requiresReview,
      } })
      fragmentIds.set(fragment.externalKey, created.id)
    }
    const claimIds = new Map<string, string>()
    for (const claim of data.claims) {
      const topicId = topicIds.get(claim.topicKey)
      if (!topicId) throw new KnowledgeImportError('UNKNOWN_TOPIC', 'Claimtopic ontbreekt tijdens import.')
      const created = await tx.knowledgeClaim.create({
        data: {
          externalKey: claim.externalKey,
          topicId,
          claimType: claim.claimType,
          statement: claim.statement,
          normalizedStatement: claim.normalizedStatement,
          applicability: claim.applicability,
          jurisdiction: claim.jurisdiction,
          validFrom: claim.validFrom ? new Date(claim.validFrom) : undefined,
          validUntil: claim.validUntil ? new Date(claim.validUntil) : undefined,
          temporalStatus: claim.temporalStatus,
          validationStatus: claim.validationStatus,
          publicationStatus: claim.publicationStatus,
          confidenceLevel: claim.confidenceLevel,
          accessTier: claim.accessTier,
          createdByActor: data.importMetadata.createdBy,
          createdByUserId: options.actorUserId,
        },
      })
      claimIds.set(claim.externalKey, created.id)
      await tx.knowledgeAuditEvent.create({ data: { eventType: 'CLAIM_CREATED', entityType: 'KnowledgeClaim', entityId: created.id, actorUserId: options.actorUserId, actorType: options.actorUserId ? 'PLATFORM_ADMIN' : 'LOCAL_CLI', result: 'SUCCESS', metadata: { externalKey: claim.externalKey } } })
    }
    for (const citation of data.citations) {
      await tx.knowledgeCitation.create({ data: { claimId: claimIds.get(citation.claimKey)!, sourceVersionId: sourceVersion.id, fragmentId: citation.fragmentKey ? fragmentIds.get(citation.fragmentKey) : undefined, supportType: citation.supportType, citationNote: citation.citationNote } })
    }
    for (const relation of data.relations) {
      await tx.knowledgeRelation.create({ data: {
        externalKey: relation.externalKey,
        fromTopicId: relation.from.kind === 'TOPIC' ? topicIds.get(relation.from.key) : undefined,
        fromClaimId: relation.from.kind === 'CLAIM' ? claimIds.get(relation.from.key) : undefined,
        toTopicId: relation.to.kind === 'TOPIC' ? topicIds.get(relation.to.key) : undefined,
        toClaimId: relation.to.kind === 'CLAIM' ? claimIds.get(relation.to.key) : undefined,
        relationType: relation.relationType,
        rationale: relation.rationale,
      } })
    }

    const ruleIds = new Map<string, string>()
    for (const rule of data.rules) {
      const created = await tx.knowledgeRule.create({ data: {
        code: rule.code, title: rule.title, description: rule.description, ruleType: rule.ruleType,
        ruleVersion: rule.ruleVersion, inputSchema: rule.inputSchema as Prisma.InputJsonValue,
        expression: rule.expression as Prisma.InputJsonValue, outputSchema: rule.outputSchema as Prisma.InputJsonValue,
        validationStatus: rule.validationStatus, publicationStatus: rule.publicationStatus, accessTier: rule.accessTier,
      } })
      ruleIds.set(rule.code, created.id)
    }
    for (const calculation of data.calculations) await tx.knowledgeCalculation.create({ data: {
      code: calculation.code, title: calculation.title, description: calculation.description,
      calculationType: calculation.calculationType, calculationVersion: calculation.calculationVersion,
      inputSchema: calculation.inputSchema as Prisma.InputJsonValue,
      formulaRepresentation: calculation.formulaRepresentation as Prisma.InputJsonValue,
      outputSchema: calculation.outputSchema as Prisma.InputJsonValue,
      unitDefinitions: calculation.unitDefinitions as Prisma.InputJsonValue,
      limitations: calculation.limitations, validationStatus: calculation.validationStatus,
      publicationStatus: calculation.publicationStatus, accessTier: calculation.accessTier,
    } })
    for (const checklist of data.checklists) {
      await tx.knowledgeChecklist.create({ data: {
        code: checklist.code, version: checklist.version, title: checklist.title, description: checklist.description,
        topicId: topicIds.get(checklist.topicKey)!, audience: checklist.audience, scoringMethod: checklist.scoringMethod,
        validationStatus: checklist.validationStatus, publicationStatus: checklist.publicationStatus,
        items: { create: checklist.items.map((item) => ({
          order: item.order, question: item.question, answerType: item.answerType,
          answerOptions: item.answerOptions as Prisma.InputJsonValue | undefined,
          scoreRules: item.scoreRules as Prisma.InputJsonValue | undefined,
          explanationClaimId: item.explanationClaimKey ? claimIds.get(item.explanationClaimKey) : undefined,
          required: item.required,
        })) },
      } })
    }
    for (const procedure of data.procedures) {
      await tx.knowledgeProcedure.create({ data: {
        code: procedure.code, version: procedure.version, title: procedure.title, description: procedure.description,
        topicId: topicIds.get(procedure.topicKey)!, audience: procedure.audience,
        prerequisites: procedure.prerequisites as Prisma.InputJsonValue,
        validationStatus: procedure.validationStatus, publicationStatus: procedure.publicationStatus,
        steps: { create: procedure.steps.map((step) => ({
          order: step.order, title: step.title, instruction: step.instruction,
          conditionRuleId: step.conditionRuleCode ? ruleIds.get(step.conditionRuleCode) : undefined,
          responsibleRoleId: step.responsibleRoleCode ? roleIds.get(step.responsibleRoleCode) : undefined,
          evidenceRequired: step.evidenceRequired,
          warningClaimId: step.warningClaimKey ? claimIds.get(step.warningClaimKey) : undefined,
        })) },
      } })
    }
    for (const template of data.formTemplates) await tx.knowledgeFormTemplate.create({ data: {
      code: template.code, title: template.title, description: template.description, topicId: topicIds.get(template.topicKey)!, schemaVersion: template.schemaVersion,
      formSchema: template.formSchema as Prisma.InputJsonValue, validationStatus: template.validationStatus, publicationStatus: template.publicationStatus, accessTier: template.accessTier,
    } })
    await tx.knowledgeAuditEvent.create({ data: {
      eventType: 'IMPORT_COMPLETED', entityType: 'KnowledgeSource', entityId: source.id,
      actorUserId: options.actorUserId, actorType: options.actorUserId ? 'PLATFORM_ADMIN' : 'LOCAL_CLI', result: 'SUCCESS',
      metadata: { sourceCode: data.source.code, schemaVersion: data.schemaVersion, counts: preview.counts },
    } })
    return { sourceId: source.id, sourceVersionId: sourceVersion.id, counts: preview.counts }
  }, { isolationLevel: 'Serializable' })
}
