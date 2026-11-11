import { redirect } from 'next/navigation'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { startPaidPilot } from '@/lib/learning/academy-paid-checkout'
import { pilotQuote, PILOT_GROSS_CENTS, KOR_NOTICE } from '@/lib/learning/academy-paid-price'
import { formatEuro } from '@/lib/finance/financial-contract'

async function checkout(data: FormData) {
  'use server'
  const user = await requireLearningUser('/e-learnings/pilot')
  let url: string
  try {
    url = await startPaidPilot(user.id, {
      code: data.get('code'),
      versionId: data.get('version'),
      organizationId: data.get('buyer') || null,
      confirmed: data.get('confirm') === 'yes',
      billing: {
        organizationName: data.get('name'),
        addressLine: data.get('street'),
        city: data.get('city'),
        postalCode: data.get('postal'),
        countryCode: 'NL',
      },
    })
  } catch {
    redirect('/e-learnings/pilot?melding=betaling-controleren')
  }
  redirect(url)
}

export function PaidPilotForm({
  version,
  title,
  cohortEndsAt,
  buyers,
}: {
  version: string
  title: string
  cohortEndsAt: Date | null
  buyers: { id: string; name: string }[]
}) {
  let quote
  try {
    quote = pilotQuote(PILOT_GROSS_CENTS, new Date())
  } catch {
    return <p role="status">De fiscale instellingen worden gecontroleerd. Betalen is tijdelijk gesloten.</p>
  }
  return (
    <form action={checkout} className="space-y-3 rounded border p-4">
      <h2>{title}</h2>
      <p>Reguliere prijs €149,00. Uw persoonlijke korting is 99% (€147,51).</p>
      <p>
        {quote.vatRateBps
          ? 'Regulier €123,14 + €25,86 btw. Met korting €1,23 + €0,26 btw (21%).'
          : KOR_NOTICE}{' '}
        Te betalen {formatEuro(quote.amountInclVatCents)}.
      </p>
      <p>Uw toegang begint op de bevestigde betaaldatum en duurt twaalf maanden. Als particulier kunt u uw aankoop via uw account herroepen. Bij herroeping binnen de bedenktijd van veertien dagen krijgt u ook na starten of afronden de volledige €1,49 terug.</p>
      {cohortEndsAt && <p>De meetperiode sluit op {cohortEndsAt.toLocaleDateString('nl-NL',{ timeZone:'Europe/Amsterdam' })}. We wissen individuele metingen binnen dertig dagen nadat de meetperiode sluit. Rondt u eerder af of eindigt uw toegang eerder, dan gaat de termijn op die eerdere datum in.</p>}
      <p>De pilotbegeleider kan uw studievoortgang, toetsresultaten en gemeten studieduur zien.</p>
      <input type="hidden" name="version" value={version} />
      <label className="block">
        Persoonlijke pilotcode <input name="code" required maxLength={26} />
      </label>
      <label className="block">
        Koper{' '}
        <select name="buyer">
          <option value="">Ik koop als particulier</option>
          {buyers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Naam op factuur <input name="name" required maxLength={200} />
      </label>
      <label className="block">
        Straat en huisnummer <input name="street" required maxLength={200} />
      </label>
      <label className="block">
        Postcode <input name="postal" required maxLength={20} />
      </label>
      <label className="block">
        Woonplaats of vestigingsplaats <input name="city" required maxLength={120} />
      </label>
      <label className="block">
        <input name="confirm" type="checkbox" value="yes" required /> De koper woont of is gevestigd in
        Nederland en de factuurgegevens zijn juist.
      </label>
      <button>Betalen met Mollie · €1,49</button>
    </form>
  )
}
