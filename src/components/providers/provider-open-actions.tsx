import Link from 'next/link'
import type { ProviderDossierOpenAction } from '@/lib/providers/provider-dossier-open-actions'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'

export function ProviderOpenActions({ actions, canManage }: { actions: ProviderDossierOpenAction[]; canManage: boolean }) {
  const [primary, ...remaining] = actions
  return (
    <section className="mt-6 grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]" aria-labelledby="actions-heading">
      <Card variant="dark">
        <h2 id="actions-heading" className="text-xl font-bold">Uw eerstvolgende actie</h2>
        {primary ? <><h3 className="mt-5 text-lg font-semibold">{primary.title}</h3><p className="mt-2 text-text-on-dark-muted">{canManage ? primary.description : 'Neem contact op met een OWNER of ADMIN om dit onderdeel bij te werken.'}</p>{canManage && <LinkButton className="mt-5" href={primary.routeHint}>Ga naar dit onderdeel</LinkButton>}</> : <p className="mt-4 text-text-on-dark-muted">Er zijn momenteel geen open dossieracties.</p>}
      </Card>
      <Card>
        <h2 className="text-xl font-bold text-brand-dark">Overige open acties</h2>
        {remaining.length > 0 ? <ul className="mt-4 space-y-3">{remaining.slice(0, 5).map((action) => <li key={`${action.code}-${action.section}`}><Link href={action.routeHint} className="block rounded-control border border-border p-3 hover:border-brand-primary"><span className="font-semibold">{action.title}</span><span className="mt-1 block text-sm text-text-secondary">{action.blocking ? 'Blokkerend' : 'Aandachtspunt'}</span></Link></li>)}</ul> : <p className="mt-4 text-text-secondary">Geen overige acties.</p>}
      </Card>
    </section>
  )
}
