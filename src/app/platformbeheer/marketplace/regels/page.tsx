import { createMarketplaceRuleSetAction } from '@/app/platformbeheer/actions'
import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { listMarketplaceRuleSets } from '@/lib/marketplace/marketplace-rules-service'

export default async function MarketplaceRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ resultaat?: string; fout?: string }>
}) {
  const feedback = await searchParams
  const administrator = await requirePlatformAdministrator('/platformbeheer/marketplace/regels')
  const ruleSets = await listMarketplaceRuleSets(administrator.id)
  const current = ruleSets.find(
    (ruleSet) =>
      ruleSet.status === 'PUBLISHED' &&
      ruleSet.validFrom <= new Date() &&
      (!ruleSet.validUntil || ruleSet.validUntil > new Date()),
  )
  const canManage = ['OWNER', 'ADMIN'].includes(administrator.platformMembership.role)

  return (
    <>
      <AdminPageHeader
        eyebrow="Marketplace"
        title="Bedrijfsregels"
        description="Versieerbare operationele regels voor nieuwe deelnames. Bestaande deelnames en transacties veranderen nooit mee."
      />
      {feedback.resultaat ? <p role="status" className="rounded-control border border-success-border bg-success-subtle p-4">De nieuwe regelset is vastgelegd.</p> : null}
      {feedback.fout ? <p role="alert" className="rounded-control border border-error-border bg-error-subtle p-4">De regelset is niet toegevoegd. Controleer de waarden, ingangsdatum en uw bevoegdheid.</p> : null}

      {current ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-card border border-border bg-surface p-4"><p className="text-xs text-text-secondary">Deelnameprijs</p><p className="mt-1 text-xl font-bold">{current.participationPriceCredits} credits</p></div>
          <div className="rounded-card border border-border bg-surface p-4"><p className="text-xs text-text-secondary">Maximaal deelnemers</p><p className="mt-1 text-xl font-bold">{current.maximumParticipants}</p></div>
          <div className="rounded-card border border-border bg-surface p-4"><p className="text-xs text-text-secondary">Teruggave bij intrekking</p><p className="mt-1 text-xl font-bold">{current.withdrawalRefundPercentage}%</p></div>
          <div className="rounded-card border border-border bg-surface p-4"><p className="text-xs text-text-secondary">Intrekkingsgrens</p><p className="mt-1 text-xl font-bold">{current.withdrawalThreshold} in {current.withdrawalWindowMonths} maanden</p></div>
        </div>
      ) : null}

      <AdminSection title="Regelsethistorie">
        <AdminTable headers={['Versie', 'Status', 'Geldig vanaf', 'Prijs', 'Deelnemers', 'Reden']}>
          {ruleSets.map((ruleSet) => (
            <tr key={ruleSet.id}>
              <td className="px-4 py-3 font-semibold">{ruleSet.version}</td>
              <td className="px-4 py-3"><StatusPill tone={ruleSet.status === 'PUBLISHED' ? 'good' : 'neutral'}>{ruleSet.status === 'PUBLISHED' ? 'Gepubliceerd' : ruleSet.status === 'DRAFT' ? 'Concept' : 'Ingetrokken'}</StatusPill></td>
              <td className="px-4 py-3">{ruleSet.validFrom.toLocaleString('nl-NL')}</td>
              <td className="px-4 py-3">{ruleSet.participationPriceCredits} credits</td>
              <td className="px-4 py-3">{ruleSet.maximumParticipants}</td>
              <td className="max-w-md px-4 py-3">{ruleSet.changeReason}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminSection>

      {canManage && current ? (
        <AdminSection title="Nieuwe regelset" description="Deze wijziging geldt alleen voor nieuwe deelnames vanaf de ingestelde ingangsdatum. Bestaande deelnames en transacties veranderen niet.">
          <form action={createMarketplaceRuleSetAction} className="grid gap-4 rounded-card border border-border bg-surface p-5 sm:grid-cols-2 xl:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold">Versie<input name="version" required maxLength={40} className="rounded-control border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-semibold">Ingangsdatum<input name="validFrom" type="datetime-local" required className="rounded-control border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-semibold">Standaard deelnameprijs<input name="participationPriceCredits" type="number" min={current.minimumParticipationPrice} defaultValue={current.participationPriceCredits} required className="rounded-control border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-semibold">Minimum deelnameprijs<input name="minimumParticipationPrice" type="number" min={30} defaultValue={current.minimumParticipationPrice} required className="rounded-control border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-semibold">Teruggave bij intrekking (%)<input name="withdrawalRefundPercentage" type="number" min={0} max={100} defaultValue={current.withdrawalRefundPercentage} required className="rounded-control border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-semibold">Teruggave niet-gegunde offerte<input name="unawardedQuoteRefundCredits" type="number" min={0} defaultValue={current.unawardedQuoteRefundCredits} required className="rounded-control border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-semibold">Maximaal deelnemers<input name="maximumParticipants" type="number" min={1} max={100} defaultValue={current.maximumParticipants} required className="rounded-control border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-semibold">Intrekkingsgrens<input name="withdrawalThreshold" type="number" min={1} defaultValue={current.withdrawalThreshold} required className="rounded-control border border-border px-3 py-2 font-normal" /></label>
            <label className="grid gap-1 text-sm font-semibold">Meetperiode (maanden)<input name="withdrawalWindowMonths" type="number" min={1} defaultValue={current.withdrawalWindowMonths} required className="rounded-control border border-border px-3 py-2 font-normal" /></label>
            <label className="flex items-center gap-2 text-sm"><input name="roundRefundUp" type="checkbox" defaultChecked={current.roundRefundUp} /> Rond terugbetaling naar boven af</label>
            <label className="flex items-center gap-2 text-sm"><input name="reliabilitySignalsEnabled" type="checkbox" defaultChecked={current.reliabilitySignalsEnabled} /> Interne betrouwbaarheidssignalen actief</label>
            <label className="grid gap-1 text-sm font-semibold sm:col-span-2 xl:col-span-3">Reden van wijziging<textarea name="changeReason" minLength={10} maxLength={500} required rows={3} className="rounded-control border border-border px-3 py-2 font-normal" /></label>
            <label className="flex items-start gap-2 text-sm sm:col-span-2"><input name="confirmed" type="checkbox" required className="mt-1" /><span>Ik bevestig de nieuwe waarden en ingangsdatum.</span></label>
            <button type="submit" className="min-h-11 rounded-control bg-brand-primary px-5 font-semibold text-white hover:bg-brand-dark">Regelset vastleggen</button>
          </form>
        </AdminSection>
      ) : (
        <p className="mt-6 rounded-card border border-border bg-surface p-5 text-sm text-text-secondary">U kunt de bedrijfsregels bekijken, maar niet wijzigen.</p>
      )}
    </>
  )
}
