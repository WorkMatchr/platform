import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { createKnowledgeImportFingerprint, fingerprintKnowledgeImportPackage, type KnowledgeImportFingerprintSnapshot } from './knowledge-import-fingerprint'
import { KNOWLEDGE_IMPORT_MAX_BYTES, type KnowledgeImportPackage } from './knowledge-import-schema'
import { validateKnowledgeImport } from './knowledge-import-validation'
import { getManifestLogicalPath, loadKnowledgeSourceManifest, mapSourceKindToType, verifyManifestSource } from './knowledge-source-manifest'

export class KnowledgeImportError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'KnowledgeImportError'
  }
}

type ImportOptions = { confirm: boolean; actorUserId?: string }
type CorrectionOptions = ImportOptions & { correctionReason: string }

function correctionExternalKey(key: string, revision: number) {
  const suffix = `~r${revision}`
  if (key.length + suffix.length <= 160) return `${key}${suffix}`
  return `${key.slice(0, 160 - suffix.length)}${suffix}`
}

function assertCorrectionScope(data: KnowledgeImportPackage) {
  const unsupported = [data.rules, data.calculations, data.checklists, data.procedures, data.formTemplates]
  if (unsupported.some((entries) => entries.length > 0)) {
    throw new KnowledgeImportError('CORRECTION_SCOPE_UNSUPPORTED', 'Het correctiepad ondersteunt uitsluitend bronversies, onderwerpen, fragmenten, claims, citaties, relaties en bestaande rollen.')
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
  return source
}

function assertLocalCliAllowed() {
  if (process.env.NODE_ENV === 'production') throw new KnowledgeImportError('NOT_AUTHORIZED', 'Import zonder platformbeheerder is in productie niet toegestaan.')
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new KnowledgeImportError('NOT_AUTHORIZED', 'Een lokale databaseconfiguratie is vereist.')
  const host = new URL(connectionString).hostname
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new KnowledgeImportError('NOT_AUTHORIZED', 'Import zonder platformbeheerder mag uitsluitend op een lokale database.')
}

async function assertImportAuthorization(tx: Prisma.TransactionClient, actorUserId?: string) {
  if (!actorUserId) return assertLocalCliAllowed()
  const actor = await tx.user.findFirst({
    where: {
      id: actorUserId,
      status: 'ACTIVE',
      platformRole: 'ADMIN',
      memberships: { some: { status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { status: 'ACTIVE', organizationType: 'PLATFORM_OPERATOR', systemKey: 'WORKMATCHR_PLATFORM' } } },
    },
    select: { id: true },
  })
  if (!actor) throw new KnowledgeImportError('NOT_AUTHORIZED', 'Deze kennisimport is niet beschikbaar.')
}

const activeVersionInclude = {
  source: true,
  fragments: true,
  citations: { include: { fragment: true, claim: { include: { topic: true } } } },
} satisfies Prisma.KnowledgeSourceVersionInclude

type ActiveSourceVersion = Prisma.KnowledgeSourceVersionGetPayload<{ include: typeof activeVersionInclude }>

function snapshotPersistedVersion(version: ActiveSourceVersion): KnowledgeImportFingerprintSnapshot {
  const claims = new Map(version.citations.map((citation) => [citation.claim.id, citation.claim]))
  return {
    source: {
      code: version.source.code,
      sourceType: version.source.sourceType,
      sourceFormat: version.source.sourceFormat,
      title: version.source.title,
      publisher: version.source.publisher,
      publicationDate: version.source.publicationDate?.toISOString().slice(0, 10) ?? null,
      sourceModifiedDate: version.source.sourceModifiedDate?.toISOString().slice(0, 10) ?? null,
      edition: version.source.edition,
      applicabilityScope: version.source.applicabilityScope,
      metadataStatus: version.source.metadataStatus,
      language: version.source.language,
      jurisdiction: version.source.jurisdiction,
      copyrightClassification: version.source.copyrightClassification,
      authorityLevel: version.source.authorityLevel,
      temporalStatus: version.source.temporalStatus,
      sourceFamily: version.source.sourceFamily,
      independenceGroup: version.source.independenceGroup,
      isPrimarySource: version.source.isPrimarySource,
      notes: version.source.notes,
    },
    sourceVersion: {
      versionLabel: version.versionLabel,
      publicationDate: version.publicationDate?.toISOString().slice(0, 10) ?? null,
      validFrom: version.validFrom?.toISOString().slice(0, 10) ?? null,
      validUntil: version.validUntil?.toISOString().slice(0, 10) ?? null,
      checksum: version.checksum,
      extractionStatus: version.extractionStatus,
      reviewStatus: version.reviewStatus,
    },
    fragments: version.fragments.map((fragment) => ({
      key: fragment.externalKey,
      pageFrom: fragment.pageFrom,
      pageTo: fragment.pageTo,
      sectionPath: fragment.sectionPath,
      fragmentType: fragment.fragmentType,
      internalExcerpt: fragment.internalExcerpt,
      excerptHash: fragment.excerptHash,
    })).sort((left, right) => left.key.localeCompare(right.key, 'en')),
    claims: [...claims.values()].map((claim) => ({
      key: claim.externalKey,
      topicSlug: claim.topic.slug,
      claimType: claim.claimType,
      statement: claim.statement,
      normalizedStatement: claim.normalizedStatement,
      applicability: claim.applicability,
      jurisdiction: claim.jurisdiction,
      validFrom: claim.validFrom?.toISOString().slice(0, 10) ?? null,
      validUntil: claim.validUntil?.toISOString().slice(0, 10) ?? null,
      temporalStatus: claim.temporalStatus,
      validationStatus: claim.validationStatus,
      publicationStatus: claim.publicationStatus,
      confidenceLevel: claim.confidenceLevel,
      accessTier: claim.accessTier,
      controlRisk: claim.controlRisk,
    })).sort((left, right) => left.key.localeCompare(right.key, 'en')),
    citations: version.citations.map((citation) => ({
      claimKey: citation.claim.externalKey,
      fragmentKey: citation.fragment?.externalKey ?? '',
      supportType: citation.supportType,
      citationNote: citation.citationNote,
    })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), 'en')),
  }
}

function persistedFingerprint(version: ActiveSourceVersion) {
  return version.contentFingerprint ?? createKnowledgeImportFingerprint(snapshotPersistedVersion(version))
}

async function findActiveVersion(data: KnowledgeImportPackage) {
  return getPrisma().knowledgeSourceVersion.findFirst({
    where: {
      source: { code: data.source.code },
      versionLabel: data.sourceVersion.versionLabel,
      supersededByVersion: { is: null },
    },
    include: activeVersionInclude,
    orderBy: { importRevision: 'desc' },
  })
}

export async function previewKnowledgeImport(fileName: string, options: { correction?: boolean } = {}) {
  const { package: data, validation } = await readPackage(fileName)
  const manifestSource = await verifyPackageSource(data.source.code, data.sourceVersion.checksum)
  if (manifestSource.sourceKind && mapSourceKindToType(manifestSource.sourceKind) !== data.source.sourceType) {
    throw new KnowledgeImportError('SOURCE_TYPE_MISMATCH', 'De bronsoort in het manifest en importpakket komen niet overeen.')
  }
  const database = getPrisma()
  const incomingFingerprint = fingerprintKnowledgeImportPackage(data)
  const [source, version, claims, fragments, topics] = await Promise.all([
    database.knowledgeSource.findUnique({ where: { code: data.source.code }, select: { id: true, sourceType: true, sourceFormat: true, title: true } }),
    findActiveVersion(data),
    database.knowledgeClaim.count({ where: { externalKey: { in: data.claims.map((entry) => entry.externalKey) } } }),
    database.knowledgeFragment.count({ where: { externalKey: { in: data.fragments.map((entry) => entry.externalKey) } } }),
    database.knowledgeTopic.findMany({ where: { slug: { in: data.topics.map((entry) => entry.slug) } }, select: { slug: true, title: true, description: true, domain: true } }),
  ])
  const incompatibleTopics = topics.filter((existing) => {
    const incoming = data.topics.find((entry) => entry.slug === existing.slug)
    return !incoming || incoming.title !== existing.title || incoming.description !== existing.description || incoming.domain !== existing.domain
  })
  const exactReplay = Boolean(version && persistedFingerprint(version) === incomingFingerprint)
  const sourceCompatible = !source || (source.sourceType === data.source.sourceType && source.sourceFormat === data.source.sourceFormat && source.title === data.source.title)
  const writable = !version && claims === 0 && fragments === 0 && incompatibleTopics.length === 0 && sourceCompatible
  const correctionCandidate = Boolean(
    options.correction && version && sourceCompatible && version.checksum === data.sourceVersion.checksum && !exactReplay,
  )
  const warnings = [
    'Alle claims blijven DRAFT en UNVALIDATED.',
    ...(data.source.temporalStatus === 'CURRENT' ? [] : ['De bron is niet aantoonbaar actueel en blijft fail-closed.']),
    ...(data.source.metadataStatus === 'COMPLETE' ? [] : ['Bronmetadata is onvolledig of onzeker en wordt als uitzondering gemarkeerd.']),
    ...data.importMetadata.uncertainties,
  ]
  const exceptionFlags = [
    ...(exactReplay ? ['DUPLICATE_IDENTICAL'] : []),
    ...(!exactReplay && (Boolean(source) || Boolean(version) || claims > 0 || fragments > 0) ? ['CONTENT_MISMATCH'] : []),
    ...(data.source.temporalStatus === 'CURRENT' ? [] : ['SOURCE_NOT_CURRENT']),
    ...(data.source.metadataStatus === 'COMPLETE' ? [] : ['METADATA_UNCERTAIN']),
    ...(incompatibleTopics.length === 0 ? [] : ['APPLICABILITY_CONFLICT']),
  ]
  return {
    sourceCode: data.source.code,
    schemaVersion: data.schemaVersion,
    counts: validation.counts,
    conflicts: validation.conflicts,
    claimRisks: data.claims
      .map((claim) => ({ externalKey: claim.externalKey, controlRisk: claim.controlRisk }))
      .sort((left, right) => left.externalKey.localeCompare(right.externalKey, 'en')),
    sourceType: data.source.sourceType,
    logicalSourcePath: getManifestLogicalPath(manifestSource),
    contentFingerprint: incomingFingerprint,
    existingFingerprint: version ? persistedFingerprint(version) : null,
    databaseConflicts: { sourceExists: Boolean(source), versionExists: Boolean(version), claimKeys: claims, fragmentKeys: fragments, incompatibleTopics: incompatibleTopics.length },
    writable,
    idempotentReplay: exactReplay,
    correctionCandidate,
    existing: exactReplay && source && version ? { sourceId: source.id, sourceVersionId: version.id, importRevision: version.importRevision } : null,
    current: version ? { sourceVersionId: version.id, importRevision: version.importRevision } : null,
    exceptionFlags,
    requiresExceptionControl: exceptionFlags.some((flag) => !['DUPLICATE_IDENTICAL'].includes(flag)),
    warnings,
  }
}

export async function importKnowledgePackage(fileName: string, options: ImportOptions) {
  if (!options.confirm) throw new KnowledgeImportError('CONFIRMATION_REQUIRED', 'Import vereist expliciet --confirm.')
  const preview = await previewKnowledgeImport(fileName)
  if (preview.idempotentReplay && preview.existing) return { ...preview.existing, counts: preview.counts, reused: true }
  if (!preview.writable) throw new KnowledgeImportError('CONTENT_MISMATCH', 'Import geweigerd omdat de opgeslagen broninhoud niet inhoudelijk identiek is. Gebruik uitsluitend na beoordeling het expliciete correctiepad.')
  const { package: data } = await readPackage(fileName)
  const manifestSource = await verifyPackageSource(data.source.code, data.sourceVersion.checksum)
  const database = getPrisma()

  return database.$transaction(async (tx) => {
    await assertImportAuthorization(tx, options.actorUserId)
    const existingSource = await tx.knowledgeSource.findUnique({ where: { code: data.source.code } })
    const source = existingSource ?? await tx.knowledgeSource.create({ data: {
        sourceType: data.source.sourceType,
        sourceFormat: data.source.sourceFormat,
        code: data.source.code,
        title: data.source.title,
        publisher: data.source.publisher,
        publicationDate: data.source.publicationDate ? new Date(data.source.publicationDate) : undefined,
        sourceModifiedDate: data.source.sourceModifiedDate ? new Date(data.source.sourceModifiedDate) : undefined,
        edition: data.source.edition,
        applicabilityScope: data.source.applicabilityScope,
        metadataStatus: data.source.metadataStatus,
        language: data.source.language,
        jurisdiction: data.source.jurisdiction,
        localReference: `manifest:${getManifestLogicalPath(manifestSource)}`,
        copyrightClassification: data.source.copyrightClassification,
        authorityLevel: data.source.authorityLevel,
        temporalStatus: data.source.temporalStatus,
        sourceFamily: data.source.sourceFamily,
        independenceGroup: data.source.independenceGroup,
        isPrimarySource: data.source.isPrimarySource,
        notes: data.source.notes,
      } })
    const sourceVersion = await tx.knowledgeSourceVersion.create({
      data: {
        sourceId: source.id,
        versionLabel: data.sourceVersion.versionLabel,
        publicationDate: data.sourceVersion.publicationDate ? new Date(data.sourceVersion.publicationDate) : undefined,
        validFrom: data.sourceVersion.validFrom ? new Date(data.sourceVersion.validFrom) : undefined,
        validUntil: data.sourceVersion.validUntil ? new Date(data.sourceVersion.validUntil) : undefined,
        checksum: data.sourceVersion.checksum,
        importRevision: 1,
        contentFingerprint: fingerprintKnowledgeImportPackage(data),
        extractionStatus: data.sourceVersion.extractionStatus,
        reviewStatus: data.sourceVersion.reviewStatus,
        importedAt: new Date(),
      },
    })
    await tx.knowledgeAuditEvent.createMany({ data: [
      ...(!existingSource ? [{ eventType: 'SOURCE_REGISTERED' as const, entityType: 'KnowledgeSource', entityId: source.id, actorUserId: options.actorUserId, actorType: options.actorUserId ? 'PLATFORM_ADMIN' : 'LOCAL_CLI', result: 'SUCCESS', metadata: { sourceCode: data.source.code } }] : []),
      { eventType: 'SOURCE_VERSION_ADDED', entityType: 'KnowledgeSourceVersion', entityId: sourceVersion.id, actorUserId: options.actorUserId, actorType: options.actorUserId ? 'PLATFORM_ADMIN' : 'LOCAL_CLI', result: 'SUCCESS', metadata: { sourceCode: data.source.code, versionLabel: data.sourceVersion.versionLabel } },
    ] })

    const topicIds = new Map<string, string>()
    const existingTopics = await tx.knowledgeTopic.findMany({ where: { slug: { in: data.topics.map((entry) => entry.slug) } } })
    for (const topic of data.topics) {
      const existing = existingTopics.find((entry) => entry.slug === topic.slug)
      if (existing) topicIds.set(topic.externalKey, existing.id)
    }
    for (const topic of data.topics.filter((entry) => !entry.parentTopicKey)) {
      if (topicIds.has(topic.externalKey)) continue
      const created = await tx.knowledgeTopic.create({ data: { slug: topic.slug, title: topic.title, description: topic.description, domain: topic.domain } })
      topicIds.set(topic.externalKey, created.id)
    }
    for (const topic of data.topics.filter((entry) => entry.parentTopicKey)) {
      if (topicIds.has(topic.externalKey)) continue
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
          controlRisk: claim.controlRisk,
          sourceControlStatus: data.source.temporalStatus === 'CURRENT'
            ? (data.source.metadataStatus === 'COMPLETE' ? 'SOURCES_COLLECTED' : 'HUMAN_EXCEPTION_REQUIRED')
            : 'OUTDATED',
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
    return { sourceId: source.id, sourceVersionId: sourceVersion.id, counts: preview.counts, reused: false }
  }, { isolationLevel: 'Serializable' })
}

export async function correctKnowledgePackage(fileName: string, options: CorrectionOptions) {
  if (!options.confirm) throw new KnowledgeImportError('CONFIRMATION_REQUIRED', 'Correctie vereist expliciet --confirm.')
  if (options.correctionReason.trim().length < 10) throw new KnowledgeImportError('CORRECTION_REASON_REQUIRED', 'Leg de reden voor de immutable correctie concreet vast.')

  const { package: data, validation } = await readPackage(fileName)
  assertCorrectionScope(data)
  const manifestSource = await verifyPackageSource(data.source.code, data.sourceVersion.checksum)
  const preview = await previewKnowledgeImport(fileName, { correction: true })
  if (preview.idempotentReplay && preview.existing) return { ...preview.existing, counts: preview.counts, reused: true, corrected: false }
  if (!preview.correctionCandidate || !preview.current) {
    throw new KnowledgeImportError('CORRECTION_NOT_ALLOWED', 'Er is geen inhoudelijk afwijkende, veilig corrigeerbare broneditie gevonden.')
  }
  const previewCurrent = preview.current

  const incomingFingerprint = fingerprintKnowledgeImportPackage(data)
  const database = getPrisma()
  return database.$transaction(async (tx) => {
    await assertImportAuthorization(tx, options.actorUserId)
    const source = await tx.knowledgeSource.findUnique({ where: { code: data.source.code } })
    if (!source) throw new KnowledgeImportError('SOURCE_NOT_FOUND', 'De te corrigeren bron bestaat niet.')
    await tx.$queryRaw`SELECT "id" FROM "KnowledgeSource" WHERE "id" = ${source.id}::uuid FOR UPDATE`

    const currentVersion = await tx.knowledgeSourceVersion.findFirst({
      where: { sourceId: source.id, versionLabel: data.sourceVersion.versionLabel, supersededByVersion: { is: null } },
      orderBy: { importRevision: 'desc' },
    })
    if (!currentVersion) throw new KnowledgeImportError('SOURCE_VERSION_NOT_FOUND', 'De te corrigeren broneditie bestaat niet.')
    const currentFragments = await tx.knowledgeFragment.findMany({
      where: { sourceVersionId: currentVersion.id },
    })
    const currentCitationRows = await tx.knowledgeCitation.findMany({
      where: { sourceVersionId: currentVersion.id },
    })
    const currentClaimRows = await tx.knowledgeClaim.findMany({
      where: { id: { in: currentCitationRows.map((citation) => citation.claimId) } },
    })
    const currentTopicRows = await tx.knowledgeTopic.findMany({
      where: { id: { in: currentClaimRows.map((claim) => claim.topicId) } },
    })
    const fragmentById = new Map(currentFragments.map((fragment) => [fragment.id, fragment]))
    const claimById = new Map(currentClaimRows.map((claim) => [claim.id, claim]))
    const topicById = new Map(currentTopicRows.map((topic) => [topic.id, topic]))
    const current = {
      ...currentVersion,
      source,
      fragments: currentFragments,
      citations: currentCitationRows.map((citation) => {
        const claim = claimById.get(citation.claimId)
        const topic = claim ? topicById.get(claim.topicId) : undefined
        if (!claim || !topic) {
          throw new KnowledgeImportError('CORRECTION_SOURCE_INCOMPLETE', 'De bestaande correctiebron bevat een onvolledige claim- of onderwerpverwijzing.')
        }
        return {
          ...citation,
          fragment: citation.fragmentId ? fragmentById.get(citation.fragmentId) ?? null : null,
          claim: { ...claim, topic },
        }
      }),
    } satisfies ActiveSourceVersion
    const currentFingerprint = persistedFingerprint(current)
    if (currentFingerprint === incomingFingerprint) {
      return { sourceId: source.id, sourceVersionId: current.id, importRevision: current.importRevision, counts: validation.counts, reused: true, corrected: false }
    }
    if (current.id !== previewCurrent.sourceVersionId || currentFingerprint !== preview.existingFingerprint) {
      throw new KnowledgeImportError('CONCURRENT_CORRECTION', 'De broneditie is gelijktijdig gewijzigd; maak een nieuwe preview.')
    }
    if (current.checksum !== data.sourceVersion.checksum) {
      throw new KnowledgeImportError('SOURCE_EDITION_MISMATCH', 'Een correctie mag uitsluitend dezelfde broneditie en checksum vervangen.')
    }
    const currentClaims = new Map(current.citations.map((citation) => [citation.claim.id, citation.claim]))
    if ([...currentClaims.values()].some((claim) => claim.publicationStatus !== 'DRAFT' || claim.validationStatus !== 'UNVALIDATED')) {
      throw new KnowledgeImportError('CORRECTION_REQUIRES_DRAFT', 'Alleen ongepubliceerde en ongevalideerde importkennis kan via dit correctiepad worden vervangen.')
    }

    const previousSourceMetadata = {
      publisher: source.publisher,
      publicationDate: source.publicationDate?.toISOString().slice(0, 10) ?? null,
      sourceModifiedDate: source.sourceModifiedDate?.toISOString().slice(0, 10) ?? null,
      edition: source.edition,
      applicabilityScope: source.applicabilityScope,
      metadataStatus: source.metadataStatus,
      language: source.language,
      jurisdiction: source.jurisdiction,
      copyrightClassification: source.copyrightClassification,
      authorityLevel: source.authorityLevel,
      temporalStatus: source.temporalStatus,
      sourceFamily: source.sourceFamily,
      independenceGroup: source.independenceGroup,
      isPrimarySource: source.isPrimarySource,
      notes: source.notes,
      localReference: source.localReference,
    }
    const correctedSourceMetadata = {
      publisher: data.source.publisher ?? null,
      publicationDate: data.source.publicationDate ?? null,
      sourceModifiedDate: data.source.sourceModifiedDate ?? null,
      edition: data.source.edition ?? null,
      applicabilityScope: data.source.applicabilityScope ?? null,
      metadataStatus: data.source.metadataStatus,
      language: data.source.language,
      jurisdiction: data.source.jurisdiction,
      copyrightClassification: data.source.copyrightClassification,
      authorityLevel: data.source.authorityLevel,
      temporalStatus: data.source.temporalStatus,
      sourceFamily: data.source.sourceFamily,
      independenceGroup: data.source.independenceGroup,
      isPrimarySource: data.source.isPrimarySource,
      notes: data.source.notes ?? null,
      localReference: `manifest:${getManifestLogicalPath(manifestSource)}`,
    }

    await tx.knowledgeSource.update({
      where: { id: source.id },
      data: {
        publisher: correctedSourceMetadata.publisher,
        publicationDate: correctedSourceMetadata.publicationDate
          ? new Date(correctedSourceMetadata.publicationDate)
          : null,
        sourceModifiedDate: correctedSourceMetadata.sourceModifiedDate
          ? new Date(correctedSourceMetadata.sourceModifiedDate)
          : null,
        edition: correctedSourceMetadata.edition,
        applicabilityScope: correctedSourceMetadata.applicabilityScope,
        metadataStatus: correctedSourceMetadata.metadataStatus,
        language: correctedSourceMetadata.language,
        jurisdiction: correctedSourceMetadata.jurisdiction,
        copyrightClassification: correctedSourceMetadata.copyrightClassification,
        authorityLevel: correctedSourceMetadata.authorityLevel,
        temporalStatus: correctedSourceMetadata.temporalStatus,
        sourceFamily: correctedSourceMetadata.sourceFamily,
        independenceGroup: correctedSourceMetadata.independenceGroup,
        isPrimarySource: correctedSourceMetadata.isPrimarySource,
        notes: correctedSourceMetadata.notes,
        localReference: correctedSourceMetadata.localReference,
      },
    })

    const importRevision = current.importRevision + 1
    const sourceVersion = await tx.knowledgeSourceVersion.create({ data: {
      sourceId: source.id,
      versionLabel: data.sourceVersion.versionLabel,
      publicationDate: data.sourceVersion.publicationDate ? new Date(data.sourceVersion.publicationDate) : undefined,
      validFrom: data.sourceVersion.validFrom ? new Date(data.sourceVersion.validFrom) : undefined,
      validUntil: data.sourceVersion.validUntil ? new Date(data.sourceVersion.validUntil) : undefined,
      checksum: data.sourceVersion.checksum,
      importRevision,
      contentFingerprint: incomingFingerprint,
      supersedesVersionId: current.id,
      extractionStatus: data.sourceVersion.extractionStatus,
      reviewStatus: data.sourceVersion.reviewStatus,
      importedAt: new Date(),
    } })

    const existingTopics = await tx.knowledgeTopic.findMany({ where: { slug: { in: data.topics.map((topic) => topic.slug) } } })
    const topicIds = new Map<string, string>()
    for (const topic of data.topics) {
      const existing = existingTopics.find((candidate) => candidate.slug === topic.slug)
      if (existing && (existing.title !== topic.title || existing.description !== topic.description || existing.domain !== topic.domain)) {
        throw new KnowledgeImportError('TOPIC_CONFLICT', `Onderwerp ${topic.slug} wijkt inhoudelijk af.`)
      }
      if (existing) topicIds.set(topic.externalKey, existing.id)
    }
    for (const topic of data.topics.filter((entry) => !entry.parentTopicKey && !topicIds.has(entry.externalKey))) {
      const created = await tx.knowledgeTopic.create({ data: { slug: topic.slug, title: topic.title, description: topic.description, domain: topic.domain } })
      topicIds.set(topic.externalKey, created.id)
    }
    for (const topic of data.topics.filter((entry) => entry.parentTopicKey && !topicIds.has(entry.externalKey))) {
      const parentTopicId = topicIds.get(topic.parentTopicKey!)
      if (!parentTopicId) throw new KnowledgeImportError('TOPIC_ORDER_INVALID', 'Bovenliggend topic ontbreekt.')
      const created = await tx.knowledgeTopic.create({ data: { slug: topic.slug, title: topic.title, description: topic.description, domain: topic.domain, parentTopicId } })
      topicIds.set(topic.externalKey, created.id)
    }

    for (const role of data.roles) {
      const existing = await tx.knowledgeRole.findUnique({ where: { code: role.code } })
      if (existing && (existing.title !== role.title || existing.description !== role.description)) throw new KnowledgeImportError('ROLE_CONFLICT', `Rol ${role.code} wijkt inhoudelijk af.`)
      if (!existing) await tx.knowledgeRole.create({ data: role })
    }

    const fragmentIds = new Map<string, string>()
    for (const fragment of data.fragments) {
      const created = await tx.knowledgeFragment.create({ data: {
        externalKey: correctionExternalKey(fragment.externalKey, importRevision),
        sourceVersionId: sourceVersion.id,
        pageFrom: fragment.pageFrom,
        pageTo: fragment.pageTo,
        sectionPath: fragment.sectionPath,
        fragmentType: fragment.fragmentType,
        internalExcerpt: fragment.internalExcerpt,
        excerptHash: fragment.excerptHash,
        extractionMethod: fragment.extractionMethod,
        requiresReview: fragment.requiresReview,
      } })
      fragmentIds.set(fragment.externalKey, created.id)
    }

    const claimIds = new Map<string, string>()
    for (const claim of data.claims) {
      const topicId = topicIds.get(claim.topicKey)
      if (!topicId) throw new KnowledgeImportError('UNKNOWN_TOPIC', 'Claimtopic ontbreekt tijdens correctie.')
      const created = await tx.knowledgeClaim.create({ data: {
        externalKey: correctionExternalKey(claim.externalKey, importRevision),
        topicId,
        claimType: claim.claimType,
        statement: claim.statement,
        normalizedStatement: claim.normalizedStatement,
        applicability: claim.applicability,
        jurisdiction: claim.jurisdiction,
        validFrom: claim.validFrom ? new Date(claim.validFrom) : undefined,
        validUntil: claim.validUntil ? new Date(claim.validUntil) : undefined,
        temporalStatus: claim.temporalStatus,
        validationStatus: 'UNVALIDATED',
        publicationStatus: 'DRAFT',
        confidenceLevel: claim.confidenceLevel,
        accessTier: claim.accessTier,
        controlRisk: claim.controlRisk,
        sourceControlStatus: data.source.temporalStatus === 'CURRENT'
          ? (data.source.metadataStatus === 'COMPLETE' ? 'SOURCES_COLLECTED' : 'HUMAN_EXCEPTION_REQUIRED')
          : 'OUTDATED',
        createdByActor: data.importMetadata.createdBy,
        createdByUserId: options.actorUserId,
      } })
      claimIds.set(claim.externalKey, created.id)
      await tx.knowledgeAuditEvent.create({ data: {
        eventType: 'CLAIM_CREATED', entityType: 'KnowledgeClaim', entityId: created.id,
        actorUserId: options.actorUserId, actorType: options.actorUserId ? 'PLATFORM_ADMIN' : 'LOCAL_CLI', result: 'SUCCESS',
        metadata: { logicalExternalKey: claim.externalKey, importRevision, correctionOfVersionId: current.id },
      } })
    }

    for (const citation of data.citations) {
      await tx.knowledgeCitation.create({ data: {
        claimId: claimIds.get(citation.claimKey)!,
        sourceVersionId: sourceVersion.id,
        fragmentId: citation.fragmentKey ? fragmentIds.get(citation.fragmentKey) : undefined,
        supportType: citation.supportType,
        citationNote: citation.citationNote,
      } })
    }
    for (const relation of data.relations) {
      await tx.knowledgeRelation.create({ data: {
        externalKey: correctionExternalKey(relation.externalKey, importRevision),
        fromTopicId: relation.from.kind === 'TOPIC' ? topicIds.get(relation.from.key) : undefined,
        fromClaimId: relation.from.kind === 'CLAIM' ? claimIds.get(relation.from.key) : undefined,
        toTopicId: relation.to.kind === 'TOPIC' ? topicIds.get(relation.to.key) : undefined,
        toClaimId: relation.to.kind === 'CLAIM' ? claimIds.get(relation.to.key) : undefined,
        relationType: relation.relationType,
        rationale: relation.rationale,
      } })
    }

    await tx.knowledgeAuditEvent.createMany({ data: [
      {
        eventType: 'SOURCE_VERSION_ADDED', entityType: 'KnowledgeSourceVersion', entityId: sourceVersion.id,
        actorUserId: options.actorUserId, actorType: options.actorUserId ? 'PLATFORM_ADMIN' : 'LOCAL_CLI', result: 'SUCCESS',
        metadata: { sourceCode: data.source.code, versionLabel: data.sourceVersion.versionLabel, importRevision, supersedesVersionId: current.id },
      },
      {
        eventType: 'IMPORT_CORRECTION_COMPLETED', entityType: 'KnowledgeSourceVersion', entityId: sourceVersion.id,
        actorUserId: options.actorUserId, actorType: options.actorUserId ? 'PLATFORM_ADMIN' : 'LOCAL_CLI', result: 'SUCCESS',
        metadata: {
          sourceCode: data.source.code,
          importRevision,
          correctionReason: options.correctionReason.trim(),
          previousFingerprint: currentFingerprint,
          contentFingerprint: incomingFingerprint,
          previousSourceMetadata,
          correctedSourceMetadata,
          counts: validation.counts,
        },
      },
    ] })

    return { sourceId: source.id, sourceVersionId: sourceVersion.id, importRevision, counts: validation.counts, reused: false, corrected: true }
  }, { isolationLevel: 'Serializable' })
}
