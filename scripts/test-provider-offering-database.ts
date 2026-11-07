import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { verifyProviderMarketplaceOnboarding } from './verify-provider-marketplace-onboarding'
import { getPrisma } from '../src/lib/prisma'
import { ensureProviderServiceCatalog } from '../prisma/provider-service-catalog'
import { getProviderOffering } from '../src/lib/providers/provider-offering-query'
import { offeringChanges } from '../src/lib/providers/provider-offering'
import { saveProviderOffering } from '../src/lib/providers/provider-offering-service'

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '')
  assert.equal(url.hostname, '127.0.0.1')
  assert.match(url.pathname, /^\/workmatchr_b4_[a-f0-9]{12}$/)
  assert.equal(url.search, '')
  const db = getPrisma()
  try {
    const identity = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`
    assert.equal(identity[0].name, url.pathname.slice(1))
    assert.equal(await db.user.count(), 0)
    const org = await db.organization.create({ data: { name: 'B4 test', organizationType: 'PROVIDER', status: 'ACTIVE', providerProfile: { create: {} } }, include: { providerProfile: true } })
    const other = await db.organization.create({ data: { name: 'B4 tweede test', organizationType: 'PROVIDER', status: 'ACTIVE', providerProfile: { create: {} } }, include: { providerProfile: true } })
    const profile = org.providerProfile!.id
    async function user(name: string, role: 'OWNER' | 'ADMIN' | 'MEMBER', organizationId = org.id) {
      return db.user.create({ data: { email: name + '@example.invalid', status: 'ACTIVE', accountType: 'PROFESSIONAL',
        emailVerified: true, memberships: { create: { organizationId, role, status: 'ACTIVE' } } } })
    }
    const owner = await user('b4-owner', 'OWNER'), admin = await user('b4-admin', 'ADMIN')
    const member = await user('b4-member', 'MEMBER'), outsider = await user('b4-other', 'OWNER', other.id)
    async function option(kind: 'SPECIALISM' | 'SECTOR' | 'COMPETENCY' | 'REGION' | 'INSURANCE_TYPE' | 'QUALIFICATION', suffix = '') {
      const taxonomy = await db.providerTaxonomy.upsert({ where: { kind }, create: { kind, code: kind, name: kind }, update: {} })
      const version = await db.providerTaxonomyVersion.findFirst({ where: { taxonomyId: taxonomy.id, status: 'PUBLISHED' } }) ??
        await db.providerTaxonomyVersion.create({ data: { taxonomyId: taxonomy.id, version: 1, status: 'PUBLISHED', publishedAt: new Date(),
          checksum: createHash('sha256').update(JSON.stringify([['B4_' + kind, 'Test ' + kind]])).digest('hex') } })
      return db.providerTaxonomyTerm.create({ data: { code: 'B4_' + kind + suffix, label: 'Test ' + kind + suffix, versionId: version.id, sortOrder: suffix ? 1001 : 1000 } })
    }
    const spec = await option('SPECIALISM'), sector = await option('SECTOR'), competency = await option('COMPETENCY')
    const extraSector = await option('SECTOR', '_TWEE')
    const region = await option('REGION')
    await option('SPECIALISM', '_TWEE')
    await db.providerProfileCoreExpertise.create({ data: { providerProfileId: profile, taxonomyTermId: spec.id, position: 1 } })
    const until = new Date('2090-06-01T00:00:00Z')
    const legacy = await db.providerCapability.create({ data: { providerProfileId: profile, revisions: { create: {
      specialismTermId: spec.id, competencyTermId: competency.id, version: 1, deliveryModes: ['HYBRID'],
      verificationLevel: 'VERIFIED', validUntil: until,
    } } } })
    const read = () => getProviderOffering(owner.id, profile)
    assert.equal((await read()).services.length, 0)
    assert.equal(await ensureProviderServiceCatalog(db), 'MISSING')
    const emptyCatalog = await db.providerTaxonomy.create({ data: { kind: 'SERVICE', code: 'SERVICE', name: 'Testcatalogus' } })
    await assert.rejects(ensureProviderServiceCatalog(db, true), /Afwijkende dienstencatalogus/)
    assert.equal(await db.providerTaxonomyVersion.count({ where: { taxonomyId: emptyCatalog.id } }), 0)
    await db.providerTaxonomy.delete({ where: { id: emptyCatalog.id } })
    assert.equal(await ensureProviderServiceCatalog(db, true), 'CREATED')
    assert.equal(await ensureProviderServiceCatalog(db), 'ALREADY_PRESENT')
    const snapshot = await read()
    assert.equal(snapshot.services.length, 19)
    const before = snapshot.rows.find(row => row.recordId === legacy.id)!
    assert.equal(before.specialismId, spec.id)
    assert.equal(before.termId, null)
    assert.equal(before.verification, 'Geverifieerd')
    const selectedSector = { ...snapshot.rows.find(row => row.termId === sector.id)!, selected: true, years: 0 }
    const service = { ...snapshot.rows.find(row => !row.recordId && row.kind === 'service')!, selected: true, modes: ['REMOTE' as const] }
    const secondService = snapshot.services.find(term => term.id !== service.termId)!
    const changes = offeringChanges(snapshot.rows, [selectedSector, service, { ...before, termId: secondService.id }])
    const selectedSecondSector = { ...snapshot.rows.find(row => row.termId === extraSector.id)!, selected: true, years: 7 }
    changes.push(...offeringChanges(snapshot.rows, [selectedSecondSector]))
    const selectedArea = { ...snapshot.rows.find(row => row.kind === 'area' && row.termId === region.id)!, selected: true, years: 100 }
    changes.push(...offeringChanges(snapshot.rows, [selectedArea]))
    const input = { version: snapshot.version, changes }
    await assert.rejects(saveProviderOffering(owner.id, profile, { ...input,
      changes: offeringChanges(snapshot.rows, [{ ...before, specialismId: null }]),
    }), { code: 'VALIDATION_ERROR' })
    await assert.rejects(getProviderOffering(outsider.id, profile), { code: 'ACCESS_DENIED' })
    await assert.rejects(saveProviderOffering(outsider.id, profile, input), { code: 'ACCESS_DENIED' })
    await assert.rejects(saveProviderOffering(member.id, profile, input), { code: 'ACCESS_DENIED' })
    await assert.rejects(saveProviderOffering(owner.id, profile, { ...input, changes: [changes[0], { ...changes[1], termId: sector.id }] }), { code: 'VALIDATION_ERROR' })
    await assert.rejects(saveProviderOffering(owner.id, profile, { ...input,
      changes: [changes[0], { ...changes[changes.length - 1], termId: sector.id }],
    }), { code: 'VALIDATION_ERROR' })
    assert.equal((await read()).version, snapshot.version)
    assert.equal(await db.providerSectorExperience.count({ where: { providerProfileId: profile } }), 0)
    assert.equal(await db.providerWorkArea.count({ where: { providerProfileId: profile } }), 0)
    const race = await Promise.allSettled([saveProviderOffering(owner.id, profile, input), saveProviderOffering(admin.id, profile, input)])
    assert.equal(race.filter(result => result.status === 'fulfilled').length, 1)
    assert.equal(race.find(result => result.status === 'rejected')?.reason.code, 'CONFLICT')
    const saved = await read()
    assert.equal(saved.version, snapshot.version + 1)
    assert.equal(saved.rows.filter(row => row.selected).length, 5)
    assert.equal(await db.providerWorkArea.count({ where: { providerProfileId: profile } }), 1)
    const savedArea = saved.rows.find(row => row.kind === 'area' && row.termId === region.id)!
    assert.equal(savedArea.years, 100)
    const current = saved.rows.find(row => row.recordId === legacy.id)!
    assert.equal(current.termId, secondService.id)
    const history = await db.providerCapabilityRevision.findMany({ where: { providerCapabilityId: legacy.id }, orderBy: { version: 'asc' } })
    assert.equal(history.length, 2)
    assert.equal(history[0].verificationLevel, 'VERIFIED')
    assert.equal(history[0].serviceTermId, null)
    assert.equal(history[1].verificationLevel, 'SELF_DECLARED')
    assert.equal(history[1].validUntil!.getTime(), until.getTime())
    assert.equal(history[1].competencyTermId, competency.id)
    assert.equal(history[1].specialismTermId, spec.id)
    assert.equal(await db.providerProfileCoreExpertise.count({ where: { providerProfileId: profile, taxonomyTermId: spec.id } }), 1)
    assert.equal(await saveProviderOffering(owner.id, profile, { version: saved.version, changes: [] }), saved.version)
    await assert.rejects(saveProviderOffering(outsider.id, other.providerProfile!.id, { version: 1, changes: [{ ...changes[2], selected: false }] }), { code: 'CONFLICT' })
    await saveProviderOffering(admin.id, profile, { version: saved.version, changes: offeringChanges(saved.rows, [{ ...current, selected: false }]) })
    const archived = await read()
    assert.equal(archived.rows.find(row => row.recordId === legacy.id)?.selected, false)
    assert.equal((await getProviderOffering(member.id, profile)).rows.some(row => row.recordId === legacy.id), false)
    await saveProviderOffering(owner.id, profile, { version: archived.version, changes: offeringChanges(archived.rows, [current]) })
    assert.equal(await db.providerCapabilityRevision.count({ where: { providerCapabilityId: legacy.id } }), 2)
    await db.providerDossierSubmission.create({ data: { providerProfileId: other.providerProfile!.id, submittedByUserId: outsider.id, idempotencyKey: 'synthetic-review' } })
    await assert.rejects(saveProviderOffering(outsider.id, other.providerProfile!.id, { version: 1, changes: [changes[0]] }), { code: 'DOSSIER_LOCKED' })
    const catalogVersion = await db.providerTaxonomyVersion.findFirstOrThrow({ where: { taxonomy: { kind: 'SERVICE' }, version: 2 } })
    await assert.rejects(db.providerTaxonomyTerm.update({ where: { id: secondService.id }, data: { isActive: false } }), /immutable/)
    assert.equal((await read()).rows.find(row => row.recordId === legacy.id)?.termId, secondService.id)
    assert.equal(await db.providerTaxonomyTerm.count({ where: { versionId: catalogVersion.id } }), 19)
    await verifyProviderMarketplaceOnboarding(db, {
      sectorTermId: sector.id, serviceTermId: secondService.id, regionTermId: region.id,
      insuranceTermId: (await option('INSURANCE_TYPE')).id, qualificationTermId: (await option('QUALIFICATION')).id,
      legacyOrganizationId: org.id, legacyProfileId: profile, legacyOwnerId: owner.id, legacyMemberId: member.id,
    })
    console.log('PASS catalogus, sectoren/diensten/werkgebied in één transactie, historie, rollback, concurrency, rollen, tenantisolatie, sectieslot, archiveren en herstellen')
  } finally { await db.$disconnect() }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
