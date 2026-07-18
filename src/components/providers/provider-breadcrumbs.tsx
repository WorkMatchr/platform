import Link from 'next/link'

export function ProviderBreadcrumbs({ current }: { current: string }) {
  return (
    <nav aria-label="Broodkruimel" className="mb-5 text-sm text-text-secondary">
      <ol className="flex flex-wrap items-center gap-2">
        <li><Link href="/aanbiedersdossier" className="underline underline-offset-4 hover:text-brand-primary-hover">Dienstverlenersprofiel</Link></li>
        <li aria-hidden="true">/</li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  )
}
