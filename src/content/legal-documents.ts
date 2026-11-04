/** Shared placeholder copy; replace only after the definitive legal documents are approved. */
export const legalDocuments = {
  terms: {
    title: 'Algemene voorwaarden',
    heading: 'De algemene voorwaarden worden voorbereid',
    intro: 'Hier leest u straks welke afspraken gelden voor het gebruik van WorkMatchr en de dienstverlening via het platform.',
    notice: 'De definitieve algemene voorwaarden zijn nog niet gepubliceerd. Deze pagina bevat daarom nog geen juridisch geldende voorwaarden.',
  },
  privacy: {
    title: 'Privacyverklaring',
    heading: 'De privacyverklaring wordt voorbereid',
    intro: 'Hier leest u straks welke persoonsgegevens WorkMatchr verwerkt, waarom dat nodig is en welke rechten u heeft.',
    notice: 'De definitieve privacyverklaring is nog niet gepubliceerd. WorkMatchr verwerkt voor een persoonlijk account alleen de gegevens die nodig zijn om het account veilig te gebruiken.',
  },
} as const

export type LegalDocumentKey = keyof typeof legalDocuments

/** Version of the actually displayed placeholder; never evidence of approved terms. */
export const REGISTRATION_LEGAL_VERSION = 'PLATFORM-PLACEHOLDER-2026-10-30'
