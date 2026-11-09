import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import type { PrismaClient } from '../../src/generated/prisma/client'
import { ensureProviderServiceCatalog } from '../../prisma/provider-service-catalog'
import { scopeReference } from '../../src/lib/marketplace/assignment-scope'
export async function syntheticSafetyScope(db: PrismaClient) {
  const u = new URL(process.env.DATABASE_URL!)
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname))
  const [identity] = await db.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`
  assert.equal('/' + identity.name, u.pathname)
  assert.match(identity.name, /^workmatchr_(notifications_test|marketplace_concurrency)_\d+_\d+$/)
  await ensureProviderServiceCatalog(db, true)
  const service = await db.providerTaxonomyTerm.findFirstOrThrow({
    where: {
      code: 'SAFETY_ADVICE',
      version: { status: 'PUBLISHED', version: 2, taxonomy: { kind: 'SERVICE' } },
    },
  })
  const checksum = (s: string) => createHash('sha256').update(s).digest('hex')
  const ref = await db.providerTaxonomy.create({
    data: {
      kind: 'QUALIFICATION',
      code: 'QUALIFICATION',
      name: 'Kwalificatie',
      versions: {
        create: {
          version: 1,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          checksum: checksum(scopeReference),
          terms: { create: { code: 'STANDARD_SERVICE_SCOPE', label: scopeReference, sortOrder: 0 } },
        },
      },
    },
    include: { versions: { include: { terms: true } } },
  })
  const config = await db.providerCapabilityRequirementConfig.create({
    data: { version: 1, effectiveFrom: new Date(Date.now() - 60000) },
  })
  await db.providerCapabilityQualificationRequirement.create({
    data: {
      configId: config.id,
      serviceTermId: service.id,
      requirementTermId: ref.versions[0].terms[0].id,
      kind: 'QUALIFICATION',
      isRequired: false,
      minimumVerification: 'SELF_DECLARED',
      requiresValidity: false,
    },
  })
  await db.providerCapabilityRequirementConfig.update({
    where: { id: config.id },
    data: { status: 'PUBLISHED', publishedAt: new Date(), checksum: checksum(scopeReference + service.code) },
  })
  const slug = 'hogere-veiligheidskundige',
    other = 'middelbare-veiligheidskundige'
  const spec = await db.specialism.upsert({
    where: { slug },
    create: { slug, name: 'Hogere veiligheidskundige' },
    update: {},
  })
  const tax = await db.providerTaxonomy.upsert({
    where: { kind: 'SPECIALISM' },
    create: { kind: 'SPECIALISM', code: 'SPECIALISM', name: 'Specialisme' },
    update: {},
  })
  let version = await db.providerTaxonomyVersion.findFirst({
    where: { taxonomyId: tax.id, status: 'PUBLISHED' },
  })
  if (!version)
    version = await db.providerTaxonomyVersion.create({
      data: {
        taxonomyId: tax.id,
        version: 1,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        checksum: checksum(slug),
        terms: {
          create: [
            { code: slug, label: 'Hogere veiligheidskundige', sortOrder: 1 },
            { code: other, label: 'Middelbare veiligheidskundige', sortOrder: 2 },
          ],
        },
      },
    })
  const term = await db.providerTaxonomyTerm.findUniqueOrThrow({
    where: { versionId_code: { versionId: version.id, code: slug } },
  })
  const second = await db.providerTaxonomyTerm.findUniqueOrThrow({
    where: { versionId_code: { versionId: version.id, code: other } },
  })
  await db.providerSpecialismTaxonomyMap.upsert({
    where: { specialismId: spec.id },
    update: {},
    create: { termId: term.id, specialismId: spec.id },
  })
  return {
    serviceTermId: service.id,
    specialismTermId: term.id,
    additionalTermId: second.id,
    configId: config.id,
    specialismId: spec.id,
  }
}
