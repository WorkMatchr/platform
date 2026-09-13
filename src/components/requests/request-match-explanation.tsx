import { presentMatchedExpertise, selectedExpertiseMatchPresentation } from '@/lib/requests/request-interest-contract'

export function RequestMatchExplanation({ primary, matches, basis }: { primary: string | null; matches: readonly string[]; basis: unknown }) {
  const match = selectedExpertiseMatchPresentation(primary, matches, basis)
  return <div className="mt-4 text-sm text-text-secondary">
    <p className="font-semibold text-brand-dark">{match?.title ?? 'Passend op'}</p>
    <p>{match?.description ?? matches.map(presentMatchedExpertise).join(', ')}</p>
  </div>
}
