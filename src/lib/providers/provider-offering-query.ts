import { getPrisma } from '@/lib/prisma'
import { requireProviderViewer } from './provider-authorization'
import { getProviderEditableSections } from './provider-dossier-access'
import { providerVerificationLabels } from './provider-dossier-presentation'
import { ProviderServiceError } from './provider-errors'
import { catalogRow, type Offering, type OfferingRow } from './provider-offering'

export async function getProviderOffering(userId: string, profileId: string): Promise<Offering> {
  return getPrisma().$transaction(async tx => {
    const profile = await requireProviderViewer(tx, userId, profileId)
    const manager = profile.membershipRole === 'OWNER' || profile.membershipRole === 'ADMIN'
    const sections = manager ? await getProviderEditableSections(tx, profileId) : []
    const where = { providerProfileId: profileId, status: manager ? undefined : 'ACTIVE' as const }
    const latest = { take: 1, orderBy: { version: 'desc' as const } }
    const terms = await tx.providerTaxonomyTerm.findMany({
      where: { isActive: true, version: { status: 'PUBLISHED', taxonomy: { kind: { in: ['SECTOR', 'SERVICE', 'SPECIALISM', 'REGION'] } } } },
      select: { id: true, label: true, version: { select: { taxonomy: { select: { kind: true } } } } },
      orderBy: [{ label: 'asc' }, { id: 'asc' }],
    })
    const options = (kind: string) => terms.filter(t => t.version.taxonomy.kind === kind).map(({ id, label }) => ({ id, label }))
    const sectors = options('SECTOR'), services = options('SERVICE'), areas = options('REGION')
    const rows: OfferingRow[] = []
    const experience = await tx.providerSectorExperience.findMany({ where, orderBy: { id: 'asc' },
      include: { revisions: { ...latest, include: { sectorTerm: true } } } })
    for (const record of experience) {
      const revision = record.revisions[0]
      if (!revision) throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')
      rows.push({ ...catalogRow('sector', revision.sectorTerm), key: record.id, recordId: record.id,
        selected: record.status === 'ACTIVE', years: revision.experienceYears,
        verification: providerVerificationLabels[revision.verificationLevel] })
    }
    const capabilities = await tx.providerCapability.findMany({ where, orderBy: { id: 'asc' },
      include: { revisions: { ...latest, include: { serviceTerm: true, specialismTerm: true, competencyTerm: true } } } })
    for (const record of capabilities) {
      const revision = record.revisions[0]
      if (!revision) throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')
      rows.push({ key: record.id, recordId: record.id, kind: 'service', termId: revision.serviceTermId,
        label: revision.serviceTerm?.label ?? revision.specialismTerm?.label ?? revision.competencyTerm?.label ?? 'Bestaande dienstverlening',
        selected: record.status === 'ACTIVE', specialismId: revision.specialismTermId,
        specialismLabel: revision.specialismTerm?.label, modes: revision.deliveryModes, years: null,
        verification: providerVerificationLabels[revision.verificationLevel] })
    }
    const workAreas = await tx.providerWorkArea.findMany({ where, orderBy: { id: 'asc' },
      include: { revisions: { ...latest, include: { regionTerm: true } } } })
    for (const record of workAreas) {
      const revision = record.revisions[0]
      if (!revision) throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')
      rows.push({ ...catalogRow('area', revision.regionTerm), key: record.id, recordId: record.id,
        selected: record.status === 'ACTIVE', years: revision.maxTravelDistanceKm,
        verification: providerVerificationLabels[revision.verificationLevel] })
    }
    for (const [kind, choices] of [['sector', sectors], ['service', services], ['area', areas]] as const) {
      for (const option of choices) {
        if (!rows.some(row => row.kind === kind && row.termId === option.id)) rows.push(catalogRow(kind, option))
      }
    }
    return { profileId, version: profile.version, editSectors: sections.includes('SECTOR_EXPERIENCE'),
      editServices: sections.includes('CAPABILITIES'), editArea: sections.includes('WORK_AREA'), sectors, services, areas, specialisms: options('SPECIALISM'), rows }
  }, { isolationLevel: 'RepeatableRead' })
}
