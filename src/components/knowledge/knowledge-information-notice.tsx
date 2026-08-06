import Link from 'next/link'

export const generalProfessionalInformationText = 'Deze informatie beschrijft algemene wettelijke kaders, risico’s en aandachtspunten. Welke maatregelen in uw situatie passend en doeltreffend zijn, hangt af van onder meer de werkzaamheden, locatie, organisatie en aanwezige risico’s. Laat uw concrete situatie beoordelen door een deskundige professional.'

export const knowledgeImprovementPromptText = 'Bent u professional en ziet u verouderde, onvolledige of onjuiste informatie? Meld dit bij WorkMatchr. Vermeld bij voorkeur de relevante bron en uw toelichting.'

export function KnowledgeInformationNotice({
  reportHref,
  developmentTestMode = false,
}: {
  reportHref?: `/kenniscentrum/verbetering-melden/${string}`
  developmentTestMode?: boolean
}) {
  return (
    <aside className="grid gap-5 rounded-card border border-border bg-surface-subtle p-5" aria-label="Toelichting bij deze vakinformatie">
      <section aria-labelledby="general-professional-information-title">
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-dark" id="general-professional-information-title">Algemene vakinformatie</h2>
        <p className="mt-2 leading-6 text-text-secondary">{generalProfessionalInformationText}</p>
      </section>
      <section aria-labelledby="knowledge-improvement-title">
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-dark" id="knowledge-improvement-title">Onjuistheid of wijziging melden</h2>
        <p className="mt-2 leading-6 text-text-secondary">{knowledgeImprovementPromptText}</p>
        {developmentTestMode ? (
          <p className="mt-2 text-sm font-semibold text-status-warning" role="status">
            Developmenttest: de melding wordt gekoppeld aan een intern, nog niet gepubliceerd kennisitem.
          </p>
        ) : null}
        {reportHref ? (
          <Link className="mt-3 inline-flex min-h-10 items-center rounded-control font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary" href={reportHref}>
            Verbetering melden
          </Link>
        ) : null}
      </section>
    </aside>
  )
}
