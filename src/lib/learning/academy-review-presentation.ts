export const academyReviewKinds: Record<string, string> = {
  CERTIFICATE_NAME: 'Naamcorrectie certificaat', CERTIFICATE_ERROR: 'Certificaatfout',
  FRAUD: 'Melding van fraude', EXAM_QUESTION: 'Bezwaar tegen examenvraag',
  EXAM_SCORE: 'Bezwaar tegen examenresultaat', PRIVACY: 'Privacyverzoek',
}
export const academyReviewActions: Record<string, string> = {
  REQUESTED: 'Aangevraagd', RECEIVED: 'Ontvangst bevestigd', UPDATE: 'Statusupdate',
  ACCEPTED: 'Geaccepteerd', REJECTED: 'Afgewezen', REVOKED: 'Certificaat ingetrokken',
}
export const isAcademyReviewClosed = (action: string) => ['ACCEPTED', 'REJECTED', 'REVOKED'].includes(action)
