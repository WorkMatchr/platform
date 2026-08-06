import Link from 'next/link'
import type { getAssignmentProviderDecisionProfile } from '@/lib/providers/provider-decision-profile-service'
import { OrganizationLogo } from '@/components/organizations/organization-logo'
import { Card } from '@/components/ui/card'
import { providerDeliveryModeLabels } from '@/lib/providers/provider-dossier-presentation'

type Profile = Awaited<ReturnType<typeof getAssignmentProviderDecisionProfile>>['profile']

function TagList({ values, empty }: { values: string[]; empty: string }) {
  if (values.length === 0) return <p className="text-sm text-text-secondary">{empty}</p>
  return <ul className="flex flex-wrap gap-2">{values.map((value) => <li key={value} className="rounded-full border border-border bg-surface-subtle px-3 py-1 text-sm">{value}</li>)}</ul>
}

function VerificationStatus({ label }: { label: string }) {
  const verified = label === 'Geverifieerd door WorkMatchr'
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${verified ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-surface-subtle text-text-secondary'}`}>{label}</span>
}

export function ProviderDecisionProfile({ profile, backHref, backLabel, showCompleteness = false }: { profile: Profile; backHref: string; backLabel: string; showCompleteness?: boolean }) {
  const location = profile.organization.locations[0]
  const memberships = profile.organizationQualifications.filter((item) => item.qualificationTerm.version.taxonomy.kind === 'MEMBERSHIP')
  const registrations = profile.organizationQualifications.filter((item) => item.qualificationTerm.version.taxonomy.kind === 'REGISTRATION')
  const qualifications = profile.organizationQualifications.filter((item) => ['QUALIFICATION', 'CERTIFICATION'].includes(item.qualificationTerm.version.taxonomy.kind))
  const services = [...new Set(profile.capabilities.map((item) => item.serviceTerm?.label).filter((value): value is string => Boolean(value)))]
  const specialisms = [...new Set(profile.capabilities.map((item) => item.specialismTerm?.label).filter((value): value is string => Boolean(value)))]
  const deliveryModes = [...new Set(profile.capabilities.flatMap((item) => item.deliveryModes).map((mode) => providerDeliveryModeLabels[mode]))]

  return <div className="space-y-6">
    <Link href={backHref} className="inline-flex min-h-11 items-center font-semibold text-brand underline">← {backLabel}</Link>
    <div className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(17rem,0.34fr)_minmax(0,0.66fr)]">
      <aside className="min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain">
        <Card className="space-y-5">
          <OrganizationLogo name={profile.organization.name} storageKey={profile.organization.logoStorageKey} width={profile.organization.logoWidth} height={profile.organization.logoHeight} size="large" />
          <div><h1 className="break-words text-2xl font-bold text-brand-dark">{profile.organization.tradeName ?? profile.organization.name}</h1>{profile.organization.tradeName && <p className="mt-1 text-sm text-text-secondary">{profile.organization.name}</p>}<p className="mt-2 text-sm text-text-secondary">{location?.city ?? 'Vestigingsplaats niet ingevuld'}{location?.province ? `, ${location.province}` : ''}</p></div>
          {profile.shortIntroduction && <p className="leading-relaxed">{profile.shortIntroduction}</p>}
          <section aria-labelledby="core-expertise-title"><h2 id="core-expertise-title" className="mb-2 font-bold">Kernexpertises</h2><TagList values={profile.coreExpertises.map((item) => item.taxonomyTerm.label)} empty="Nog niet ingevuld" /></section>
          <section aria-labelledby="main-services-title"><h2 id="main-services-title" className="mb-2 font-bold">Belangrijkste diensten</h2><TagList values={services.slice(0, 6)} empty="Nog niet ingevuld" /></section>
          <section aria-labelledby="work-area-title"><h2 id="work-area-title" className="mb-2 font-bold">Werkgebied</h2><TagList values={profile.workAreas.map((item) => item.regionTerm.label)} empty="Nog niet ingevuld" /></section>
          {showCompleteness && <section className="rounded-control border border-border bg-surface-subtle p-4" aria-labelledby="profile-completeness-title"><h2 id="profile-completeness-title" className="font-bold">Profiel ingevuld: {profile.completeness.percentage}%</h2><p className="mt-1 text-sm text-text-secondary">Dit is alleen een invulhulp en geen kwaliteitsscore.</p></section>}
        </Card>
      </aside>
      <main className="min-w-0 space-y-6">
        <Card><h2 className="text-xl font-bold text-brand-dark">Over de organisatie</h2><p className="mt-4 whitespace-pre-line leading-relaxed">{profile.description || 'Deze organisatie heeft nog geen uitgebreide omschrijving toegevoegd.'}</p></Card>
        <Card><h2 className="text-xl font-bold text-brand-dark">Expertise en diensten</h2><div className="mt-5 space-y-5"><div><h3 className="mb-2 font-semibold">Specialismen</h3><TagList values={specialisms} empty="Geen specialismen ingevuld" /></div><div><h3 className="mb-2 font-semibold">Diensten</h3><TagList values={services} empty="Geen diensten ingevuld" /></div><div><h3 className="mb-2 font-semibold">Uitvoeringsvormen</h3><TagList values={deliveryModes} empty="Geen uitvoeringsvormen ingevuld" /></div></div></Card>
        <Card><h2 className="text-xl font-bold text-brand-dark">Werkwijze</h2><p className="mt-4 whitespace-pre-line leading-relaxed">{profile.workingMethod || 'De werkwijze is nog niet toegelicht.'}</p><div className="mt-5"><h3 className="mb-2 font-semibold">Werkvormen</h3><TagList values={profile.workModes.map((item) => item.taxonomyTerm.label)} empty="Geen aanvullende werkvormen ingevuld" /></div></Card>
        <Card><h2 className="text-xl font-bold text-brand-dark">Sectorervaring</h2><div className="mt-4"><TagList values={profile.sectors.map((item) => `${item.sectorTerm.label}${item.experienceYears !== null ? ` · ${item.experienceYears} jaar` : ''}`)} empty="Geen sectorervaring ingevuld" /></div></Card>
        <Card><h2 className="text-xl font-bold text-brand-dark">Aangesloten bij</h2><div className="mt-4 space-y-3">{memberships.length > 0 ? memberships.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border p-3"><span className="font-semibold">{item.qualificationTerm.label}</span><VerificationStatus label={item.statusLabel} /></div>) : <p className="text-sm text-text-secondary">Geen lidmaatschappen opgegeven.</p>}</div></Card>
        <Card><h2 className="text-xl font-bold text-brand-dark">Registraties en erkenningen</h2><div className="mt-4 space-y-3">{[...registrations, ...qualifications].length > 0 ? [...registrations, ...qualifications].map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border p-3"><span className="font-semibold">{item.qualificationTerm.label}</span><VerificationStatus label={item.statusLabel} /></div>) : <p className="text-sm text-text-secondary">Geen organisatiegebonden registraties opgegeven.</p>}</div></Card>
        <Card><h2 className="text-xl font-bold text-brand-dark">Verbonden deskundigen</h2><div className="mt-4 space-y-5">{profile.professionals.length > 0 ? profile.professionals.map((professional) => <article key={professional.id} className="rounded-control border border-border p-4"><h3 className="font-bold">{professional.identity?.displayName ?? 'Naam niet beschikbaar'}</h3><p className="mt-1 text-sm text-text-secondary">{professional.identity?.functionalRole ?? 'Rol niet ingevuld'}</p>{professional.qualifications.length > 0 && <ul className="mt-4 space-y-2">{professional.qualifications.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3"><span>{item.qualificationTerm.label}</span><VerificationStatus label={item.statusLabel} /></li>)}</ul>}</article>) : <p className="text-sm text-text-secondary">Geen deskundigen toegevoegd.</p>}</div></Card>
      </main>
    </div>
  </div>
}
