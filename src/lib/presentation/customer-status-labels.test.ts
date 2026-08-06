import { describe, expect, it } from 'vitest'
import { assignmentStatusLabels, presentAssignmentStatus } from '@/lib/assignments/assignment-presentation'
import {
  presentInvitationStatus,
  presentMatchConfidence,
  presentQuoteStatus,
} from '@/lib/marketplace/marketplace-presentation'
import { presentProviderPermission, presentProviderReviewStatus } from '@/lib/providers/provider-dossier-presentation'

describe('klantgerichte statuspresentatie', () => {
  it('presenteert alle opdrachtstatussen in het Nederlands', () => {
    expect(assignmentStatusLabels).toEqual(expect.objectContaining({
      DRAFT: 'Nog invullen',
      MATCHING: 'Professionals worden geselecteerd',
      IN_SELECTION: 'Offertes vergelijken',
      OPEN: 'Gepubliceerd',
    }))
  })

  it('toont onverwachte waarden nooit als ruwe statuscode', () => {
    expect(presentAssignmentStatus('UNEXPECTED_STATUS')).toBe('Status niet beschikbaar')
    expect(presentInvitationStatus('UNEXPECTED_STATUS')).toBe('Status niet beschikbaar')
    expect(presentQuoteStatus('UNEXPECTED_STATUS')).toBe('Status niet beschikbaar')
    expect(presentProviderReviewStatus('UNEXPECTED_STATUS')).toBe('Status niet beschikbaar')
    expect(presentProviderPermission('UNEXPECTED_PERMISSION')).toBe('Bevoegdheid niet beschikbaar')
    expect(presentMatchConfidence('UNEXPECTED_CONFIDENCE')).toBe('Niet vastgesteld')
  })
})
