import { workspaceFocus } from '@/components/layout/workspace-shell'

// Main has no Academy administration routes yet. Keep these entries non-navigable
// until the existing LMS route, authorization and release prerequisites are met.
const academySections = [
  'Cursussen',
  'Hoofdstukken en lessen',
  'Vragenbanken',
  'Eindtoetsen',
  'Deelnemers en resultaten',
  'Certificaten',
] as const

export function AcademyAdminNavigation() {
  return <nav aria-label="Academy / E-learning" className="mt-3 rounded-card border border-border bg-surface p-2">
    <details open>
      <summary className={`min-h-11 cursor-pointer px-3 py-2 text-sm font-semibold ${workspaceFocus}`}>Academy / E-learning</summary>
      <p className="px-3 pb-2 text-xs leading-5 text-text-secondary">Deze beheeronderdelen zijn nog niet beschikbaar.</p>
      <ul className="divide-y divide-border px-3">
        {academySections.map(label => <li key={label} className="py-2 text-sm">
          <span className="block font-medium">{label}</span>
          <span className="block text-xs leading-5 text-text-secondary">Nog niet beschikbaar</span>
        </li>)}
      </ul>
    </details>
  </nav>
}
