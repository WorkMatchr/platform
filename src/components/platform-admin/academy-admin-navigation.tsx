import Link from '@/components/ui/navigation-link'
import { workspaceFocus } from '@/components/layout/workspace-shell'

const academySections = [
  { label: 'Cursussen', href: '/platformbeheer/academy/cursussen' },
  { label: 'Hoofdstukken en lessen', href: '/platformbeheer/academy/cursussen', note: 'Kies eerst een cursusversie.' },
  { label: 'Vragenbanken', href: '/platformbeheer/academy/vragen' },
  { label: 'Eindtoetsen', href: '/platformbeheer/academy/cursussen', note: 'Open de eindtoets in de cursuseditor.' },
  { label: 'Deelnemers en resultaten', href: null },
  { label: 'Certificaten', href: '/platformbeheer/academy/certificaten' },
] as const

export function AcademyAdminNavigation({ enabled = false }: { enabled?: boolean }) {
  return <nav aria-label="Academy / E-learning" className="mt-3 rounded-card border border-border bg-surface p-2">
    <details open>
      <summary className={`min-h-11 cursor-pointer px-3 py-2 text-sm font-semibold ${workspaceFocus}`}>Academy / E-learning</summary>
      {!enabled && <p className="px-3 pb-2 text-xs leading-5 text-text-secondary">Deze beheeronderdelen zijn nog niet beschikbaar.</p>}
      <ul className="divide-y divide-border px-3">
        {academySections.map(section => <li key={section.label} className="py-2 text-sm">
          {enabled && section.href ? <><Link href={section.href} className={`inline-flex min-h-11 items-center font-medium underline ${workspaceFocus}`}>{section.label}</Link>{'note' in section && <span className="block text-xs text-text-secondary">{section.note}</span>}</> : <><span className="block font-medium">{section.label}</span><span className="block text-xs leading-5 text-text-secondary">Nog niet beschikbaar</span></>}
        </li>)}
      </ul>
      {enabled && <div className="border-t border-border px-3 pt-2 text-sm"><Link className={`flex min-h-11 items-center underline ${workspaceFocus}`} href="/platformbeheer/academy/beoordelingen">Beoordelingsverzoeken</Link><Link className={`flex min-h-11 items-center underline ${workspaceFocus}`} href="/platformbeheer/academy/prijzen">Prijzen &amp; kortingen</Link></div>}
    </details>
  </nav>
}
