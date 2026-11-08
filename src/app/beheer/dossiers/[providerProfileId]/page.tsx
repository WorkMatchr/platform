import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  manageQualificationAction,
  createProviderFindingAction,
  finalizeProviderReviewAction,
  openProviderReviewAction,
  requestProviderInformationAction,
} from '../actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { requireUser } from '@/lib/authorization'
import { ProviderServiceError } from '@/lib/providers/provider-errors'
import { getProviderReviewDetail, getQualificationManagement } from '@/lib/marketplace/provider-review-query-service'
import {
  providerDossierSectionLabels,
  providerQualificationLabels,
  providerReadinessLabels,
  providerReviewLabels,
  providerSelectabilityLabels,
} from '@/lib/providers/provider-dossier-presentation'

export const metadata: Metadata = { title: 'Dossier beoordelen | WorkMatchr' }

const inputClass = 'min-w-0 max-w-full rounded-control border border-border bg-surface px-4 py-3 font-normal'
const dossierSections = [
  'ORGANIZATION',
  'CAPABILITIES',
  'SECTOR_EXPERIENCE',
  'WORK_AREA',
  'PROFESSIONALS',
  'QUALIFICATIONS',
  'INSURANCE',
  'EVIDENCE',
  'DECLARATIONS',
] as const

export default async function ProviderReviewDetailPage({
  params, searchParams,
}: {
  params: Promise<{ providerProfileId: string }>
  searchParams: Promise<{ kwalificatie?: string }>
}) {
  const { providerProfileId } = await params
  const user = await requireUser(`/beheer/dossiers/${providerProfileId}`)
  const result = await getProviderReviewDetail(user.id, providerProfileId).catch(() => null)
  if (!result?.submission) notFound()

  const { provider, submission, permissions } = result
  if (!submission.currentCandidate) notFound()

  const reviewCase = submission.reviewCases[0] ?? null
  const isReviewer = permissions.includes('PROVIDER_REVIEWER')
  const isApprover = permissions.includes('PROVIDER_APPROVER')

  const management = isApprover && submission.status === 'APPROVED' && reviewCase?.status === 'CLOSED'
    ? await getQualificationManagement(user.id, provider.id).catch(error => {
        if (error instanceof ProviderServiceError && error.code === 'ACCESS_DENIED') return null
        throw error
      }) : null
  const qualificationResult = (await searchParams).kwalificatie
  const feedback: Record<string, string> = {
    besluit: 'Het kwalificatiebesluit is vastgelegd.', selecteerbaar: 'De dienstverlener is nu selecteerbaar.',
    'niet-selecteerbaar': 'Nog niet selecteerbaar. Controleer de kwalificaties van het platform en van alle actieve diensten.',
    DOSSIER_NOT_SUBMITTABLE: 'De goedgekeurde dossierversie is niet meer actueel. Laat de actuele versie indienen en beoordelen.',
    FOUR_EYES_REQUIRED: 'De beoordelaar en de goedkeurder moeten verschillende personen zijn.',
    CONFLICT: 'De gegevens of het eerdere besluit zijn gewijzigd. Controleer de actuele stand.',
    TERMS_NOT_CONFIGURED: 'De vereiste verklaringen zijn nog niet geconfigureerd.',
    INSURANCE_REQUIREMENTS_NOT_CONFIGURED: 'De verzekeringsvereisten zijn nog niet geconfigureerd.',
    QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED: 'Voor de dienst zijn nog geen beoordelingsvereisten gepubliceerd.',
    CONFIGURATION_INCOMPLETE: 'De vereiste verklaringen, verzekeringen of dienstbewijzen zijn nog niet volledig.',
    REQUIREMENTS_NOT_CONFIGURED: 'Een geldige verificatie van de beoordelaar ontbreekt.',
    PROJECTION_NOT_ALLOWED: 'Controleer de verificatie van diensten en werkgebieden voordat u de selectie bijwerkt.',
  }
  const outcomeLabels = { QUALIFIED: 'Gekwalificeerd', RESTORED: 'Hersteld', SUSPENDED: 'Geschorst', REJECTED: 'Afgewezen', EXPIRED: 'Verlopen', CHANGES_REQUESTED: 'Aanvulling gevraagd' }
  return (
    <Section spacing="compact">
      <Heading as="h1" size="h2">Dossier van {provider.organization.name}</Heading>
      <p className="mt-3 text-text-secondary">
        Ingediende dossierversie {submission.currentCandidate.candidateVersion}
      </p>
      <details className="mt-3 text-sm text-text-secondary">
        <summary className="cursor-pointer font-semibold">Technische auditgegevens</summary>
        <p className="mt-2">Controlewaarde: {submission.currentCandidate.sha256.slice(0, 12)}…</p>
      </details>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Status</h2>
          <dl className="mt-4 grid gap-3">
            <div><dt className="font-semibold">Indiening</dt><dd>{providerReviewLabels[submission.status]}</dd></div>
            <div><dt className="font-semibold">Volledigheid</dt><dd>{providerReadinessLabels[provider.readinessStatus]}</dd></div>
            <div><dt className="font-semibold">Kwalificatie</dt><dd>{providerQualificationLabels[provider.platformQualificationStatus]}</dd></div>
            <div><dt className="font-semibold">Selecteerbaarheid</dt><dd>{providerSelectabilityLabels[provider.selectabilityStatus]}</dd></div>
          </dl>
          {isReviewer && submission.status === 'SUBMITTED' ? (
            <form action={openProviderReviewAction} className="mt-6">
              <input type="hidden" name="providerProfileId" value={provider.id} />
              <input type="hidden" name="submissionId" value={submission.id} />
              <input type="hidden" name="expectedVersion" value={submission.version} />
              <Button type="submit">Beoordeling starten</Button>
            </form>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Bevindingen</h2>
          <ul className="mt-4 grid gap-3">
            {reviewCase?.findings.map((finding) => (
              <li key={finding.id} className="rounded-control border border-border p-4">
                <p className="font-semibold">{providerDossierSectionLabels[finding.section]}</p>
                <p className="mt-1 text-sm text-text-secondary">{finding.providerMessage}</p>
              </li>
            ))}
            {!reviewCase?.findings.length ? <li className="text-text-secondary">Nog geen bevindingen.</li> : null}
          </ul>
        </Card>
      </div>

      {isReviewer && reviewCase?.status === 'OPEN' && submission.status === 'UNDER_REVIEW' ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold">Bevinding toevoegen</h2>
            <form action={createProviderFindingAction} className="mt-4 grid gap-4">
              <input type="hidden" name="providerProfileId" value={provider.id} />
              <input type="hidden" name="reviewCaseId" value={reviewCase.id} />
              <input type="hidden" name="candidateId" value={reviewCase.candidateId} />
              <label className="grid gap-2 font-semibold">
                Onderdeel
                <select name="section" className={inputClass}>
                  {dossierSections.map((section) => (
                    <option key={section} value={section}>{providerDossierSectionLabels[section]}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 font-semibold">
                Melding voor de dienstverlener
                <textarea name="providerMessage" required minLength={10} maxLength={1000} className={`${inputClass} min-h-28`} />
              </label>
              <label className="grid gap-2 font-semibold">
                Interne notitie, optioneel
                <textarea name="internalNote" maxLength={2000} className={`${inputClass} min-h-24`} />
              </label>
              <details open className="rounded-control border border-border p-3 text-sm">
                <summary className="font-semibold">Auditgegevens</summary>
                <label className="mt-3 grid gap-2 font-semibold">
                  Interne redencode
                  <input name="reasonCode" required pattern="[A-Z0-9_]+" className={inputClass} />
                </label>
              </details>
              <Button type="submit" className="justify-self-start">Bevinding vastleggen</Button>
            </form>
          </Card>

          {reviewCase.findings.length > 0 ? (
            <Card>
              <h2 className="text-lg font-semibold">Aanvullende informatie vragen</h2>
              <form action={requestProviderInformationAction} className="mt-4 grid gap-4">
                <input type="hidden" name="providerProfileId" value={provider.id} />
                <input type="hidden" name="submissionId" value={submission.id} />
                <input type="hidden" name="reviewCaseId" value={reviewCase.id} />
                <input type="hidden" name="expectedVersion" value={submission.version} />
                <details open className="rounded-control border border-border p-3 text-sm">
                  <summary className="font-semibold">Auditgegevens</summary>
                  <label className="mt-3 grid gap-2 font-semibold">
                    Interne redencode
                    <input name="reasonCode" required pattern="[A-Z0-9_]+" className={inputClass} />
                  </label>
                </details>
                <Button type="submit" variant="secondary" className="justify-self-start">Terugsturen voor aanvulling</Button>
              </form>
            </Card>
          ) : null}
        </div>
      ) : null}

      {isApprover && reviewCase?.status === 'OPEN' && submission.status === 'UNDER_REVIEW' ? (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold">Definitief besluit</h2>
          <p className="mt-2 text-text-secondary">De goedkeurder moet een andere persoon zijn dan de beoordelaar.</p>
          <form action={finalizeProviderReviewAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="providerProfileId" value={provider.id} />
            <input type="hidden" name="submissionId" value={submission.id} />
            <input type="hidden" name="reviewCaseId" value={reviewCase.id} />
            <input type="hidden" name="reviewedByUserId" value={reviewCase.openedByUserId} />
            <input type="hidden" name="expectedVersion" value={submission.version} />
            <label className="grid gap-2 font-semibold">
              Besluit
              <select name="outcome" className={inputClass}>
                <option value="APPROVED">Goedkeuren</option>
                <option value="REJECTED">Afwijzen</option>
              </select>
            </label>
            <details open className="rounded-control border border-border p-3 text-sm">
              <summary className="font-semibold">Auditgegevens</summary>
              <label className="mt-3 grid gap-2 font-semibold">
                Interne redencode
                <input name="reasonCode" required pattern="[A-Z0-9_]+" className={inputClass} />
              </label>
            </details>
            <Button type="submit" className="justify-self-start">Besluit vastleggen</Button>
          </form>
        </Card>
      ) : null}
      {management && reviewCase && <Card className="mt-6" id="kwalificatiebeheer">
        <h2 className="text-lg font-semibold">Kwalificatie beheren</h2>
        <p className="mt-2">Leg voor het platform en iedere actieve dienst een afzonderlijk besluit vast op basis van de goedgekeurde dossierversie.</p>
        {qualificationResult && <p className="mt-3 font-semibold" role="status">{feedback[qualificationResult] ?? 'De actie is niet uitgevoerd. Controleer uw bevoegdheid, invoer en de bewijsstukken.'}</p>}
        {management.decisions.length > 0 && <ul className="my-4 space-y-2" aria-label="Recente kwalificatiebesluiten">{management.decisions.map(d => <li key={d.id}>
          <strong>{d.scope === 'PLATFORM' ? 'Platform' : management.capabilities.find(c => c.id === d.capabilityId)?.revisions[0]?.serviceTerm?.label ?? 'Dienst'} · {outcomeLabels[d.outcome]}</strong>
          <div>Reden: {management.reasons.find(r => r.code === d.reasonCode)?.label ?? d.reasonCode}. Beoordelaar: {d.reviewedByUser.displayName ?? d.reviewedByUser.id}. Goedkeurder: {d.approvedByUser.displayName ?? d.approvedByUser.id}.</div>
          <div>Ingang: {d.validFrom.toISOString().slice(0, 10)}. Einde (exclusief, UTC): {d.validUntil?.toISOString().slice(0, 10) ?? 'Geen einddatum'}.</div>
        </li>)}</ul>}
        {reviewCase.openedByUserId === user.id ? <p>Een onafhankelijke goedkeurder moet dit besluit vastleggen.</p> : management.reasons.length === 0 ? <p>Er zijn nog geen actieve kwalificatieredenen geconfigureerd.</p> :
          <form action={manageQualificationAction} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="providerProfileId" value={provider.id} /><input type="hidden" name="candidateId" value={submission.currentCandidate.id} />
            <input type="hidden" name="expectedVersion" value={provider.version} /><input type="hidden" name="reviewerId" value={reviewCase.openedByUserId} />
            <div className="grid min-w-0 gap-2"><label htmlFor="qualification-target">Onderwerp</label><select id="qualification-target" required name="target" defaultValue="" className={inputClass}><option value="">Kies een onderwerp</option><option value="PLATFORM">Platformkwalificatie</option>{management.capabilities.map(c => <option key={c.id} value={c.id}>{[c.revisions[0]?.serviceTerm?.label ?? 'Dienst', c.revisions[0]?.specialismTerm?.label].filter(Boolean).join(' · ')}</option>)}</select></div>
            <div className="grid min-w-0 gap-2"><label htmlFor="qualification-outcome">Kwalificatiebesluit</label><select id="qualification-outcome" required name="outcome" defaultValue="" className={inputClass}><option value="">Kies een besluit</option><option value="QUALIFIED">Kwalificeren</option><option value="RESTORED">Herstellen na beperking</option></select></div>
            <div className="grid min-w-0 gap-2"><label htmlFor="qualification-reasonCode">Reden</label><select id="qualification-reasonCode" required name="reasonCode" defaultValue="" className={inputClass}><option value="">Kies een reden</option>{management.reasons.map(r => <option value={r.code} key={r.code}>{r.label}</option>)}</select></div>
            <label className="grid gap-2">Geldig tot en met (UTC)<input type="date" name="validThrough" required className={inputClass} /></label>
            <Button type="submit" className="justify-self-start">Kwalificatiebesluit vastleggen</Button>
          </form>}
        <form action={manageQualificationAction} className="mt-6">
          <input type="hidden" name="providerProfileId" value={provider.id} /><input type="hidden" name="candidateId" value={submission.currentCandidate.id} />
          <input type="hidden" name="expectedVersion" value={provider.version} /><input type="hidden" name="operation" value="selection" />
          <Button type="submit" variant="secondary">Selecteerbaarheid bijwerken</Button>
        </form>
      </Card>}
    </Section>
  )
}
