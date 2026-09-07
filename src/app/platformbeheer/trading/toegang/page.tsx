import { AdminPageHeader, AdminSection, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import { tradingAccountStatus } from '@/lib/trading/trading-access-service'
import { resetTradingPasswordAction, revokeTradingSessionsAction } from './actions'
export const dynamic = 'force-dynamic'
export default async function TradingAccessPage({ searchParams }: { searchParams: Promise<{ resultaat?: string; fout?: string }> }) {
  const administrator = await requirePlatformOperator('/platformbeheer/trading/toegang')
  const result = await searchParams
  let account: Awaited<ReturnType<typeof tradingAccountStatus>> | null = null
  try { account = await tradingAccountStatus(administrator.id) } catch {}
  return <>
    <AdminPageHeader eyebrow="Beheer / Trading" title="Toegang" description="Beheer de toegang tot WorkMatchr Trading. Alleen trade@workmatchr.nl kan inloggen." />
    {result.fout || !account ? <p role="alert" className="mb-5 text-error">De actie kon niet worden afgerond of de accountstatus is tijdelijk niet beschikbaar. Probeer het later opnieuw.</p> : null}
    {result.resultaat === 'reset' ? <p role="status" className="mb-5">De resetmail is aangeboden voor verzending. De link is 30 minuten geldig en werkt eenmalig.</p> : null}
    {result.resultaat === 'ingetrokken' ? <p role="status" className="mb-5">Alle Trading-sessies zijn beëindigd.</p> : null}
    <AdminSection title="Account">
      <dl className="grid gap-4 rounded-card border border-border bg-surface p-5">
        <div><dt className="text-sm text-text-secondary">Account</dt><dd>trade@workmatchr.nl</dd></div>
        <div><dt className="text-sm text-text-secondary">Status</dt><dd>{account ? <StatusPill tone={account.status === 'ACTIVE' ? 'good' : 'bad'}>{account.status === 'ACTIVE' ? 'Actief' : 'Geblokkeerd'}</StatusPill> : 'Niet beschikbaar'}</dd></div>
        <div><dt className="text-sm text-text-secondary">Laatste login</dt><dd>{account ? account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' }) : 'Nog niet ingelogd' : 'Niet beschikbaar'}</dd></div>
      </dl>
      <p className="my-4 text-sm text-text-secondary">Een resetmail vervangt eerdere resetlinks. Na het instellen van het wachtwoord worden alle sessies beëindigd. U kunt bestaande sessies ook direct beëindigen.</p>
      <div className="flex flex-wrap gap-3">
        <form action={resetTradingPasswordAction}><button disabled={!account || account.status !== 'ACTIVE'} className="rounded-button bg-brand-primary px-4 py-2 font-semibold text-white disabled:opacity-50">Wachtwoord resetten</button></form>
        <form action={revokeTradingSessionsAction}><button disabled={!account} className="rounded-button border border-border px-4 py-2 font-semibold disabled:opacity-50">Alle sessies beëindigen</button></form>
      </div>
    </AdminSection>
  </>
}
