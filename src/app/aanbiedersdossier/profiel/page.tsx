import Link from 'next/link'
import { saveProviderOrganizationClaimAction, saveProviderProfileAction, saveProviderProfileSelectionsAction } from '../actions'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderProfileForm } from '@/components/providers/provider-profile-form'
import { ProviderOrganizationClaimForm, ProviderProfileSelectionForm } from '@/components/providers/provider-profile-selection-form'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderOnboardingOptions } from '@/lib/providers/provider-onboarding-query-service'
import { getProviderProfileEditor } from '@/lib/providers/provider-decision-profile-service'
import { getProviderDossierDashboard } from '@/lib/providers/provider-dossier-query-service'

const organizationStatusLabels = {
  PENDING: 'In afwachting',
  ACTIVE: 'Actief',
  SUSPENDED: 'Geblokkeerd',
  ARCHIVED: 'Gearchiveerd',
} as const

function SummaryList({ values, empty }: { values: string[]; empty: string }) {
  return values.length > 0
    ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-secondary">{values.map((value) => <li key={value}>{value}</li>)}</ul>
    : <p className="mt-3 text-sm text-text-secondary">{empty}</p>
}

export default async function ProviderProfilePage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/profiel')
  const dashboard = await getProviderDossierDashboard(context.user.id, context.providerProfileId)
  const [profile, options] = await Promise.all([
    getProviderProfileEditor(context.user.id, context.providerProfileId),
    getProviderOnboardingOptions(context.user.id, context.providerProfileId),
  ])
  const editable = context.canManage
    && dashboard.completeness.editableSections.includes('ORGANIZATION')
    && dashboard.completeness.editableSections.includes('CAPABILITIES')
  const readOnlyMessage = context.canManage
    ? 'Dit onderdeel kan tijdens de huidige beoordeling niet worden gewijzigd.'
    : 'Dit onderdeel is alleen-lezen. Een eigenaar of beheerder kan wijzigingen uitvoeren.'
  const expertiseOptions = profile.capabilities
    .map((capability) => capability.specialismTerm)
    .filter((term): term is NonNullable<typeof term> => Boolean(term))
    .filter((term, index, terms) => terms.findIndex((candidate) => candidate.code === term.code) === index)
    .map((term) => ({ id: profile.capabilities.find((capability) => capability.specialismTerm?.code === term.code)?.specialismTermId ?? '', label: term.label }))
    .filter((term) => term.id)
  const memberships = profile.organizationQualifications.filter((claim) => claim.qualificationTerm.version.taxonomy.kind === 'MEMBERSHIP')
  const registrations = profile.organizationQualifications.filter((claim) => claim.qualificationTerm.version.taxonomy.kind === 'REGISTRATION')
  const location = profile.organization.locations[0]
  const services = profile.capabilities.map((capability) => capability.serviceTerm?.label).filter((label): label is string => Boolean(label))
  const specialisms = profile.capabilities.map((capability) => capability.specialismTerm?.label).filter((label): label is string => Boolean(label))
  const sectorExperience = profile.sectors.map((sector) => sector.sectorTerm.label)
  const workAreas = profile.workAreas.map((area) => area.regionTerm.label)
  const workModes = profile.workModes.map((mode) => mode.taxonomyTerm.label)
  const professionalQualifications = profile.professionals.reduce((count, professional) => count + professional.qualifications.length, 0)

  return <>
    <ProviderPageHeader
      title="Uw dienstverlenersprofiel"
      description="Presenteer uw organisatie gestructureerd binnen een geldige opdrachtrelatie. Beschikbaarheid en planning bespreekt u pas bij een concrete reactie."
      readOnly={!editable}
      readOnlyMessage={readOnlyMessage}
    />
    <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(14rem,0.3fr)_minmax(0,0.7fr)]">
      <aside className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-2" aria-label="Organisatiegegevens">
        <Card>
          <h2 className="text-lg font-bold">Organisatie</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div><dt className="text-text-secondary">Naam</dt><dd className="font-semibold break-words">{profile.organization.name}</dd></div>
            <div><dt className="text-text-secondary">Status</dt><dd>{organizationStatusLabels[profile.organization.status]}</dd></div>
            <div><dt className="text-text-secondary">KvK-nummer</dt><dd>{profile.organization.chamberOfCommerceNumber ?? 'Niet ingevuld'}</dd></div>
            <div><dt className="text-text-secondary">Locatie</dt><dd>{location ? [location.label, location.city, location.province].filter(Boolean).join(', ') : 'Niet ingevuld'}</dd></div>
            <div><dt className="text-text-secondary">Sectorervaring</dt><dd>{sectorExperience.length > 0 ? sectorExperience.join(', ') : 'Niet ingevuld'}</dd></div>
            <div><dt className="text-text-secondary">Aantal medewerkers</dt><dd>{profile.organization.employeeCount?.toLocaleString('nl-NL') ?? 'Niet ingevuld'}</dd></div>
            <div><dt className="text-text-secondary">Website</dt><dd className="break-all">{profile.organization.website ? <a className="font-semibold text-brand underline" href={profile.organization.website} target="_blank" rel="noreferrer">{profile.organization.website}</a> : 'Niet ingevuld'}</dd></div>
          </dl>
          <div className="mt-5 grid gap-2">
            <Link className="font-semibold text-brand underline" href="/organisatie/profiel">Organisatie wijzigen</Link>
            <Link className="font-semibold text-brand underline" href="/organisatie/gebruikers">Gebruikers beheren</Link>
          </div>
        </Card>
      </aside>

      <div className="min-w-0 space-y-6">
        <Card>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div><p className="font-semibold">Profiel ingevuld: {profile.completeness.percentage}%</p><p className="text-sm text-text-secondary">Dit percentage is alleen een invulhulp en geen beoordeling van kwaliteit of deskundigheid.</p></div>
            <Link href="/aanbiedersdossier/voorvertoning" className="inline-flex min-h-11 items-center justify-center rounded-control border border-brand-primary px-4 font-semibold text-brand-primary hover:bg-brand-primary-subtle">Voorvertoning bekijken</Link>
          </div>
          {profile.completeness.suggestions.length > 0 && <><h2 className="mt-5 font-bold">Uw profiel verder aanvullen</h2><SummaryList values={profile.completeness.suggestions} empty="Uw profiel is volledig ingevuld." /></>}
        </Card>

        <Card><h2 className="mb-5 text-lg font-bold">Introductie, omschrijving en werkwijze</h2>{editable ? <ProviderProfileForm action={saveProviderProfileAction} version={profile.version} shortIntroduction={profile.shortIntroduction} description={profile.description} workingMethod={profile.workingMethod} /> : <p className="text-text-secondary">Deze profielgegevens zijn nu alleen-lezen.</p>}</Card>
        <Card><h2 className="mb-5 text-lg font-bold">Kernexpertise en werkvormen</h2>{editable ? <ProviderProfileSelectionForm action={saveProviderProfileSelectionsAction} profileVersion={profile.version} expertiseOptions={expertiseOptions} selectedExpertiseIds={profile.coreExpertises.map((item) => item.taxonomyTermId)} workModeOptions={profile.workModeOptions} selectedWorkModeIds={profile.workModes.map((item) => item.taxonomyTermId)} /> : <p className="text-text-secondary">Deze profielgegevens zijn nu alleen-lezen.</p>}</Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card><h2 className="font-bold">Diensten</h2><SummaryList values={services} empty="Nog geen diensten toegevoegd." /><Link href="/aanbiedersdossier/diensten" className="mt-4 inline-block font-semibold text-brand underline">Diensten beheren</Link></Card>
          <Card><h2 className="font-bold">Specialismen</h2><SummaryList values={specialisms} empty="Nog geen specialismen toegevoegd." /><Link href="/aanbiedersdossier/diensten" className="mt-4 inline-block font-semibold text-brand underline">Specialismen beheren</Link></Card>
          <Card><h2 className="font-bold">Sectorervaring</h2><SummaryList values={sectorExperience} empty="Nog geen sectorervaring toegevoegd." /><Link href="/aanbiedersdossier/sectorervaring" className="mt-4 inline-block font-semibold text-brand underline">Sectorervaring beheren</Link></Card>
          <Card><h2 className="font-bold">Werkgebied</h2><SummaryList values={workAreas} empty="Nog geen werkgebied toegevoegd." /><Link href="/aanbiedersdossier/werkgebied" className="mt-4 inline-block font-semibold text-brand underline">Werkgebied beheren</Link></Card>
          <Card><h2 className="font-bold">Werkvormen</h2><SummaryList values={workModes} empty="Nog geen werkvormen gekozen." /></Card>
          <Card><h2 className="font-bold">Professionals en kwalificaties</h2><p className="mt-3 text-sm text-text-secondary">{profile.professionals.length} professional(s) en {professionalQualifications} kwalificatie(s).</p><Link href="/aanbiedersdossier/professionals" className="mt-4 inline-block font-semibold text-brand underline">Professionals beheren</Link></Card>
        </div>

        <Card>
          <h2 className="text-lg font-bold">Lidmaatschappen</h2>
          <p className="mt-1 text-sm text-text-secondary">Leg lidmaatschappen van de organisatie afzonderlijk vast.</p>
          {editable && options.memberships.length > 0 && <div className="mt-5"><ProviderOrganizationClaimForm action={saveProviderOrganizationClaimAction} profileVersion={profile.version} options={options.memberships} idPrefix="membership" selectionLabel="Lidmaatschap" numberLabel="Lidnummer" submitLabel="Lidmaatschap toevoegen" /></div>}
          <div className="mt-5 space-y-3">{memberships.length > 0 ? memberships.map((claim) => <div key={claim.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border p-3"><span className="font-semibold">{claim.qualificationTerm.label}</span><span className="rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs font-semibold">{claim.statusLabel}</span></div>) : <p className="text-sm text-text-secondary">Er zijn nog geen lidmaatschappen toegevoegd.</p>}</div>
        </Card>

        <Card>
          <h2 className="text-lg font-bold">Registraties</h2>
          <p className="mt-1 text-sm text-text-secondary">Leg formele registraties van de organisatie afzonderlijk vast.</p>
          {editable && options.registrations.length > 0 && <div className="mt-5"><ProviderOrganizationClaimForm action={saveProviderOrganizationClaimAction} profileVersion={profile.version} options={options.registrations} idPrefix="registration" selectionLabel="Registratie" numberLabel="Registratienummer" submitLabel="Registratie toevoegen" /></div>}
          <div className="mt-5 space-y-3">{registrations.length > 0 ? registrations.map((claim) => <div key={claim.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border p-3"><span className="font-semibold">{claim.qualificationTerm.label}</span><span className="rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs font-semibold">{claim.statusLabel}</span></div>) : <p className="text-sm text-text-secondary">Er zijn nog geen registraties toegevoegd.</p>}</div>
        </Card>
      </div>
    </div>
  </>
}
