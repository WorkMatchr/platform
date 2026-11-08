import type { Prisma } from '@/generated/prisma/client'
import { z } from 'zod'

export const subjectField = {
  CAPABILITY: 'capabilityRevisionId',
  SECTOR_EXPERIENCE: 'sectorExperienceRevisionId',
  WORK_AREA: 'workAreaRevisionId',
  PROFESSIONAL_QUALIFICATION: 'professionalQualificationRevisionId',
  ORGANIZATION_QUALIFICATION: 'organizationQualificationRevisionId',
  INSURANCE: 'insuranceRevisionId',
  EVIDENCE: 'evidenceRevisionId',
} as const

export type SubjectType = keyof typeof subjectField
const deliveryLabels: Record<string, string> = { REMOTE: 'Op afstand', HYBRID: 'Hybride', ON_SITE: 'Op locatie' }
const revision = z.object({
  id: z.uuid(), version: z.number(), serviceTermId: z.string().nullish(), specialismTermId: z.string().nullish(),
  sectorTermId: z.string().nullish(), regionTermId: z.string().nullish(), qualificationTermId: z.string().nullish(),
  insuranceTypeTermId: z.string().nullish(), evidenceRevisionId: z.string().nullish(), expiresAt: z.string().nullish(),
  validUntil: z.string().nullish(), validFrom: z.string().nullish(), effectiveFrom: z.string().nullish(),
  issuedAt: z.string().nullish(), insurer: z.string().nullish(), issuer: z.string().nullish(),
  policyReference: z.string().nullish(), coverageAmountCents: z.string().nullish(), coverageGeography: z.string().nullish(),
  registrationNumber: z.string().nullish(), sha256: z.string().optional(),
  deliveryModes: z.array(z.string()).optional(), experienceYears: z.number().nullish(),
  mimeType: z.string().optional(), sizeBytes: z.number().optional(),
})
const dossier = z.object({
  capabilities: z.array(revision), sectorExperiences: z.array(revision), workAreas: z.array(revision),
  organizationQualifications: z.array(revision), insurances: z.array(revision), evidence: z.array(revision),
  professionals: z.array(z.object({ qualifications: z.array(revision) })),
})

export function verificationSubjects(payload: Prisma.JsonValue) {
  const snapshot = dossier.parse(payload)
  function items(type: SubjectType, label: string, rows: z.infer<typeof revision>[]) {
    return rows.map(row => ({
      type, label, id: row.id, version: row.version,
      terms: [row.serviceTermId, row.specialismTermId, row.sectorTermId, row.regionTermId, row.qualificationTermId, row.insuranceTypeTermId].filter((v): v is string => !!v),
      details: [row.insurer, row.issuer, row.policyReference && `Polis ${row.policyReference}`,
        row.registrationNumber && `Registratie ${row.registrationNumber}`,
        row.coverageAmountCents && `Dekking ${row.coverageAmountCents} cent`, row.coverageGeography, row.deliveryModes?.map(mode => deliveryLabels[mode] ?? mode).join(', '), row.mimeType,
        row.sizeBytes === undefined ? null : `${row.sizeBytes} bytes`,
        row.experienceYears == null ? null : `${row.experienceYears} jaar ervaring`].filter(Boolean).join(' · '),
      validFrom: row.effectiveFrom ?? row.validFrom ?? row.issuedAt,
      validUntil: row.expiresAt ?? row.validUntil,
      evidenceHash: row.sha256 ?? snapshot.evidence.find(e => e.id === row.evidenceRevisionId)?.sha256,
      missingEvidence: !!row.evidenceRevisionId && !snapshot.evidence.some(e => e.id === row.evidenceRevisionId),
    }))
  }
  return [
    ...items('CAPABILITY', 'Dienst', snapshot.capabilities), ...items('WORK_AREA', 'Werkgebied', snapshot.workAreas),
    ...items('SECTOR_EXPERIENCE', 'Sectorervaring', snapshot.sectorExperiences),
    ...items('PROFESSIONAL_QUALIFICATION', 'Beroepskwalificatie', snapshot.professionals.flatMap(p => p.qualifications)),
    ...items('ORGANIZATION_QUALIFICATION', 'Organisatiekwalificatie', snapshot.organizationQualifications),
    ...items('INSURANCE', 'Verzekering', snapshot.insurances), ...items('EVIDENCE', 'Bewijsstuk', snapshot.evidence),
  ]
}
