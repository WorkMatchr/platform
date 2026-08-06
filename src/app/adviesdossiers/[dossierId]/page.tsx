import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AdviceDossierDetail } from '@/components/advice-dossiers/advice-dossier-detail'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { getAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import {
  AdviceDossierError,
  getAdviceDossier,
} from '@/lib/advice-dossiers/advice-dossier-service'
import { changeAdviceDossierStatusAction } from '../actions'

export const metadata: Metadata = {
  title: 'WorkMatchr Adviesdossier',
  robots: { index: false, follow: false },
}

export default async function AdviceDossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ dossierId: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { dossierId } = await params
  const query = await searchParams
  const viewer = await getAdviceDossierViewer(
    `/adviesdossiers/${dossierId}`,
  )
  let dossier
  try {
    dossier = await getAdviceDossier(viewer, dossierId)
  } catch (error) {
    if (
      error instanceof AdviceDossierError &&
      error.code === 'NOT_FOUND'
    ) {
      notFound()
    }
    throw error
  }

  return (
    <Section spacing="compact">
      <Container size="narrow">
        {query.status === 'gewijzigd' && (
          <p
            role="status"
            className="mb-5 rounded-control border border-success-border bg-success-subtle px-4 py-3 text-sm"
          >
            De dossierstatus is bijgewerkt.
          </p>
        )}
        <div className="mb-5 flex flex-wrap gap-3">
          <LinkButton href="/adviesdossiers" variant="outline">
            Terug naar adviesdossiers
          </LinkButton>
          <LinkButton
            href={`/adviesdossiers/${dossier.id}/pdf`}
            prefetch={false}
          >
            Download als PDF
          </LinkButton>
        </div>

        <AdviceDossierDetail
          dossierCode={dossier.dossierCode}
          createdAt={dossier.createdAt}
          versionNumber={dossier.currentVersionNumber}
          status={dossier.status}
          snapshot={dossier.currentVersion.snapshot}
        />

        {dossier.status === 'COMPLETED' &&
          viewer.userId === dossier.ownerUserId &&
          dossier.currentVersion.snapshot.primaryProfessionalRequirement && (
          <div className="mt-5 rounded-card border border-border bg-surface p-5">
            <h2 className="text-xl font-bold text-brand-dark">
              {dossier.request ? 'Gekoppelde opdracht' : 'Maak hiervan een opdracht'}
            </h2>
            <p className="mt-2 text-text-secondary">
              {dossier.request
                ? `Deze opdracht is al gekoppeld aan adviesdossier ${dossier.dossierCode}.`
                : 'Zet de uitkomst van dit adviesdossier om in een opdracht en ontvang reacties van passende professionals.'}
            </p>
            <LinkButton
              href={dossier.request
                ? `/aanvragen/${dossier.request.id}/gepubliceerd`
                : `/aanvragen/nieuw?dossierId=${dossier.id}`}
              className="mt-4"
            >
              {dossier.request ? 'Bekijk gekoppelde opdracht' : 'Maak hiervan een opdracht'}
            </LinkButton>
          </div>
        )}

        {dossier.status === 'ADVICE_READY' && (
          <div className="mt-5 flex flex-wrap gap-3 rounded-card border border-border bg-surface p-4">
            <form
              action={changeAdviceDossierStatusAction.bind(
                null,
                dossier.id,
                'COMPLETED',
              )}
            >
              <Button type="submit" variant="outline">
                Markeer als afgerond
              </Button>
            </form>
            <form
              action={changeAdviceDossierStatusAction.bind(
                null,
                dossier.id,
                'ARCHIVED',
              )}
            >
              <Button type="submit" variant="ghost">
                Archiveer
              </Button>
            </form>
          </div>
        )}
      </Container>
    </Section>
  )
}
