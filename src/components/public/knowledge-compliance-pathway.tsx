import Link from 'next/link'
import { publicRoutes } from '@/content/public-routes'

export function KnowledgeCompliancePathway() {
  return <section aria-labelledby="knowledge-compliance-title" className="rounded-card border border-border bg-surface-subtle p-5 sm:p-6">
    <h2 id="knowledge-compliance-title" className="text-2xl font-bold text-brand-dark">Van informatie naar uw situatie</h2>
    <p className="mt-3 text-text-secondary">Wilt u breder verkennen welke arbo-onderwerpen mogelijk relevant zijn? De gratis intake stelt vijf vragen en geeft een eerste oriëntatie. De intake beoordeelt niet of uw organisatie aan de wet voldoet.</p>
    <p className="mt-3"><Link href={publicRoutes.complianceScan} className="inline-flex min-h-11 items-center rounded-control font-semibold text-brand-primary-hover underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4">Verken uw situatie met de gratis intake</Link></p>
    <p className="mt-3 text-sm text-text-secondary">De uitgebreide Compliance Scan is nog niet beschikbaar. Dit artikel en de intake leveren geen vrijstelling of juridische goedkeuring op. Voor professionele ondersteuning kunt u hieronder uw opdracht starten.</p>
  </section>
}
