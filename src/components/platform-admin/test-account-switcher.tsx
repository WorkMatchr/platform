'use client'

import { useMemo, useState } from 'react'
import { startTestImpersonationAction } from '@/app/platformbeheer/test-account-actions'
import type { TestAccountOption } from '@/lib/test-impersonation/test-impersonation-service'
import { Button } from '@/components/ui/button'

const organizationTypeLabels = {
  CLIENT: 'Opdrachtgever',
  PROVIDER: 'Dienstverlener',
  BOTH: 'Opdrachtgever en dienstverlener',
  PLATFORM_OPERATOR: 'Platformorganisatie',
} as const

const roleLabels = {
  OWNER: 'Eigenaar',
  ADMIN: 'Beheerder',
  MEMBER: 'Medewerker',
} as const

export function TestAccountSwitcher({
  accounts,
  unavailableReason,
}: {
  accounts: TestAccountOption[] | null
  unavailableReason: string | null
}) {
  const [query, setQuery] = useState('')
  const [targetUserId, setTargetUserId] = useState('')
  const filteredAccounts = useMemo(() => {
    if (!accounts) return []
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return accounts
    return accounts.filter((account) =>
      [
        account.displayName,
        account.email,
        account.organizationName,
        account.organizationType
          ? organizationTypeLabels[account.organizationType]
          : 'Platformaccount',
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery)),
    )
  }, [accounts, query])
  const selectedAccount = accounts?.find((account) => account.id === targetUserId)

  return (
    <section className="mt-4 border-t border-border pt-4" aria-labelledby="test-account-switcher-heading">
      <h2
        id="test-account-switcher-heading"
        className="text-xs font-semibold uppercase tracking-wide text-text-secondary"
      >
        Testhulpmiddelen
      </h2>
      <p className="mt-1 text-sm font-semibold text-brand-dark">Testen als</p>
      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
        Alleen voor lokale acceptatietests. Uw beheeraccount blijft de actor in de audit.
      </p>

      {unavailableReason ? (
        <p className="mt-3 rounded-control border border-border bg-background p-3 text-xs text-text-secondary">
          {unavailableReason}
        </p>
      ) : accounts?.length === 0 ? (
        <p className="mt-3 rounded-control bg-background p-3 text-xs text-text-secondary">
          Er zijn geen actieve testaccounts beschikbaar.
        </p>
      ) : (
        <form
          action={startTestImpersonationAction}
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            if (!selectedAccount) {
              event.preventDefault()
              return
            }
            const confirmed = window.confirm(
              `U gaat WorkMatchr bekijken als ${selectedAccount.displayName} (${selectedAccount.email}). Alle handelingen worden uitgevoerd met de rechten van dit account en de wisseling wordt als testhandeling gelogd. Wilt u doorgaan?`,
            )
            if (!confirmed) event.preventDefault()
          }}
        >
          {accounts && accounts.length > 10 ? (
            <div>
              <label htmlFor="test-account-search" className="text-xs font-semibold text-brand-dark">
                Zoek testaccount
              </label>
              <input
                id="test-account-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="mt-1 min-h-10 w-full rounded-control border border-border bg-surface px-3 text-sm"
                placeholder="Naam, e-mail of organisatie"
              />
            </div>
          ) : null}
          <div>
            <label htmlFor="test-account" className="text-xs font-semibold text-brand-dark">
              Account
            </label>
            <select
              id="test-account"
              name="targetUserId"
              required
              value={targetUserId}
              onChange={(event) => setTargetUserId(event.target.value)}
              className="mt-1 min-h-10 w-full rounded-control border border-border bg-surface px-2 text-xs"
            >
              <option value="">Kies een testaccount</option>
              {filteredAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName} — {account.organizationName ?? 'Platformaccount'} —{' '}
                  {account.organizationRole
                    ? roleLabels[account.organizationRole]
                    : account.platformRole === 'ADMIN'
                      ? 'Platformbeheerder'
                      : 'Platformgebruiker'}{' '}
                  — Actief
                </option>
              ))}
            </select>
          </div>
          {selectedAccount && (
            <p className="rounded-control bg-background p-3 text-xs leading-relaxed text-text-secondary">
              {selectedAccount.email}
              <br />
              {selectedAccount.organizationType
                ? organizationTypeLabels[selectedAccount.organizationType]
                : 'Platformaccount'}{' '}
              · Actief
            </p>
          )}
          <Button type="submit" variant="outline" className="w-full px-3" disabled={!selectedAccount}>
            Bekijken als dit account
          </Button>
        </form>
      )}
    </section>
  )
}
