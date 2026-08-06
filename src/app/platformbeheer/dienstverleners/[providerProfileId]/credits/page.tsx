import { notFound } from 'next/navigation'
import { mutateMarketplaceCreditsAction } from '@/app/platformbeheer/actions'
import { AdminPageHeader, AdminSection, AdminTable } from '@/components/platform-admin/platform-admin-ui'
import { LinkButton } from '@/components/ui/link-button'
import {
  getPlatformProviderCreditOverview,
  manualCreditReasonCodes,
} from '@/lib/marketplace/marketplace-credit-admin-service'
import { creditTransactionTypeLabels } from '@/lib/marketplace/marketplace-presentation'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformProviderDetail } from '@/lib/platform-admin/platform-admin-query-service'

const reasonLabels = {
  TECHNICAL_COMPENSATION: 'Compensatie na technisch probleem',
  CUSTOMER_SERVICE_CORRECTION: 'Klantenservicecorrectie',
  COMMERCIAL_GESTURE: 'Commerciële tegemoetkoming',
  SPONSORSHIP: 'Sponsoring of samenwerking',
  PROMOTION: 'Promotie of campagne',
  CORRECTION_OF_PREVIOUS_TRANSACTION: 'Correctie van eerdere transactie',
  CONTRIBUTION_BONUS: 'Bonus wegens bijdrage aan WorkMatchr',
  OTHER: 'Anders',
} satisfies Record<(typeof manualCreditReasonCodes)[number], string>

const reversibleTypes = [
  'ADMIN_GRANT',
  'ADMIN_CORRECTION',
  'MANUAL_COMPENSATION',
  'COMMERCIAL_GESTURE',
  'SPONSORSHIP',
  'PROMOTION',
  'CONTRIBUTION_BONUS',
  'OTHER',
] as const

export default async function PlatformProviderCreditsPage({
  params,
  searchParams,
}: {
  params: Promise<{ providerProfileId: string }>
  searchParams: Promise<{ resultaat?: string; fout?: string }>
}) {
  const { providerProfileId } = await params
  const feedback = await searchParams
  const returnTo = `/platformbeheer/dienstverleners/${providerProfileId}/credits`
  const administrator = await requirePlatformAdministrator(returnTo)
  const provider = await getPlatformProviderDetail(administrator.id, providerProfileId)
  if (!provider) notFound()
  const overview = await getPlatformProviderCreditOverview({
    actorUserId: administrator.id,
    providerOrganizationId: provider.organization.id,
  })
  if (!overview) notFound()
  const account = overview.creditAccount
  const canManage = ['OWNER', 'ADMIN'].includes(administrator.platformMembership.role)
  const reversible =
    account?.transactions.filter((transaction) =>
      reversibleTypes.includes(transaction.type as (typeof reversibleTypes)[number]),
    ) ?? []

  return (
    <>
      <AdminPageHeader
        eyebrow="Credits"
        title={overview.name}
        description="Het saldo is een gecontroleerde projectie. De transactiehistorie is leidend."
        action={
          <LinkButton href={`/platformbeheer/dienstverleners/${providerProfileId}`} variant="outline">
            Terug naar professional
          </LinkButton>
        }
      />
      {feedback.resultaat ? (
        <p role="status" className="rounded-control border border-success-border bg-success-subtle p-4">
          De creditmutatie is uitgevoerd en vastgelegd.
        </p>
      ) : null}
      {feedback.fout ? (
        <p role="alert" className="rounded-control border border-error-border bg-error-subtle p-4">
          De creditmutatie is niet uitgevoerd. Controleer het saldo, de reden en uw bevoegdheid.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Totaal', account ? account.availableBalance + account.reservedBalance : 0],
          ['Gereserveerd', account?.reservedBalance ?? 0],
          ['Beschikbaar', account?.availableBalance ?? 0],
        ].map(([label, value]) => (
          <div key={label} className="rounded-card border border-border bg-surface p-4">
            <p className="text-xs text-text-secondary">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <AdminSection title="Recente transacties">
        <AdminTable headers={['Type', 'Aantal', 'Saldo vóór', 'Saldo na', 'Reden', 'Uitgevoerd door', 'Moment']}>
          {account?.transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td className="px-4 py-3">{creditTransactionTypeLabels[transaction.type]}</td>
              <td className={`px-4 py-3 font-semibold ${transaction.amount >= 0 ? 'text-success' : 'text-error'}`}>
                {transaction.amount > 0 ? '+' : ''}{transaction.amount}
              </td>
              <td className="px-4 py-3">{transaction.availableBefore ?? 'Historisch niet vastgelegd'}</td>
              <td className="px-4 py-3">{transaction.availableAfter ?? transaction.balanceAfter}</td>
              <td className="max-w-sm px-4 py-3">{transaction.description ?? transaction.reason ?? 'Niet vastgelegd'}</td>
              <td className="px-4 py-3">{transaction.createdByUser?.displayName ?? transaction.createdByUser?.email ?? 'Systeem'}</td>
              <td className="px-4 py-3">{transaction.createdAt.toLocaleString('nl-NL')}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminSection>

      {canManage ? (
        <AdminSection
          title="Credits toevoegen of corrigeren"
          description="Voer nooit rechtstreeks een saldo in. Iedere wijziging wordt als afzonderlijke transactie vastgelegd."
        >
          <form action={mutateMarketplaceCreditsAction} className="grid gap-4 rounded-card border border-border bg-surface p-5 sm:grid-cols-2">
            <input type="hidden" name="providerOrganizationId" value={overview.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="idempotencyKey" value={`manual-credit:${crypto.randomUUID()}`} />
            <label className="grid gap-1 text-sm font-semibold">
              Aantal credits
              <input name="amount" type="number" min={-100000} max={100000} required className="rounded-control border border-border px-3 py-2 font-normal" />
              <span className="font-normal text-text-secondary">Gebruik een negatief aantal alleen voor een toegestane afschrijving.</span>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Type en reden
              <select name="reasonCode" required className="rounded-control border border-border px-3 py-2 font-normal">
                {manualCreditReasonCodes.map((code) => <option key={code} value={code}>{reasonLabels[code]}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2">
              Toelichting
              <textarea name="explanation" minLength={10} maxLength={1000} required rows={4} className="rounded-control border border-border px-3 py-2 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Optionele zakelijke verwijzing
              <input name="reference" maxLength={200} className="rounded-control border border-border px-3 py-2 font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Transactie voor tegenboeking
              <select name="reversalOfTransactionId" className="rounded-control border border-border px-3 py-2 font-normal">
                <option value="">Niet van toepassing</option>
                {reversible.map((transaction) => (
                  <option key={transaction.id} value={transaction.id}>
                    {creditTransactionTypeLabels[transaction.type]} · {transaction.amount} · {transaction.createdAt.toLocaleDateString('nl-NL')}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input name="confirmed" type="checkbox" required className="mt-1" />
              <span>Ik bevestig de mutatie, het verwachte nieuwe saldo en de opgegeven reden.</span>
            </label>
            <button type="submit" className="min-h-11 rounded-control bg-brand-primary px-5 font-semibold text-white hover:bg-brand-dark">
              Creditmutatie vastleggen
            </button>
          </form>
        </AdminSection>
      ) : (
        <p className="mt-6 rounded-card border border-border bg-surface p-5 text-sm text-text-secondary">
          U kunt de credittransacties bekijken, maar niet wijzigen.
        </p>
      )}
    </>
  )
}
