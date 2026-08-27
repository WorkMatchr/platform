import {
  BASE_SELECTIONS,
  calculateAssignmentSelectionPrice,
  formatEuroCents,
  type AssignmentSelectionLimit,
} from '@/lib/marketplace/assignment-quote-slots'

const options: readonly AssignmentSelectionLimit[] = [3, 4, 5]

export function AssignmentQuoteSlotsField({ defaultValue = BASE_SELECTIONS }: { defaultValue?: number }) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-semibold text-brand-dark">Hoeveel offerteplaatsen wilt u beschikbaar stellen?</legend>
      <p className="text-sm text-text-secondary">
        U betaalt voor het beschikbaar stellen van extra offerteplaatsen. WorkMatchr garandeert niet dat iedere beschikbare plaats daadwerkelijk wordt gevuld.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((maxSelections) => {
          const price = calculateAssignmentSelectionPrice(maxSelections)
          const isIncluded = maxSelections === BASE_SELECTIONS
          return (
            <label key={maxSelections} className="flex cursor-pointer items-start gap-3 rounded-control border border-border bg-surface p-4 has-[:checked]:border-brand-primary has-[:checked]:ring-2 has-[:checked]:ring-brand-primary/20">
              <input
                type="radio"
                name="maxSelections"
                value={maxSelections}
                defaultChecked={defaultValue === maxSelections}
                className="mt-1 size-5 shrink-0"
              />
              <span>
                <span className="block font-semibold">{maxSelections} offerteplaatsen</span>
                {isIncluded ? (
                  <span className="mt-1 block text-sm text-text-secondary">Inbegrepen</span>
                ) : (
                  <span className="mt-1 block text-sm text-text-secondary">
                    {formatEuroCents(price.amountExcludingVatCents)} excl. btw<br />
                    {formatEuroCents(price.vatCents)} btw · {formatEuroCents(price.amountIncludingVatCents)} incl. btw
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </div>
      <p className="text-sm text-text-secondary">
        Betaling voor extra offerteplaatsen wordt binnenkort beschikbaar. Er volgt geen automatische terugbetaling wanneer een plaats niet wordt gevuld.
      </p>
    </fieldset>
  )
}
