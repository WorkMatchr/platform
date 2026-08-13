import Link from 'next/link'
import type { ReactNode } from 'react'
import type { AdviceDossierStatus } from '@/generated/prisma/client'
import {
  adviceDossierStatusLabels,
  type AdviceDossierSnapshot,
} from '@/lib/advice-dossiers/advice-dossier-contract'
import { ProfessionalRequirementList } from './professional-requirement-list'

export function AdviceDossierDetail({
  dossierCode,
  createdAt,
  versionNumber,
  status,
  snapshot,
  assignmentIntakeAction,
}: {
  dossierCode: string
  createdAt: Date
  versionNumber: number
  status: AdviceDossierStatus
  snapshot: AdviceDossierSnapshot
  assignmentIntakeAction?: ReactNode
}) {
  return (
    <article className="rounded-card border border-border bg-surface p-5 sm:p-7 lg:p-8">
      <header className="border-b border-border pb-5">
        <p className="text-sm font-semibold text-brand-primary">
          WorkMatchr Adviesdossier
        </p>
        <h1 className="mt-1 break-words text-heading-2 font-bold text-brand-dark">
          {snapshot.subject}
        </h1>
        <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-text-secondary">Dossiercode</dt>
            <dd className="mt-0.5 font-semibold text-brand-dark">
              {dossierCode}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Aangemaakt</dt>
            <dd className="mt-0.5 font-semibold text-brand-dark">
              {new Intl.DateTimeFormat('nl-NL', {
                dateStyle: 'long',
                timeZone: 'UTC',
              }).format(createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Adviesversie</dt>
            <dd className="mt-0.5 font-semibold text-brand-dark">
              {versionNumber}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Status</dt>
            <dd className="mt-0.5 font-semibold text-brand-dark">
              {adviceDossierStatusLabels[status]}
            </dd>
          </div>
        </dl>
      </header>

      <div className="mt-6 space-y-7">
        <section aria-labelledby="dossier-original-request">
          <h2
            id="dossier-original-request"
            className="text-xl font-bold text-brand-dark"
          >
            Oorspronkelijke hulpvraag
          </h2>
          <p className="mt-2 break-words text-text-secondary">
            {snapshot.originalHelpRequest}
          </p>
        </section>

        <section aria-labelledby="dossier-situation">
          <h2
            id="dossier-situation"
            className="text-xl font-bold text-brand-dark"
          >
            Dit begrijpen wij van uw situatie
          </h2>
          <p className="mt-2 text-text-secondary">
            {snapshot.situationSummary}
          </p>
          {snapshot.uncertainties.length > 0 && (
            <div className="mt-4 rounded-control border border-warning-border bg-warning-subtle p-4">
              <h3 className="font-semibold text-brand-dark">
                Nog niet volledig duidelijk
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                {snapshot.uncertainties.map((uncertainty) => (
                  <li key={uncertainty}>{uncertainty}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="dossier-advice">
          <p className="text-sm font-semibold text-brand-primary">
            Ons advies
          </p>
          <h2
            id="dossier-advice"
            className="mt-1 text-xl font-bold text-brand-dark"
          >
            {snapshot.adviceTitle}
          </h2>
          <p className="mt-2 text-text-secondary">
            {snapshot.adviceBody}
          </p>
        </section>

        <section aria-labelledby="dossier-reasons">
          <h2
            id="dossier-reasons"
            className="text-xl font-bold text-brand-dark"
          >
            Waarom adviseren wij dit?
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-text-secondary">
            {snapshot.adviceReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="dossier-self-actions">
          <h2
            id="dossier-self-actions"
            className="text-xl font-bold text-brand-dark"
          >
            Wat kunt u zelf al doen?
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-text-secondary">
            {snapshot.selfActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="dossier-expertise">
          <h2
            id="dossier-expertise"
            className="text-xl font-bold text-brand-dark"
          >
            Aanbevolen deskundigheid
          </h2>
          <ProfessionalRequirementList
            primary={snapshot.primaryProfessionalRequirement}
            additional={snapshot.additionalProfessionalRequirements}
            possible={snapshot.possibleProfessionalRequirements}
          />
        </section>

        <section aria-labelledby="dossier-knowledge">
          <h2
            id="dossier-knowledge"
            className="text-xl font-bold text-brand-dark"
          >
            Relevante kennis en bronnen
          </h2>
          {snapshot.knowledgeReferences.length > 0 ? (
            <ul className="mt-2 space-y-3">
              {snapshot.knowledgeReferences.map((reference) => (
                <li key={reference.id}>
                  <Link
                    href={reference.href}
                    className="font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {reference.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {reference.summary}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-text-secondary">
              Er is nog geen specifieke kennisverwijzing beschikbaar.
            </p>
          )}
          {snapshot.sourceReferences.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {snapshot.sourceReferences.map((source) => (
                <li key={source.id}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-primary underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {source.title} ({source.publisher})
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="dossier-next-steps">
          <h2
            id="dossier-next-steps"
            className="text-xl font-bold text-brand-dark"
          >
            Mogelijke vervolgstappen
          </h2>
          <p className="mt-2 text-text-secondary">
            Gebruik dit advies om uw situatie verder te beoordelen.
            Wanneer u professionele ondersteuning overweegt, kan de
            genoemde deskundigheid helpen om de vraag gericht te
            bespreken.
          </p>
          {assignmentIntakeAction && (
            <div className="mt-5 rounded-control border border-border bg-page px-4 py-5">
              <h3 className="text-lg font-bold text-brand-dark">
                Professionele ondersteuning nodig?
              </h3>
              <p className="mt-2 text-text-secondary">
                Maak van dit advies een opdracht. De informatie uit uw
                Adviesdossier nemen we alvast mee, zodat u niet opnieuw
                hoeft te beginnen.
              </p>
              {assignmentIntakeAction}
            </div>
          )}
        </section>
      </div>

      <p className="mt-7 border-t border-border pt-5 text-xs leading-relaxed text-text-secondary">
        {snapshot.disclaimer}
      </p>
    </article>
  )
}
