// Voorlopige juridische contactgegevens voor conceptverklaringen, niet voor facturatie.
// Wijzig historische factuur-/verkoperssnapshots nooit via deze configuratie.
export const legalIdentityDraft = {
  legalName: 'Feenstra Safety Consulting',
  tradeName: 'WorkMatchr',
  chamberOfCommerceNumber: '57788863',
  correspondenceAddress: 'Kennemerland 71, 9405 LC Assen',
  privacyEmail: 'contact@workmatchr.nl',
  privacyContactStatus: 'PRODUCT_OWNER_CONFIRMED',
  status: 'TO_BE_CONFIRMED',
  releaseRequirement: 'Vóór livegang: vervang het huidige correspondentieadres door het nog vast te stellen postadres in Zwolle en laat alle bedrijfsgegevens expliciet door de Product Owner bevestigen.',
} as const

// PO-bevestigde route, geen runtimeconfiguratie of technisch mailboxbewijs.
export const privacyMailbox = {
  forwardingProvider: 'Vimexx',
  type: 'AUTOMATIC_FORWARDER',
  destination: 'info@workmatchr.nl',
  mailboxProvider: 'Vimexx',
  configurationEvidence: 'PRODUCT_OWNER_CONFIRMED',
  technicalVerification: 'PENDING',
} as const
