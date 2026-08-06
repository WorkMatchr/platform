import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import {
  adviceDossierStatusLabels,
} from '@/lib/advice-dossiers/advice-dossier-contract'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import { listAdviceDossiers } from '@/lib/advice-dossiers/advice-dossier-service'

export const metadata: Metadata = {
  title: 'Adviesdossiers | WorkMatchr',
  robots: { index: false, follow: false },
}
export default async function AdviceDossiersPage() {
  const viewer = await requireClientAdviceDossierViewer()
  const dossiers = await listAdviceDossiers(viewer)

  return (
    <Section spacing="compact">
      <Container>
        <div className="max-w-5xl">
          <p className="text-sm font-semibold text-brand-primary">
            Uw account
          </p>
          <h1 className="mt-1 text-heading-2 font-bold text-brand-dark">
            Adviesdossiers
          </h1>
          <p className="mt-2 max-w-3xl text-text-secondary">
            Hier vindt u de vastgelegde adviezen bij uw afgeronde
            hulpvragen. Iedere adviesversie blijft ongewijzigd
            beschikbaar.
          </p>
        </div>

        {dossiers.length === 0 ? (
          <div className="mt-7 rounded-card border border-border bg-surface p-6">
            <h2 className="text-xl font-bold text-brand-dark">
              Nog geen adviesdossiers
            </h2>
            <p className="mt-2 text-text-secondary">
              Zodra u een hulpvraag via de Advieswijzer afrondt, vindt u
              het bijbehorende Adviesdossier hier terug.
            </p>
            <Link
              href="/advieswijzer"
              className="mt-4 inline-flex min-h-11 items-center rounded-control bg-brand-primary px-5 py-2.5 text-sm font-semibold text-text-on-dark hover:bg-brand-primary-hover"
            >
              Start de Advieswijzer
            </Link>
          </div>
        ) : (
          <ul className="mt-7 divide-y divide-border rounded-card border border-border bg-surface">
            {dossiers.map((dossier) => (
              <li
                key={dossier.id}
                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-brand-primary">
                    {dossier.dossierCode}
                  </p>
                  <h2 className="mt-0.5 font-bold text-brand-dark">
                    {dossier.subject}
                  </h2>
                  <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-secondary">
                    <div className="flex gap-1">
                      <dt className="sr-only">Deskundigheid</dt>
                      <dd>
                        {dossier.primaryProfessionalLabel ??
                          'Nog geen specifieke deskundigheid'}
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="sr-only">Aanmaakdatum</dt>
                      <dd>
                        {new Intl.DateTimeFormat('nl-NL', {
                          dateStyle: 'medium',
                          timeZone: 'UTC',
                        }).format(dossier.createdAt)}
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="sr-only">Status</dt>
                      <dd>{adviceDossierStatusLabels[dossier.status]}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="sr-only">Adviesversie</dt>
                      <dd>Versie {dossier.currentVersionNumber}</dd>
                    </div>
                  </dl>
                </div>
                <Link
                  href={`/adviesdossiers/${dossier.id}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-control border border-border px-4 py-2 text-sm font-semibold text-brand-dark hover:border-brand-primary hover:bg-brand-primary-subtle"
                >
                  Bekijken
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
