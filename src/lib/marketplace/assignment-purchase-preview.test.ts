import { describe, expect, it } from 'vitest'
import { assignmentInvitationCopy, toAssignmentPreview } from './assignment-purchase-preview'

describe('AssignmentPreview', () => {
  it('laat uitsluitend de gecontroleerde basisinformatie door', () => {
    const preview = toAssignmentPreview({
      id: 'assignment-1', title: 'Onderzoek naar fysieke belasting', primarySpecialism: { name: 'Ergonomie' },
      sector: { name: 'Logistiek' }, employeeCount: 80, desiredStartDate: new Date('2026-09-01'),
      responseDeadline: new Date('2026-08-25'), locationCity: 'Utrecht', locationProvince: 'Utrecht',
      locationRegion: 'Midden-Nederland', locationCount: 2, allowsRemoteWork: false, maxSelections: 3,
    })
    expect(preview).toMatchObject({ safeSummary: 'Onderzoek naar fysieke belasting', expertise: 'Ergonomie', region: 'Midden-Nederland', priceCredits: 25, maximumPurchasers: 3 })
    expect(preview).not.toHaveProperty('description')
    expect(preview).not.toHaveProperty('clientOrganization')
    expect(preview).not.toHaveProperty('locationAddressLine')
    expect(assignmentInvitationCopy(preview)).toMatchObject({ cta: 'Bekijk opdracht en beslis' })
  })
})
